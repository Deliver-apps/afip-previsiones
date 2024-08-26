const { google } = require("googleapis");
const fs = require("fs");
const config = require("../config/config");

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
  const ventasDebito = stringToNumber(campos.ventas.operaciones.debito);
  const ventasCreditoDebito = stringToNumber(
    campos.ventas.notasDeCredito.debito
  );
  const comprasDebito = stringToNumber(campos.compras.operaciones.debito);
  const comprasCreditoDebito = stringToNumber(
    campos.compras.notasDeCredito.debito
  );

  const result =
    ventasDebito - ventasCreditoDebito - comprasDebito - comprasCreditoDebito;
  const estado = result < 0 ? "A Favor" : "A Pagar";

  return { result, estado };
};

const formatMoneyFields = (campos) => {
  return {
    ventasNeto: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
        stringToNumber(campos.ventas.notasDeCredito.neto)
    ),
    ventasIVA: moneyFormat(
      stringToNumber(campos.ventas.operaciones.debito) -
        stringToNumber(campos.ventas.notasDeCredito.debito)
    ),
    ventasTotal: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
        stringToNumber(campos.ventas.notasDeCredito.neto) +
        stringToNumber(campos.ventas.operaciones.debito) -
        stringToNumber(campos.ventas.notasDeCredito.debito)
    ),
    comprasNeto: moneyFormat(
      stringToNumber(campos.compras.operaciones.neto) -
        stringToNumber(campos.compras.notasDeCredito.neto)
    ),
    comprasIVA: moneyFormat(
      stringToNumber(campos.compras.operaciones.debito) -
        stringToNumber(campos.compras.notasDeCredito.debito)
    ),
    comprasTotal: moneyFormat(
      stringToNumber(campos.compras.operaciones.neto) -
        stringToNumber(campos.compras.notasDeCredito.neto) +
        stringToNumber(campos.compras.operaciones.debito) -
        stringToNumber(campos.compras.notasDeCredito.debito)
    ),
  };
};

const transposeData = (data) => {
  return data[0].map(
    (_, colIndex) => data.map((row) => row[colIndex][1]) // Extract only the values, ignoring the keys
  );
};

const putSheetData = async (data) => {
  const credentials = JSON.parse(config.secretClient);
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
    })
  );

  const formattedTime = `previsiones->${currentTime.getDay()}/${currentTime.getMonth()}->${currentTime.getHours()}:${currentTime.getMinutes()}hs`;

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

  // Assuming camposArray is an array of campos JSON objects
  // const horizontalValues = [
  //   [
  //     "Representado",
  //     "CUIT",
  //     "Ventas Neto",
  //     "Ventas IVA",
  //     "Ventas Total",
  //     "Compras Neto",
  //     "Compras IVA",
  //     "Compras Total",
  //     "A Pagar / A Favor",
  //     "Monto",
  //   ],
  //   ...data.map((campos) => {
  //     const ventasDebito = stringToNumber(campos.ventas.operaciones.debito);
  //     const ventasCreditoDebito = stringToNumber(
  //       campos.ventas.notasDeCredito.debito
  //     );
  //     const comprasDebito = stringToNumber(campos.compras.operaciones.debito);
  //     const comprasCreditoDebito = stringToNumber(
  //       campos.compras.notasDeCredito.debito
  //     );

  //     const result =
  //       ventasDebito -
  //       ventasCreditoDebito -
  //       comprasDebito -
  //       comprasCreditoDebito;

  //     return [
  //       campos.nameToShow,
  //       campos.cuit,
  //       moneyFormat(
  //         stringToNumber(campos.ventas.operaciones.neto) -
  //           stringToNumber(campos.ventas.notasDeCredito.neto)
  //       ),
  //       moneyFormat(ventasDebito - ventasCreditoDebito),
  //       moneyFormat(
  //         stringToNumber(campos.ventas.operaciones.neto) -
  //           stringToNumber(campos.ventas.notasDeCredito.neto) +
  //           ventasDebito -
  //           ventasCreditoDebito
  //       ),
  //       moneyFormat(
  //         stringToNumber(campos.compras.operaciones.neto) -
  //           stringToNumber(campos.compras.notasDeCredito.neto)
  //       ),
  //       moneyFormat(comprasDebito - comprasCreditoDebito),
  //       moneyFormat(
  //         stringToNumber(campos.compras.operaciones.neto) -
  //           stringToNumber(campos.compras.notasDeCredito.neto) +
  //           comprasDebito -
  //           comprasCreditoDebito
  //       ),
  //       result < 0 ? "A Favor" : "A Pagar",
  //       moneyFormat(result),
  //     ];
  //   }),
  // ];

  // Define the vertical table data with some blank rows for spacing
  const allVerticalValues = data.map((campos) => {
    const { result } = calculateResult(campos);
    const formattedMoneyFields = formatMoneyFields(campos);

    const columnHeader = result > 0 ? "A Pagar" : "A Favor";

    return [
      ["Representado", campos.nameToShow],
      ["CUIT", campos.cuit],
      ["Ventas Neto", formattedMoneyFields.ventasNeto],
      ["Ventas IVA", formattedMoneyFields.ventasIVA],
      ["Ventas Total", formattedMoneyFields.ventasTotal],
      ["Compras Neto", formattedMoneyFields.comprasNeto],
      ["Compras IVA", formattedMoneyFields.comprasIVA],
      ["Compras Total", formattedMoneyFields.comprasTotal],
      [columnHeader, moneyFormat(result)],
    ];
  });

  // Write the vertical table to Google Sheets starting after a few rows down (e.g., B10)
  // Transpose the values to place them horizontally
  const transposedValues = allVerticalValues[0].map((_, colIndex) =>
    allVerticalValues.map((row) => row[colIndex])
  );

  // Flatten each cell to ensure it's a simple string or number
  const flattenedTransposedValues = transposedValues.map((row) =>
    row.map((cell) => (Array.isArray(cell) ? cell.join(" ") : cell))
  );

  const horizontalValues = [
    "Representado",
    "CUIT",
    "Ventas Neto",
    "Ventas IVA",
    "Ventas Total",
    "Compras Neto",
    "Compras IVA",
    "Compras Total",
    "Estado", // Column name
    "Monto",
  ];

  // Transpose the data to get the horizontal rows
  const transposedData = allVerticalValues.map((row) => {
    const rowData = row.map((col) => col[1]); // Extract the values
    rowData.splice(8, 0, row[8][0]); // Insert "A Pagar" or "A Favor" as the value for "Estado"
    return rowData;
  });
  // Combine the header and the transposed data
  const finalHorizontalValues = [horizontalValues, ...transposedData];

  await sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId,
    range: `${formattedTime}!A1`, // Start writing the horizontal table at A1
    valueInputOption: "USER_ENTERED",
    resource: {
      values: finalHorizontalValues,
    },
  });

  await sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId,
    range: `${formattedTime}!A${data.length + 10}`, // Adjust the starting position as needed
    valueInputOption: "USER_ENTERED",
    resource: {
      values: flattenedTransposedValues,
    },
  });
};

module.exports = { putSheetData };
