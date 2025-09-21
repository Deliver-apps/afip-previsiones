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
  iva: iva = "",
  venta: venta = "",
  retry,
}) => {
  let browser;
  let page;
  let newPage;
  let newPage2;
  let currentPage = null; // Rastrear la pestaña actual donde estamos trabajando
  
  const startTime = Date.now();
  const userIdentifier = isCompany ? cuitCompany : username;
  
  logger.info(`Starting scraper for user: ${userIdentifier} (${realName || companyName})`);
  
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
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--disable-extensions",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });
  } catch (error) {
    logger.error(`Failed to launch browser for ${userIdentifier}: ${error.message}`);
    throw new Error(`No se pudo procesar la solicitud para ${userIdentifier}. Por favor, intente nuevamente.`);
  }

  page = await browser.newPage();
  
  // Configurar timeouts y user agent
  await page.setDefaultTimeout(30000);
  await page.setDefaultNavigationTimeout(30000);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const url = "https://www.afip.gob.ar/landing/default.asp";

  // Función para obtener la pestaña visible/activa actual del navegador
  const getActivePage = async () => {
    try {
      // Si tenemos currentPage rastreado, usarlo primero
      if (currentPage && !currentPage.isClosed()) {
        try {
          await currentPage.evaluate(() => document.readyState);
          return currentPage;
        } catch (e) {
          // currentPage ya no es válida, continuar
        }
      }
      
      // Obtener todas las pestañas y encontrar la que tiene contenido válido
      const pages = await browser.pages();
      const validPages = [];
      
      for (const p of pages) {
        try {
          if (!p.isClosed()) {
            // Verificar que la pestaña tenga contenido válido
            const url = await p.url();
            const title = await p.title().catch(() => '');
            // Si tiene URL válida (no about:blank) o título, es una pestaña válida
            if (url && url !== 'about:blank' && url !== 'chrome://newtab/') {
              validPages.push({ page: p, url, title });
            }
          }
        } catch (e) {
          // Ignorar páginas que no se pueden verificar
        }
      }
      
      // Si hay pestañas válidas, retornar la última (más reciente)
      if (validPages.length > 0) {
        return validPages[validPages.length - 1].page;
      }
      
      // Fallback: usar las pestañas conocidas
      return newPage2 || newPage || page;
    } catch (error) {
      logger.warn(`Error getting active page: ${error.message}`);
      return newPage2 || newPage || page;
    }
  };

  const closeBrowser = async () => {
    if (browser) {
      try {
        await browser.close();
        logger.debug(`Browser closed for ${userIdentifier}`);
      } catch (error) {
        logger.warn(`Error closing browser for ${userIdentifier}: ${error.message}`);
      }
    }
  };

  const handleRetry = async (error, paget) => {
    const executionTime = Date.now() - startTime;
    logger.error(`Error for ${userIdentifier} after ${executionTime}ms: ${error.message}`);
    
    if (!retry) {
      await closeBrowser();
      logger.info(`Retrying ${userIdentifier} with fixed data...`);
      const fixData = {
        username,
        password,
        is_company: isCompany,
        company_name: companyName,
        cuit_company: cuitCompany,
        real_name: realName,
        retry: true,
        iva: iva,
        venta: venta,
      };
      return individualScraper(fixData);
    }
    
    await paget.waitForFunction(() => document.readyState === "complete");
    const screenshotBuffer = await paget.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}-${userIdentifier}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    await closeBrowser();
    throw error;
  };

  try {
    // Navigate to the initial URL
    currentPage = page;
    await page.goto(url);
    await page.waitForSelector("a.btn.btn-sm.btn-info.btn-block.uppercase");
    await page.click("a.btn.btn-sm.btn-info.btn-block.uppercase");

    // Handle the new page that opens after clicking
    newPage = await getNewPage(browser);
    currentPage = newPage;

    await loginToAfip(newPage, username, password);

    // Navigate to the "Portal IVA"
    await navigateToPortalIVA(newPage);

    // Handle the new page that opens after clicking "Portal IVA"
    newPage2 = await getNewPage(browser);
    currentPage = newPage2;

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
      iva,
      venta,
    );

    // Close the browser and return the extracted data
    await closeBrowser();
    return campos;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(`Final error for ${userIdentifier} after ${executionTime}ms: ${error.message}`);
    
    // Obtener la pestaña activa actual donde ocurrió el error
    const activePage = await getActivePage();
    let screenshotUrl = null;
    
    try {
      await activePage.waitForFunction(() => document.readyState === "complete", { timeout: 5000 }).catch(() => {});
      const screenshotBuffer = await activePage.screenshot({
        encoding: "binary",
        fullPage: true
      });
      const fileName = `screenshots/screenshot-${Date.now()}-${userIdentifier}.png`;
      await uploadToSpaces(screenshotBuffer, fileName);
      screenshotUrl = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
      logger.info(`Screenshot saved for ${userIdentifier}: ${screenshotUrl}`);
    } catch (screenshotError) {
      logger.error(`Failed to take screenshot for ${userIdentifier}: ${screenshotError.message}`);
    }

    await handleRetry(error, activePage);

    return {
      error: error.message,
      link: screenshotUrl,
      userIdentifier,
      executionTime,
    };
  }
};

