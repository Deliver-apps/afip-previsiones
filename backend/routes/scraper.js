const express = require("express");
const puppeteer = require("puppeteer");
const { individualScraper } = require("../helpers/individualScraper");
const { putSheetData } = require("../helpers/sheets");
const logger = require("../config/logger");
const { addJobToQueue, updateJob, getJobById } = require("../helpers/cache");

const router = express.Router();

const individualScraperWithTimeout = async (campos, timeout = 400_000) => {
  return Promise.race([
    individualScraper(campos),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Timeout: la solicitud no se completó en el tiempo permitido",
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
  const helper = [];
  const responseFailed = [];
  try {
    const jobId = addJobToQueue();
    res.status(200).send({
      success: true,
      jobId,
      usersLength: data.length,
    });
    for (const campos of data) {
      try {
        const result = await individualScraperWithTimeout(campos);

        if (result.error) {
          logger.verbose("RESULT ERROR");
          logger.verbose(result.error);
          throw new Error(result.error);
        }
        helper.push(result);
      } catch (error) {
        logger.verbose(error.message);
        responseFailed.push({ ...campos, link: error.link ?? error.message });
        if (responseFailed.length > 55) {
          throw new Error(
            "Fallaron muchas solicitudes, se cancela la generación",
          );
        }
      }
    }
    await putSheetData(helper, responseFailed);
    updateJob(jobId, "finished");
    return;
  } catch (error) {
    console.error(error);
    logger.error(error.message);
    res.status(500).json({ success: false, error: error.message });
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
    await newPage.click("#F1\\:btnIngresar");

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
