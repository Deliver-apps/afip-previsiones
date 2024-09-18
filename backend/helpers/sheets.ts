// putSheetData.ts

import { google } from "googleapis";
import * as fs from "fs";
import { config } from "../config/config";
import { logger } from "../config/logger";

interface Operaciones {
  debito: string;
  neto: string;
}

interface NotasDeCredito {
  debito: string;
  neto: string;
}

interface VentasOrCompras {
  operaciones: Operaciones;
  notasDeCredito: NotasDeCredito;
}

interface Campos {
  ventas: VentasOrCompras;
  compras: VentasOrCompras;
  nameToShow: string;
  cuit: string;
}

interface FormattedMoneyFields {
  ventasNeto: string;
  ventasIVA: string;
  ventasTotal: string;
  comprasNeto: string;
  comprasIVA: string;
  comprasTotal: string;
}

const moneyFormat = (num: number): string => {
  let netoString = num.toFixed(2);

  // Replace the dot with a comma for the decimal separator
  netoString = netoString.replace(".", ",");

  // Add periods as thousand separators
  return `$ ${netoString.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const stringToNumber = (str: string): number => {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
};

const calculateResult = (
  campos: Campos,
): { result: number; estado: string } => {
  const ventasIVA =
    stringToNumber(campos.ventas.operaciones.debito) -
    stringToNumber(campos.ventas.notasDeCredito.debito);

  const comprasIVA =
    stringToNumber(campos.compras.operaciones.debito) -
    stringToNumber(campos.compras.notasDeCredito.debito);

  const result = ventasIVA - comprasIVA;

  const estado = result < 0 ? "A Favor" : "A Pagar";

  return { result, estado };
};

const formatMoneyFields = (campos: Campos): FormattedMoneyFields => {
  return {
    ventasNeto: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
        stringToNumber(campos.ventas.notasDeCredito.neto),
    ),
    ventasIVA: moneyFormat(
      stringToNumber(campos.ventas.operaciones.debito) -
        stringToNumber(campos.ventas.notasDeCredito.debito),
    ),
    ventasTotal: moneyFormat(
      stringToNumber(campos.ventas.operaciones.neto) -
        stringToNumber(campos.ventas.notasDeCredito.neto) +
        stringToNumber(campos.ventas.operaciones.debito) -
        stringToNumber(campos.ventas.notasDeCredito.debito),
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
        stringToNumber(campos.compras.notasDeCredito.debito),
    ),
  };
};

const putSheetData = async (data: Campos[]): Promise<void> => {
  logger.debug("Putting data into Google Sheets");
  logger.debug(data);
  if (!data || data.length === 0) {
    return;
  }

  const credentials = JSON.parse(config.secretClient ?? "");
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = config.sheetWebId;

  const currentTime = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
  );

  const day = currentTime.getDate().toString().padStart(2, "0");
  const month = (currentTime.getMonth() + 1).toString().padStart(2, "0"); // getMonth() returns 0-based month
  const hours = currentTime.getHours().toString().padStart(2, "0");
  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
  const formattedDate = `${day}/${month}`;

  const formattedTime = `previsiones->${formattedDate}->${hours}:${minutes}hs`;

  // Create new sheet at the first position (index 0)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
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

  // Define the vertical table data
  const allVerticalValues = data.map((campos) => {
    const { result, estado } = calculateResult(campos);
    const formattedMoneyFields = formatMoneyFields(campos);

    return [
      ["Razón Social", campos.nameToShow],
      ["CUIT", campos.cuit],
      ["Ventas Neto", formattedMoneyFields.ventasNeto],
      ["Ventas IVA", formattedMoneyFields.ventasIVA],
      ["Ventas Total", formattedMoneyFields.ventasTotal],
      ["Compras Neto", formattedMoneyFields.comprasNeto],
      ["Compras IVA", formattedMoneyFields.comprasIVA],
      ["Compras Total", formattedMoneyFields.comprasTotal],
      [estado, moneyFormat(result)],
    ];
  });

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

  // Update the sheet with horizontal data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${formattedTime}!A1`, // Start writing the horizontal table at A1
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: finalHorizontalValues,
    },
  });

  // Update the sheet with vertical data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${formattedTime}!A${data.length + 10}`, // Adjust the starting position as needed
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: flattenedTransposedValues,
    },
  });
};

export { putSheetData };
