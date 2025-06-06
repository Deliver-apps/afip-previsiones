const puppeteer = require("puppeteer");
const logger = require("../config/logger");
const config = require("../config/config");
const { s3ClientPrevisiones } = require("../digitalOceanClient");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const formatCUIT = (cuit) => {
  if (cuit.length !== 11) {
    throw new Error("CUIT must be 11 digits long");
  }
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

const uploadToSpaces = async (buffer, fileName) => {
  const params = {
    Bucket: "previsiones-afip",
    Key: fileName,
    Body: buffer,
    ACL: "public-read",
  };

  return await s3ClientPrevisiones.send(new PutObjectCommand(params));
};

const getImageFromFileName = (fileName) => {
  const fileNameSplit = fileName.split("-");
  const date = fileNameSplit[0];
  const time = fileNameSplit[1];
  return `https://previsiones-afip.s3.amazonaws.com/screenshots/${date}-${time}.png`;
};

const individualScraper = async ({
  username,
  password,
  is_company: isCompany,
  company_name: companyName,
  cuit_company: cuitCompany,
  real_name: realName,
  retry,
}) => {
  let browser;
  let page;
  let newPage;
  let newPage2;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath: config.nodeEnv
        ? config.chromeExecutablePath
        : puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote",
      ],
    });
  } catch (error) {
    throw new Error("Failed to launch browser: " + error.message);
  }

  page = await browser.newPage();
  const url = "https://www.afip.gob.ar/landing/default.asp";

  const closeBrowser = async () => {
    if (browser) {
      await browser.close();
    }
  };

  const handleRetry = async (error, paget) => {
    console.error("An error occurred:", error.message);
    if (!retry) {
      await closeBrowser();
      logger.debug("Retrying with fixed data...");
      const fixData = {
        username,
        password,
        is_company: isCompany,
        company_name: companyName,
        cuit_company: cuitCompany,
        real_name: realName,
        retry: true,
      };
      return individualScraper(fixData);
    }
    await paget.waitForFunction(() => document.readyState === "complete");
    const screenshotBuffer = await paget.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    await closeBrowser();
    throw error;
  };

  try {
    // Navigate to the initial URL
    await page.goto(url);
    await page.waitForSelector("a.btn.btn-sm.btn-info.btn-block.uppercase");
    await page.click("a.btn.btn-sm.btn-info.btn-block.uppercase");

    // Handle the new page that opens after clicking
    newPage = await getNewPage(browser);

    await loginToAfip(newPage, username, password);

    // Navigate to the "Portal IVA"
    await navigateToPortalIVA(newPage);

    // Handle the new page that opens after clicking "Portal IVA"
    newPage2 = await getNewPage(browser);

    // Handle company selection if applicable
    if (isCompany) {
      await switchCompanyContext(newPage2, cuitCompany);
    }

    await newDeclaration(newPage2);

    // Validate the IVA declaration period
    await checkAndValidatePeriod(newPage2);

    // Open the books
    await openBooks(newPage2);
    await sellBook(newPage2);
    await buyBook(newPage2);

    // Go to the data page
    await goToData(newPage2);

    // Extract data from the declaration page
    const campos = await extractData(
      newPage2,
      cuitCompany,
      username,
      isCompany,
      companyName,
      realName,
    );

    // Close the browser and return the extracted data
    await closeBrowser();
    return campos;
  } catch (error) {
    logger.error("An error occurred:", error.message);
    const seletedPage = newPage2 || newPage || page;
    const screenshotBuffer = await seletedPage.screenshot({
      encoding: "binary",
    });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);

    await handleRetry(error, newPage2 || newPage || page);

    return {
      error: error.message,
      link: `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`,
    };
  }
};

const goToData = async (page) => {
  logger.info("Going to data...");
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(() => {
    window.scrollTo(0, 2_000);
  });
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  await page.waitForSelector("#btnVistaPrevia");
  await page.click("#btnVistaPrevia");
  await page.waitForSelector("#importeDJV1");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
};

const buyBook = async (page) => {
  logger.info("Opening buy book...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent.includes("Volver al Libro"),
    );
    if (link) {
      link.click();
    } else {
      console.error('Link with text "Volver al Libro" not found.');
    }
  });

  await page.waitForFunction(() => document.readyState === "complete");
};