const goToData = async (page) => {
  logger.info("Going to data...");
  await page.waitForFunction(() => document.readyState === "complete");
  
  // Scroll más suave y verificable
  await page.evaluate(() => {
    window.scrollTo({ top: 2000, behavior: 'smooth' });
  });
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  
  // Verificar que el botón existe antes de hacer click
  await page.waitForSelector("#btnVistaPrevia", { timeout: 10000 });
  await page.click("#btnVistaPrevia");
  
  // Esperar a que los datos se carguen
  await page.waitForSelector("#importeDJV1", { timeout: 15000 });
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
    throw new Error(`No se pudo acceder a la siguiente página. Por favor, verifique su conexión e intente nuevamente.`);
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
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await page.waitForSelector("#F1\\:password", {
      timeout: 16_000,
    });
    await page.type("#F1\\:password", password);
    logger.info("Waiting before clicking login button...");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    logger.info("Clicking login button...");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await page.click('[id="F1:btnIngresar"]');
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
    throw new Error(`No se pudo acceder al Portal IVA. Screenshot: ${url}`);
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
    logger.verbose("Failed to switch company context: " + error.message);
    throw new Error(`No se pudo cambiar al contexto de la empresa. Screenshot: ${url}`);
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
    throw new Error(`No se pudo validar el período de declaración. Screenshot: ${url}`);
  }
};




const extractData = async (
  page,
  cuitCompany,
  username,
  isCompany,
  companyName,
  realName,
  iva,
  venta,
) => {
  const userIdentifier = isCompany ? cuitCompany : username;
  
  try {
    logger.info(`Extracting data for ${userIdentifier} (${realName || companyName})`);
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    logger.debug(`Waiting for selector #importeDJV1 for ${userIdentifier}...`);
    
    // Verificar que los datos de entrada son válidos
    if (!iva || !venta) {
      logger.warn(`Missing iva or venta data for ${userIdentifier}. IVA: ${iva}, Venta: ${venta}`);
    }
    
    await page.waitForSelector("#importeDJV1", {
      timeout: 15_000,
    });

    const extractedData = await page.evaluate((ivaValue, ventaValue) => {
      const calculateNeto = (total, iva) => {
        let divisor;
        switch (iva) {
          case "10.5":
            divisor = 1 + 10.5 / 100;
            break;
          case "21":
            divisor = 1 + 21 / 100;
            break;
          case "27":
            divisor = 1 + 27 / 100;
            break;
          case "0":
            divisor = 1;
            break;
          default:
            return total;
        }
        return total / divisor;
      };

      const calculateIvaNeto = (total, iva) => {
        let totalResult;
        switch (iva) {
          case "10.5":
            totalResult = total * (10.5 / 100);
            break;
          case "21":
            totalResult = total * (21 / 100);
            break;
          case "27":
            totalResult = total * (27 / 100);
            break;
          case "0":
            totalResult = 0;
            break;
          default:
            return 0;
        }
        return totalResult;
      };

      const extractValues = (prefix) => {
        const getTextContent = (id) => {
          const element = document.querySelector(`#${id}`);
          return element ? element.textContent.trim() : null;
        };
        const ventaNumber = ventaValue && ventaValue.length > 0 ? Number(ventaValue) : 0;

        const venta = calculateNeto(ventaNumber, ivaValue);
        const iva = calculateIvaNeto(venta, ivaValue);

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
            noGeneranCredito: getTextContent(`${prefix}7`),
          },
          iva,
          venta,
          ventaAndIva: ventaNumber,
        };
      };

      const ventas = extractValues("importeDJV");
      const compras = extractValues("importeDJC");

      return { ventas, compras };
    }, iva, venta);

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
    const url = `https://previsiones-afip.nyc3.cdn.digitaloceanspaces.com/${fileName}`;
    throw new Error(`No se pudieron obtener los datos de previsiones. Screenshot: ${url}`);
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
    throw new Error(`La página no respondió a tiempo. Por favor, intente nuevamente. Screenshot: ${url}`);
  }
};

exports.individualScraper = individualScraper;
