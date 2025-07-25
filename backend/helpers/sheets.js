const { google } = require("googleapis");
const fs = require("fs");
const config = require("../config/config");
const logger = require("../config/logger");

const moneyFormat = (num) => {
  let netoString = num.toFixed(2);

  // Replace the dot with a comma for the decimal separator
  netoString = netoString.replace(".", ",");

  // Add periods as thousand separators
  return `$ ${netoString.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const stringToNumber = (str) => {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
};

const calculateResult = (campos) => {
  const ventasIVA =
    stringToNumber(campos.ventas.operaciones.debito) -
    stringToNumber(campos.ventas.notasDeCredito.debito) + 
    campos.ventas.iva ?? 0;

  const comprasIVA =
    stringToNumber(campos.compras.operaciones.debito) -
    stringToNumber(campos.compras.notasDeCredito.debito);

  const result = ventasIVA - comprasIVA;

  const estado = result < 0 ? "A Favor" : "A Pagar";

  return { result, estado };
};

const formatMoneyFields = (campos) => {
  console.log(JSON.stringify(campos, null, 2));
  return {
    ventasNeto: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
      stringToNumber(campos.ventas.notasDeCredito.neto) +
      campos.ventas.venta,
    ),
    ventasIVA: moneyFormat(
      stringToNumber(campos.ventas.operaciones.debito) -
      stringToNumber(campos.ventas.notasDeCredito.debito) +
      campos.ventas.iva,
    ),
    ventasNoGeneranCredito: moneyFormat(
      stringToNumber(campos.ventas.notasDeCredito.noGeneranCredito) -
      stringToNumber(campos.ventas.notasDeCredito.exento)
    ),
    ventasTotal: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
      stringToNumber(campos.ventas.notasDeCredito.neto) +
      stringToNumber(campos.ventas.operaciones.debito) -
      stringToNumber(campos.ventas.notasDeCredito.debito) +
      campos.ventas.ventaAndIva,
    ),
    comprasNeto: moneyFormat(
      stringToNumber(campos.compras.operaciones.neto) -
      stringToNumber(campos.compras.notasDeCredito.neto),
    ),
    comprasIVA: moneyFormat(
      stringToNumber(campos.compras.operaciones.debito) -
      stringToNumber(campos.compras.notasDeCredito.debito),
    ),
    comprasTotal: moneyFormat(
      stringToNumber(campos.compras.operaciones.neto) -
      stringToNumber(campos.compras.notasDeCredito.neto) +
      stringToNumber(campos.compras.operaciones.debito) -
      stringToNumber(campos.compras.notasDeCredito.debito)
    ),
    comprasNoGeneranCredito: moneyFormat(
      stringToNumber(campos.compras.operaciones.exento) +
      stringToNumber(campos.compras.notasDeCredito.noGeneranCredito),
    ),
  };
};

const putSheetData = async (data, errors = []) => {
  logger.debug("Putting data into Google Sheets");
  logger.debug(data);
  if (!data || data.length === 0) {
    return;
  }
  let credentials;
  try {
    if (!config.secretClient) {
      throw new Error('SECRET_CLIENT no está definido en las variables de entorno');
    }
    credentials = JSON.parse(config.secretClient);
  } catch (err) {
    logger.error('Error parseando config.secretClient:', err.message);
    logger.error('Valor de SECRET_CLIENT:', config.secretClient ? config.secretClient.substring(0, 100) + '...' : 'undefined');
    throw new Error(`Error parseando SECRET_CLIENT: ${err.message}`);
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const spreadsheetId = config.sheetWebId;

  const currentTime = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
  );

  const day = currentTime.getDate().toString().padStart(2, "0");
  const month = (currentTime.getMonth() + 1).toString().padStart(2, "0"); // getMonth() returns 0-based month
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const formattedDate = `${day}/${month}`;

  const formattedTime = `previsiones->${formattedDate}->${currentTime.getHours()}:${minutes}hs`;

  // Create new sheet at the first position (index 0)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: {
              title: formattedTime,
              index: 0, // This ensures the sheet is created at the first position
            },
          },
        },
      ],
    },
  });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheet = response.data.sheets[0];
  const sheetId = sheet.properties.sheetId;

  // Define the vertical table data with some blank rows for spacing
  const allVerticalValues = data.map((campos) => {
    const { result, estado } = calculateResult(campos);
    const formattedMoneyFields = formatMoneyFields(campos);

    return [
      ["Razón Social", campos.nameToShow],
      ["CUIT", campos.cuit],
      ["Ventas Neto", formattedMoneyFields.ventasNeto],
      ["Ventas IVA", formattedMoneyFields.ventasIVA],
      ["Ventas Que No Generan Credito fiscal", formattedMoneyFields.ventasNoGeneranCredito],
      ["Ventas Total", formattedMoneyFields.ventasTotal],
      ["Compras Neto", formattedMoneyFields.comprasNeto],
      ["Compras IVA", formattedMoneyFields.comprasIVA],
      ["Compras Total", formattedMoneyFields.comprasTotal],
      ["Compras Que No Generan Credito fiscal", formattedMoneyFields.comprasNoGeneranCredito],
      [estado, moneyFormat(result)],
    ];
  });

  const errorVerticalValues = errors.map((error) => {
    const { username, real_name, is_company, company_name, link } = error;
    const nameToShow = is_company ? company_name : real_name;
    return [
      ["Razón Social", nameToShow],
      ["CUIT", username],
      ["Error", "Error Prevision"],
      ["Link", link],
    ];
  });

  const flatenErrorVerticalValues = errorVerticalValues.flat();
  // Write the vertical table to Google Sheets starting after a few rows down (e.g., B10)
  // Transpose the values to place them horizontally
  const transposedValues = allVerticalValues[0].map((_, colIndex) =>
    allVerticalValues.map((row) => row[colIndex]),
  );

  // Flatten each cell to ensure it's a simple string or number
  const flattenedTransposedValues = transposedValues.map((row) =>
    row.map((cell) => (Array.isArray(cell) ? cell.join(" ") : cell)),
  );

  const horizontalValues = [
    "Razón Social",
    "CUIT",
    "Ventas Neto",
    "Ventas IVA",
    "Ventas Que No Generan Credito fiscal",
    "Ventas Total",
    "Compras Neto",
    "Compras IVA",
    "Compras Total",
    "Compras Que No Generan Credito fiscal",
    "Estado", // Column name
    "Monto",
  ];

  // Transpose the data to get the horizontal rows
  const transposedData = allVerticalValues.map((row) => {
    const rowData = row.map((col) => col[1]); // Extract the values
    rowData.splice(10, 0, row[10][0]); // Insert "A Pagar" or "A Favor" as the value for "Estado"
    return rowData;
  });
  // Combine the header and the transposed data
  const finalHorizontalValues = [horizontalValues, ...transposedData];

  sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId,
    range: `${formattedTime}!A1`, // Start writing the horizontal table at A1
    valueInputOption: "USER_ENTERED",
    resource: {
      values: finalHorizontalValues,
    },
  });
  sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId,
    range: `${formattedTime}!A${data.length + 5}`, // Adjust the starting position as needed
    valueInputOption: "USER_ENTERED",
    resource: {
      values: flattenedTransposedValues,
    },
  });

  const startRow = data.length + 18;
  const endRow = startRow + flatenErrorVerticalValues.length * 2;

  sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId,
    range: `${formattedTime}!A${startRow}`, // Adjust range to where the data should be inserted
    valueInputOption: "USER_ENTERED",
    resource: {
      values: flatenErrorVerticalValues,
    },
  });

  await sheets.spreadsheets.batchUpdate({
    auth: client,
    spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetId, // Ensure this is the correct sheetId
              startRowIndex: startRow - 1, // The row where errors start
              endRowIndex: endRow, // End row (exclusive)
              startColumnIndex: 0, // Starting column (0 = column A)
              endColumnIndex: 2, // Adjust for the number of columns you're writing data into
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  foregroundColor: {
                    red: 1,
                    green: 0,
                    blue: 0,
                  },
                },
              },
            },
            fields: "userEnteredFormat.textFormat.foregroundColor",
          },
        },
      ],
    },
  });
};

module.exports = { putSheetData };