const sellBook = async (page) => {
  logger.info("Opening sell book...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.evaluate(() => {
    window.scrollTo(0, 1000);
  });
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent.includes("Continuar al Libro Compras"),
    );
    if (link) {
      link.click();
    } else {
      console.error('Link with text "Continuar al Libro Compras" not found.');
    }
  });

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
};

const openBooks = async (page) => {
  logger.info("Opening books...");
  await page.waitForFunction(() => document.readyState === "complete");
  logger.error("Waiting for button...");
  await page.evaluate(async () => {
    const button = document.querySelector(
      'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]',
    );
    if (button) {
      button.click();
    }
  });
  logger.error("Button clicked...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  logger.error("Waiting for body...");
  await page.waitForSelector("body");
  await page.evaluate(() => {
    const button = document.querySelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]',
    );
    if (button) {
      button.click();
    } else {
      console.error("Button not found");
    }
    window.scrollTo(0, 200);
  });
  logger.error("Button clicked...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  logger.error("Waiting for #operacion...");
  const ningunaOperacionExists2 = await page.$("#ningunaOperacion");
  if (ningunaOperacionExists2) {
    await page.click("#ningunaOperacion");
    await page.waitForSelector("#btnGuardar");

    await page.click("#btnGuardar");
  }
  logger.error("Waiting for #btnLibroVentas...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.evaluate(() => {
    const button = document.querySelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]',
    );
    if (button) {
      button.click();
    } else {
      console.error("Button not found");
    }
    window.scrollTo(0, 200);
  });
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await page.waitForSelector("#btnLibroVentas");

  await page.click("#btnLibroVentas");
  logger.error("Waiting for #btnLibroCompras...");
  await new Promise((resolve) => setTimeout(resolve, 8_000));
};

const newDeclaration = async (page) => {
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 6_000));
  try {
    logger.info("Opening new declaration...");
    await page.evaluate(() => {
      const button = document.querySelector(
        'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]',
      );
      if (button) {
        button.click();
      } else {
        console.error("ERROR INGRESAR");
      }
    });
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    console.log(error);
  }
};

const getNewPage = async (browser) => {
  try {
    logger.info("Opening new page...");
    const newPagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout waiting for new page")),
        10_000, // Increased timeout for new page creation
      );

      browser.once("targetcreated", async (target) => {
        clearTimeout(timeout);
        const page = await target.page();
        resolve(page);
      });
    });

    logger.debug("Waiting for new page...");
    const newPageC = await newPagePromise;
    logger.debug("New page created...");

    // if you know the page needs additional time to load fully, use a fixed delay
    await new Promise((resolve) => setTimeout(resolve, 4_000));

    logger.info("New page opened...");

    return newPageC;
  } catch (error) {
    logger.error("Error in getNewPage:", error); // Log the full error details
    throw new Error("Failed to open new page: " + error.message);
  }
};

const loginToAfip = async (page, username, password) => {
  try {
    logger.info(`Logging in to AFIP...${username}`);
    // await page.waitForFunction(() => document.readyState === "complete");
    logger.info("Waiting for username...");
    await page.waitForSelector("#F1\\:username", {
      timeout: 16_000,
    });
    await page.type("#F1\\:username", username);
    await page.click("#F1\\:btnSiguiente");

    await page.waitForSelector("#F1\\:password", {
      timeout: 16_000,
    });
    await page.type("#F1\\:password", password);
    logger.info("Clicking login button...");
    await page.click("#F1\\:btnIngresar");
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    console.error("Login failed, retrying...", error.message);
    await retryWithDelay(page, "#F1\\:password", 6_000);
  }
};

const navigateToPortalIVA = async (page) => {
  try {
    logger.info("Navigating to Portal IVA...");
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await page.waitForSelector("#buscadorInput", {
      timeout: 16_000,
    });
    await page.type("#buscadorInput", "Portal iva");
    await page.click("#rbt-menu-item-0");
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    const url = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
    logger.verbose("Failed to navigate to Portal IVA: " + error.message);
    throw new Error(url);
  }
};

