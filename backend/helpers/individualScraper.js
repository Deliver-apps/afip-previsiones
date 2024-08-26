const puppeteer = require("puppeteer");
const logger = require("../config/logger");
const config = require("../config/config");

const formatCUIT = (cuit) => {
  if (cuit.length !== 11) {
    throw new Error("CUIT must be 11 digits long");
  }
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
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
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: config.nodeEnv
        ? config.chromeExecutablePath
        : puppeteer.executablePath(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });
  } catch (error) {
    throw new Error("Failed to launch browser: " + error.message);
  }

  const page = await browser.newPage();
  const url = "https://www.afip.gob.ar/landing/default.asp";

  const closeBrowser = async () => {
    if (browser) {
      await browser.close();
    }
  };

  const handleRetry = async (error) => {
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
    await closeBrowser();
    throw error;
  };
  let newPage;
  let newPage2;

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
    // await handleNoOperation(newPage2);

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
      realName
    );

    // Close the browser and return the extracted data
    await closeBrowser();
    return campos;
  } catch (error) {
    await handleRetry(error);
    const milisecondsdatetime = new Date().getTime();

    if(newPage2) {
      await newPage2.screenshot({ path: `error-${milisecondsdatetime}.png` });
    } else if(newPage) {
      await newPage.screenshot({ path: `error-${milisecondsdatetime}.png` });
    } else {
      await page.screenshot({ path: `error-${milisecondsdatetime}.png` });
    }
      

    return { error: error.message };
  }
};

const goToData = async (page) => {
  logger.info("Going to data...");
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(() => {
    window.scrollTo(0, 1000);
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await page.waitForSelector("#btnVistaPrevia");
  await page.click("#btnVistaPrevia");
  await page.waitForSelector("#importeDJV1");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 2000));
};

const buyBook = async (page) => {
  logger.info("Opening buy book...");
  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");

  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent.includes("Volver al Libro")
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
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");

  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await new Promise((resolve) => setTimeout(resolve, 10_000));

  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await page.evaluate(() => {
    window.scrollTo(0, 1000);
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent.includes("Continuar al Libro Compras")
    );
    if (link) {
      link.click();
    } else {
      console.error('Link with text "Continuar al Libro Compras" not found.');
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));
};

const openBooks = async (page) => {
  logger.info("Opening books...");
  await page.evaluate(async () => {
    const button = document.querySelector(
      'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]'
    );
    if (button) {
      button.click();
    }
  });
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await page.waitForSelector("body");
  await page.evaluate(() => {
    const button = document.querySelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]'
    );
    if (button) {
      button.click();
    } else {
      console.log("Button not found");
    }
    window.scrollTo(0, 200);
  });
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const ningunaOperacionExists2 = await page.$("#ningunaOperacion");
  if (ningunaOperacionExists2) {
    await page.click("#ningunaOperacion");
    await page.waitForSelector("#btnGuardar");

    await page.click("#btnGuardar");
  }
  await page.waitForSelector("#btnLibroVentas");

  await page.click("#btnLibroVentas");

  await new Promise((resolve) => setTimeout(resolve, 4000));
};

const handleNoOperation = async (page) => {
  await page.waitForFunction(() => document.readyState === "complete");
  try {
    await page.waitForSelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]',
      {
        timeout: 5000,
      }
    );
    await page.click('button[aria-label="Sin texto (iva.btn.home.liva.alt)"]');
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.waitForSelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]',
      {
        timeout: 5000,
      }
    );
    await page.click('button[aria-label="Sin texto (iva.btn.home.liva.alt)"]');
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  const ningunaOperacionExists = await page.$("#ningunaOperacion");
  if (ningunaOperacionExists) {
    await page.click("#ningunaOperacion");
    await page.waitForSelector("#btnGuardar");

    await page.click("#btnGuardar");
  }
};

