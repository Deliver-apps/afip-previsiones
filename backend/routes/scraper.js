const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const { individualScraper } = require("../helpers/individualScraper");
const { putSheetData } = require("../helpers/sheets");
const logger = require("../config/logger");
const { addJobToQueue, updateJob, getJobById } = require("../helpers/cache");

const router = express.Router();

const { validateScraperInput, validateExtractedData, formatDataForLogging } = require("../helpers/validation");
const config = require("../config/config");

const individualScraperWithTimeout = async (campos, timeout = config.scraper.timeout) => {
  // Validar datos de entrada
  const validation = validateScraperInput(campos);
  if (!validation.isValid) {
    throw new Error(`Invalid input data: ${validation.errors.join(", ")}`);
  }

  if (validation.warnings.length > 0) {
    logger.warn(`Warnings for ${campos.username || campos.cuit_company}: ${validation.warnings.join(", ")}`);
  }

  console.table(formatDataForLogging(campos));

  return Promise.race([
    individualScraper(campos),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Timeout: la solicitud no se completó en ${timeout / 1000} segundos`,
            ),
          ),
        timeout,
      ),
    ),
  ]);
};

router.post("/previsiones", async (req, res) => {
  console.log("Starting scraping...");
  const { data } = req.body;
  const { whatsapp } = req.query;

  // Validar que data sea un array
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Data must be a non-empty array"
    });
  }

  const helper = [];
  const responseFailed = [];
  let jobId;

  try {
    jobId = addJobToQueue();
    res.status(200).send({
      success: true,
      jobId,
      usersLength: data.length,
    });

    logger.info(`Starting batch processing for ${data.length} users`);

    for (let i = 0; i < data.length; i++) {
      const campos = data[i];
      const userIdentifier = campos.cuit_company || campos.username;

      logger.info(`Processing user ${i + 1}/${data.length}: ${userIdentifier}`);

      try {
        const result = await individualScraperWithTimeout(campos);

        if (result.error) {
          logger.error(`Error for ${userIdentifier}: ${result.error}`);
          throw new Error(result.error);
        }

        // Validar datos extraídos
        const dataValidation = validateExtractedData(result);
        if (!dataValidation.isValid) {
          logger.warn(`Data validation failed for ${userIdentifier}: ${dataValidation.errors.join(", ")}`);
        }

        helper.push(result);
        logger.info(`Successfully processed ${userIdentifier}`);

      } catch (error) {
        logger.error(`Failed to process ${userIdentifier}: ${error.message}`);
        responseFailed.push({
          ...campos,
          link: error.link ?? error.message,
          error: error.message,
          userIdentifier
        });

        // Limitar el número de fallos antes de cancelar
        if (responseFailed.length > 55) {
          throw new Error(
            `Too many failures (${responseFailed.length}), cancelling generation`,
          );
        }
      }
    }

    logger.info(`Batch processing completed. Success: ${helper.length}, Failed: ${responseFailed.length}`);

    // Send WhatsApp message if requested
    if (whatsapp && whatsapp === 'true') {
      const formatCurrency = (amount) => {
        if (!amount || amount === null || amount === '') return '$0,00';

        let num;
        if (typeof amount === 'string') {
          // Remover símbolo $ si existe y espacios
          let cleanAmount = amount.replace(/\$/g, '').trim();

          // Formato argentino típico: "10.936.639,80"
          // Los puntos son separadores de miles, la coma es decimal
          if (cleanAmount.includes('.') && cleanAmount.includes(',')) {
            // Reemplazar todos los puntos (miles) y cambiar coma por punto (decimal)
            cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
          }
          // Solo tiene coma (decimal): "123,45"
          else if (cleanAmount.includes(',') && !cleanAmount.includes('.')) {
            cleanAmount = cleanAmount.replace(',', '.');
          }
          // Solo puntos - determinar contexto
          else if (cleanAmount.includes('.')) {
            const parts = cleanAmount.split('.');
            // Si tiene múltiples puntos o el último segmento tiene más de 2 dígitos = miles
            if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
              cleanAmount = cleanAmount.replace(/\./g, '');
            }
            // Si solo un punto y últimos 1-2 dígitos = decimal, mantener
          }

          num = parseFloat(cleanAmount);
        } else {
          num = amount;
        }

        if (isNaN(num)) return '$0,00';

        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
      };
      const formatedData = [];

      const formatUserData = (user) => {
        const ventas = user.ventas || {};
        const compras = user.compras || {};
        
        // Funciones exactas de sheets.js
        const stringToNumber = (str) => {
          if (!str || str === null || str === '') return 0;
          return parseFloat(str.toString().replace(/\./g, "").replace(",", "."));
        };
        
        // Calcular exactamente como formatMoneyFields en sheets.js
        const ventasNeto = stringToNumber(ventas.operaciones?.neto || 0) -
                          stringToNumber(ventas.notasDeCredito?.neto || 0) +
                          (ventas.venta || 0);
        
        const ventasIVA = stringToNumber(ventas.operaciones?.debito || 0) -
                         stringToNumber(ventas.notasDeCredito?.debito || 0) +
                         (ventas.iva || 0);
        
        const ventasQueNoGeneranDebito = stringToNumber(ventas.notasDeCredito?.noGeneranCredito || 0) -
                                        stringToNumber(ventas.notasDeCredito?.exento || 0) +
                                        stringToNumber(ventas.operaciones?.exento || 0);
        
        const ventasTotal = stringToNumber(ventas.operaciones?.neto || 0) -
                           stringToNumber(ventas.notasDeCredito?.neto || 0) +
                           stringToNumber(ventas.operaciones?.debito || 0) -
                           stringToNumber(ventas.notasDeCredito?.debito || 0) +
                           stringToNumber(ventas.operaciones?.exento || 0) +
                           (ventas.ventaAndIva || 0);
        
        const comprasNeto = stringToNumber(compras.operaciones?.neto || 0) -
                           stringToNumber(compras.notasDeCredito?.neto || 0);
        
        const comprasIVA = stringToNumber(compras.operaciones?.debito || 0) -
                          stringToNumber(compras.notasDeCredito?.debito || 0);
        
        const comprasTotal = stringToNumber(compras.operaciones?.neto || 0) -
                            stringToNumber(compras.notasDeCredito?.neto || 0) +
                            stringToNumber(compras.operaciones?.debito || 0) -
                            stringToNumber(compras.notasDeCredito?.debito || 0);
        
        const comprasQueNoGeneranCredito = stringToNumber(compras.operaciones?.exento || 0) +
                                          stringToNumber(compras.notasDeCredito?.noGeneranCredito || 0);
        
        // Calcular resultado final exacto como calculateResult en sheets.js
        const ventasIVAForCalc = stringToNumber(ventas.operaciones?.debito || 0) -
                                stringToNumber(ventas.notasDeCredito?.debito || 0) +
                                (ventas.iva || 0);
        
        const comprasIVAForCalc = stringToNumber(compras.operaciones?.debito || 0) -
                                 stringToNumber(compras.notasDeCredito?.debito || 0);
        
        const result = ventasIVAForCalc - comprasIVAForCalc;
        const estado = result < 0 ? "A Favor" : "A Pagar";

        formatedData.push({
          nameToShow: user.nameToShow || 'Sin nombre',
          cuit: user.cuit || 'N/A',
          ventasNeto: formatCurrency(ventasNeto),
          ventasIVA: formatCurrency(ventasIVA),
          ventasQueNoGeneranDebito: formatCurrency(ventasQueNoGeneranDebito),
          ventasTotal: formatCurrency(ventasTotal),
          comprasNeto: formatCurrency(comprasNeto),
          comprasIVA: formatCurrency(comprasIVA),
          comprasTotal: formatCurrency(comprasTotal),
          comprasQueNoGeneranCredito: formatCurrency(comprasQueNoGeneranCredito),
          estado: estado,
          result: formatCurrency(result)
        });
      };

      try {
        helper.map(formatUserData);
        for (const data of formatedData) {
          const formattedMessage = `📊 *${data.nameToShow}*
            CUIT: ${data.cuit}
            Ventas Neto ${data.ventasNeto}
            Ventas IVA ${data.ventasIVA}
            Ventas Que No Generan Débito fiscal ${data.ventasQueNoGeneranDebito}
            Ventas Total ${data.ventasTotal}
            Compras Neto ${data.comprasNeto}
            Compras IVA ${data.comprasIVA}
            Compras Total ${data.comprasTotal}
            Compras Que No Generan Credito fiscal ${data.comprasQueNoGeneranCredito}
            ${data.estado} ${data.result}`;

          // await axios.post(`${config.whatsappApiUrl}test-message`, {
          //   "phone": "5491136585581",
          //   "message": formattedMessage,
          //   "isGroup": false
          // });

           await axios.post(`${config.whatsappApiUrl}test-message`, {
            "phone": "120363401945950239",
            "message": formattedMessage,
            "isGroup": true
           });
        }
        //  await axios.post(`${config.whatsappApiUrl}test-message`, {
        //   "phone": "120363401945950239",
        //   "message": formattedMessage,
        //   "isGroup": true
        // });
        // await axios.post(`${config.whatsappApiUrl}test-message`, {
        //   "phone": "5491136585581",
        //   "message": formattedMessage,
        //   "isGroup": false
        // });
        logger.info('WhatsApp message sent successfully');
      } catch (whatsappError) {
        logger.error(`Failed to send WhatsApp message: ${whatsappError.message}`);
      }
    }

    await putSheetData(helper, responseFailed);
    updateJob(jobId, "finished");

  } catch (error) {
    console.error(error);
    logger.error(`Batch processing failed: ${error.message}`);

    if (jobId) {
      updateJob(jobId, "failed");
    }

    res.status(500).json({
      success: false,
      error: error.message,
      processed: helper.length,
      failed: responseFailed.length
    });
  }
});

router.get("/previsiones/job/:id", async (req, res) => {
  const { id } = req.params;

  const response = await getJobById(id);

  if (!response) {
    return res.status(401).send({
      message: "Error Detectando El job de previsiones",
    });
  }

  res.status(200).send(response);
});

router.post("/comprobantes", async (req, res) => {
  const { url, username, password, range, type } = req.body;

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navegar a la URL del formulario
    await page.goto(url);
    await page.waitForSelector("a.btn.btn-sm.btn-info.btn-block.uppercase");
    await page.click("a.btn.btn-sm.btn-info.btn-block.uppercase");

    const newPagePromise = new Promise((x) =>
      browser.once("targetcreated", (target) => x(target.page())),
    );
    const newPage = await newPagePromise;
    const timestamp = new Date().getUTCMilliseconds();

    await newPage.waitForSelector("#F1\\:username");
    await newPage.type("#F1\\:username", username); // Cambia '#username' por el selector correcto
    await newPage.click("#F1\\:btnSiguiente");

    await newPage.waitForSelector("#F1\\:password");
    await newPage.type("#F1\\:password", password); // Cambia '#password' por el selector correcto
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await newPage.click('[id="F1:btnIngresar"]');

    await newPage.waitForSelector("#buscadorInput");
    await newPage.type("#buscadorInput", "mis comprobantes");
    await newPage.click("#rbt-menu-item-0");
    const newPagePromise2 = new Promise((x) =>
      browser.once("targetcreated", (target) => x(target.page())),
    );
    const newPage2 = await newPagePromise2;
    await newPage2.waitForSelector(
      "div.col-xs-12.col-sm-12 a.panel.panel-default.hoverazul",
    );
    if (type === "Monotributista") {
      await newPage2.evaluate((username) => {
        const elements = Array.from(document.querySelectorAll("p.text-muted"));
        const formatCUIT = (cuit) => {
          if (cuit.length !== 11) {
            throw new Error("CUIT must be 11 digits long");
          }
          return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
        };
        const targetElement = elements.find((el) =>
          el.textContent.includes(formatCUIT(username)),
        );

        if (targetElement) {
          targetElement.click();
        } else {
          console.error("Element not found");
        }
      }, username);
    }

    await newPage2.screenshot({ path: `photo-${timestamp}.png` });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await newPage2.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await newPage2.waitForSelector("#btnEmitidos");
    await newPage2.click("#btnEmitidos");
    await newPage2.screenshot({ path: `photo-${timestamp}.png` });
    await newPage2.waitForSelector("#buscarComprobantes");
    await newPage2.waitForSelector("#fechaEmision");
    await newPage2.evaluate(() => {
      const inputElement = document.querySelector("#fechaEmision");
      if (inputElement) {
        inputElement.value = ""; // Limpia el campo de entrada
      }
    });
    await newPage2.type(
      "#fechaEmision",
      new Date(range[0]).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " - " +
      new Date(range[1]).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await newPage2.click("#buscarComprobantes");

    await newPage2.waitForSelector("button.buttons-excel", { visible: true });
    await newPage2.click("button.buttons-excel");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await newPage2.goBack({ waitUntil: "networkidle0" });
    await newPage2.waitForSelector("#btnRecibidos");
    await newPage2.click("#btnRecibidos");
    await newPage2.waitForSelector("#buscarComprobantes");

    await newPage2.waitForSelector("#fechaEmision");
    await newPage2.evaluate(() => {
      const inputElement = document.querySelector("#fechaEmision");
      if (inputElement) {
        inputElement.value = ""; // Limpia el campo de entrada
      }
    });
    await newPage2.type(
      "#fechaEmision",
      new Date(range[0]).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " - " +
      new Date(range[1]).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await newPage2.click("#buscarComprobantes");

    await newPage2.waitForSelector("button.buttons-excel", { visible: true });
    await newPage2.click("button.buttons-excel");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // await browser.close();

    res.json({ success: true, data: 1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/test", (req, res) => {
  return res.json({
    ok: "todo ok",
  });
});

router.post("/reset", async (req, res) => {
  try {
    process.exit(0);
  } catch (error) {
    console.error("Error reseting server:", error);
  }
});

module.exports = {
  router,
  individualScraperWithTimeout,
};