const switchCompanyContext = async (page, cuitCompany) => {
  try {
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    logger.info(`Switching company context to ${cuitCompany}...`);
    await page.waitForSelector('a[title="cambio relación"]', {
      timeout: 16_000,
    });
    await page.click('a[title="cambio relación"]');
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    const cuitCompanyText = formatCUIT(cuitCompany);
    const targetElementFound = await page.evaluate((cuitCompanyText) => {
      const elements = Array.from(
        document.querySelectorAll("div.media-body h3"),
      );
      const targetElement = elements.find((el) =>
        el.textContent.includes(cuitCompanyText),
      );
      if (targetElement) {
        targetElement.click();
        return true;
      }
      return false;
    }, cuitCompanyText);

    if (!targetElementFound) {
      console.error(`Element containing CUIT ${cuitCompanyText} not found.`);
      await page.goBack();
    }
    try {
      await page.waitForSelector('a[title="Representar a..."]', {
        timeout: 16_000,
      });
      await page.evaluate((cuitCompanyText) => {
        const elements = Array.from(
          document.querySelectorAll("div.media-body h3"),
        );
        const targetElement = elements.find((el) =>
          el.textContent.includes(cuitCompanyText),
        );
        if (targetElement) {
          targetElement.click();
        } else {
          console.error(`Element containing CUIT ${cuitCompanyText} not found`);
        }
      }, cuitCompanyText);
    } catch (error) {
      await page.goBack();
    }
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    const url = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
    this.logger.verbose("Failed to switch company context: " + error.message);
    throw new Error(url);
  }
};

const checkAndValidatePeriod = async (page) => {
  try {
    await page.waitForFunction(() => document.readyState === "complete");
    logger.info("Checking and validating period...");
    await page.waitForSelector("#periodo", {
      timeout: 16_000,
    });
    const optionsCount = await page.evaluate(() => {
      const selectElement = document.querySelector("#periodo");
      return selectElement.options.length;
    });

    if (optionsCount > 2) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const lastmonth =
        today.getMonth().toString().padStart(2, "0") === "00"
          ? "12"
          : today.getMonth().toString().padStart(2, "0");
      const final_year = lastmonth === "12" ? year - 1 : year;
      const period = `${final_year}${lastmonth}`;
      console.error("actual ", period, "nuevo", year, month);
      const selected = await page.select("#periodo", period);

      if (selected.length === 0) {
        await page.select("#periodo", `${year}${month}`);
      }
    }

    await page.click(
      'button[aria-label="Sin texto (iva.btn.home.validar.periodo.alt)"]',
    );
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    const url = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
    logger.verbose("Failed to validate period: " + error.message);
    throw new Error(url);
  }
};

const extractData = async (
  page,
  cuitCompany,
  username,
  isCompany,
  companyName,
  realName,
) => {
  try {
    logger.info(`Extracting data...${realName}`);
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    logger.debug("Waiting for selector...");
    await page.waitForSelector("#importeDJV1", {
      timeout: 15_000,
    });

    const extractedData = await page.evaluate(() => {
      const extractValues = (prefix) => {
        const getTextContent = (id) => {
          const element = document.querySelector(`#${id}`);
          return element ? element.textContent.trim() : null;
        };

        return {
          operaciones: {
            neto: getTextContent(`${prefix}1`),
            exento: getTextContent(`${prefix}2`),
            debito: getTextContent(`${prefix}3`),
          },
          notasDeCredito: {
            neto: getTextContent(`${prefix}4`),
            exento: getTextContent(`${prefix}5`),
            debito: getTextContent(`${prefix}6`),
          },
        };
      };

      const ventas = extractValues("importeDJV");
      const compras = extractValues("importeDJC");

      return { ventas, compras };
    });

    return {
      ventas: extractedData.ventas,
      compras: extractedData.compras,
      cuit: cuitCompany || username,
      isCompany,
      nameToShow: companyName || realName,
    };
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Failed to extract data: " + error.message);
  }
};

const retryWithDelay = async (page, selector, delay) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await page.waitForFunction(() => document.readyState === "complete");
    await page.waitForSelector(selector, {
      timeout: 16_000,
    });
  } catch (error) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    const url = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
    throw new Error(url);
  }
};

exports.individualScraper = individualScraper;