const newDeclaration = async (page) => {
  await page.waitForFunction(() => document.readyState === "complete");
  try {
    logger.info("Opening new declaration...");
    await page.waitForSelector(
      'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]',
      {
        timeout: 6_000,
      }
    );
    await page.evaluate(() => {
      const button = document.querySelector(
        'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]'
      );
      if (button) {
        button.click();
      } else {
        console.error("ERROR INGRESAR");
      }
    });
  } catch (error) {
    console.log(error);
  }
};

const getNewPage = async (browser) => {
  try {
    logger.info("Opening new page...");
    const newPagePromise = new Promise((resolve) =>
      browser.once("targetcreated", async (target) =>
        resolve(await target.page())
      )
    );
    const newPage = await newPagePromise;
    await newPage.waitForFunction(() => document.readyState === "complete");
    return newPage;
  } catch (error) {
    throw new Error("Failed to open new page: " + error.message);
  }
};

const loginToAfip = async (page, username, password) => {
  try {
    logger.info(`Logging in to AFIP...${username}`);
    await page.waitForSelector("#F1\\:username", {
      timeout: 6_000,
    });
    await page.type("#F1\\:username", username);
    await page.click("#F1\\:btnSiguiente");

    await page.waitForSelector("#F1\\:password", {
      timeout: 6_000,
    });
    await page.type("#F1\\:password", password);
    await page.click("#F1\\:btnIngresar");
  } catch (error) {
    console.error("Login failed, retrying...", error.message);
    await retryWithDelay(page, "#F1\\:password", 3000);
  }
};

const navigateToPortalIVA = async (page) => {
  try {
    logger.info("Navigating to Portal IVA...");
    await page.waitForSelector("#buscadorInput", {
      timeout: 6_000,
    });
    await page.type("#buscadorInput", "Portal iva");
    await page.click("#rbt-menu-item-0");
  } catch (error) {
    throw new Error("Failed to navigate to Portal IVA: " + error.message);
  }
};

const switchCompanyContext = async (page, cuitCompany) => {
  try {
    logger.info(`Switching company context to ${cuitCompany}...`);
    await page.waitForSelector('a[title="cambio relación"]', {
      timeout: 6_000,
    });
    await page.click('a[title="cambio relación"]');
    await page.waitForFunction(() => document.readyState === "complete");

    const cuitCompanyText = formatCUIT(cuitCompany);
    const targetElementFound = await page.evaluate((cuitCompanyText) => {
      const elements = Array.from(
        document.querySelectorAll("div.media-body h3")
      );
      const targetElement = elements.find((el) =>
        el.textContent.includes(cuitCompanyText)
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
        timeout: 6_000,
      });
      await page.evaluate((cuitCompanyText) => {
        const elements = Array.from(
          document.querySelectorAll("div.media-body h3")
        );
        const targetElement = elements.find((el) =>
          el.textContent.includes(cuitCompanyText)
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
    throw new Error("Failed to switch company context: " + error.message);
  }
};

const checkAndValidatePeriod = async (page) => {
  try {
    logger.info("Checking and validating period...");
    await page.waitForSelector("#periodo", {
      timeout: 6_000,
    });
    const optionsCount = await page.evaluate(() => {
      const selectElement = document.querySelector("#periodo");
      return selectElement.options.length;
    });

    if (optionsCount > 2) {
      throw new Error("There is a previous period that hasn't been closed.");
    }

    await page.click(
      'button[aria-label="Sin texto (iva.btn.home.validar.periodo.alt)"]'
    );
  } catch (error) {
    throw new Error("Failed to validate period: " + error.message);
  }
};

const extractData = async (
  page,
  cuitCompany,
  username,
  isCompany,
  companyName,
  realName
) => {
  try {
    logger.info(`Extracting data...${realName}`);
    await page.waitForSelector("#importeDJV1", {
      timeout: 6_000,
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
    throw new Error("Failed to extract data: " + error.message);
  }
};

const retryWithDelay = async (page, selector, delay) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await page.waitForSelector(selector, {
      timeout: 6_000,
    });
  } catch (error) {
    throw new Error("Retry failed: " + error.message);
  }
};

exports.individualScraper = individualScraper;
