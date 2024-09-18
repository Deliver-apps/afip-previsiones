import { PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import { logger } from "../config/logger";
import { s3ClientPrevisiones } from "../digitalOceanClient";
import { Browser, Page } from "puppeteer";
import { ScraperPrevisiones } from "../types/scraperPrevisiones.types";
import { config } from "../config/config";

const formatCUIT = (cuit: string) => {
  if (cuit.length !== 11) {
    throw new Error("CUIT must be 11 digits long");
  }
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
};

const uploadToSpaces = async (
  buffer: Uint8Array | Buffer,
  fileName: string,
) => {
  const acl = ObjectCannedACL.public_read;
  const params = {
    Bucket: "previsiones-afip",
    Key: fileName,
    Body: buffer,
    ACL: acl,
  };

  return await s3ClientPrevisiones.send(new PutObjectCommand(params));
};

export const individualScraper = async ({
  username,
  password,
  is_company: isCompany,
  company_name: companyName,
  cuit_company: cuitCompany,
  real_name: realName,
  retry,
}: ScraperPrevisiones) => {
  let browser: Browser;
  let firstPage: Page;
  let newPage: Page | null = null;
  let newPage2: Page | null = null;
  try {
    logger.info("Launching browser...");
    if (config.nodeEnv === "production") {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: config.chromeExecutablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      });
    } else {
      browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        // executablePath: config.nodeEnv
        //   ? config.chromeExecutablePath
        //   : puppeteer.executablePath(),
        // args: [
        //   "--no-sandbox",
        //   "--disable-setuid-sandbox",
        //   "--single-process",
        //   "--no-zygote",
        // ],
      });
    }
    browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // executablePath: config.nodeEnv
      //   ? config.chromeExecutablePath
      //   : puppeteer.executablePath(),
      // args: [
      //   "--no-sandbox",
      //   "--disable-setuid-sandbox",
      //   "--single-process",
      //   "--no-zygote",
      // ],
    });
  } catch (error: any) {
    throw new Error("Failed to launch browser: " + error.message);
  }

  firstPage = await browser.newPage();
  const url = "https://www.afip.gob.ar/landing/default.asp";

  const closeBrowser = async () => {
    if (browser) {
      await browser.close();
    }
  };

  const handleRetry = async (error: Error, paget: Page) => {
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
    await firstPage.goto(url);
    await firstPage.waitForSelector(
      "a.btn.btn-sm.btn-info.btn-block.uppercase",
    );
    await firstPage.click("a.btn.btn-sm.btn-info.btn-block.uppercase");

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
  } catch (error: any) {
    logger.error("An error occurred:", error.message);
    const seletedPage = newPage2 ?? newPage ?? firstPage;
    const screenshotBuffer = await seletedPage.screenshot({
      encoding: "binary",
    });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);

    await handleRetry(error, newPage2 ?? newPage ?? firstPage);

    return { error: error.message };
  }
};

const goToData = async (page: Page) => {
  logger.info("Going to data...");
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(() => {
    window.scrollTo(0, 1000);
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#btnVistaPrevia");
  await page.click("#btnVistaPrevia");
  await page.waitForSelector("#importeDJV1");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

const buyBook = async (page: Page) => {
  logger.info("Opening buy book...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Volver al Libro"),
    );
    if (link) {
      link.click();
    } else {
      console.error('Link with text "Volver al Libro" not found.');
    }
  });

  await page.waitForFunction(() => document.readyState === "complete");
};

const sellBook = async (page: Page) => {
  logger.info("Opening sell book...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#btnDropdownImportar");
  await page.click("#btnDropdownImportar");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#lnkImportarAFIP");
  await page.click("#lnkImportarAFIP");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#btnImportarAFIPImportar");
  await page.click("#btnImportarAFIPImportar");

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 7_000));

  await page.waitForSelector("#btnTareasCerrar");
  await page.click("#btnTareasCerrar");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.evaluate(() => {
    window.scrollTo(0, 1000);
  });
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((element) =>
      element.textContent?.includes("Continuar al Libro Compras"),
    );
    if (link) {
      link.click();
    } else {
      console.error('Link with text "Continuar al Libro Compras" not found.');
    }
  });

  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

const openBooks = async (page: Page) => {
  logger.info("Opening books...");
  await page.waitForFunction(() => document.readyState === "complete");
  logger.error("Waiting for button...");
  await page.evaluate(async () => {
    const button: HTMLButtonElement | null = document.querySelector(
      'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]',
    );
    if (button) {
      button.click();
    }
  });
  logger.error("Button clicked...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  logger.error("Waiting for body...");
  await page.waitForSelector("body");
  await page.evaluate(() => {
    const button: HTMLButtonElement | null = document.querySelector(
      'button[aria-label="Sin texto (iva.btn.home.liva.alt)"]',
    );
    if (button) {
      button.click();
    } else {
      console.log("Button not found");
    }
    window.scrollTo(0, 200);
  });
  logger.error("Button clicked...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  logger.error("Waiting for #operacion...");
  const ningunaOperacionExists2 = await page.$("#ningunaOperacion");
  if (ningunaOperacionExists2) {
    await page.click("#ningunaOperacion");
    await page.waitForSelector("#btnGuardar");

    await page.click("#btnGuardar");
  }
  logger.error("Waiting for #btnLibroVentas...");
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.waitForSelector("#btnLibroVentas");

  await page.click("#btnLibroVentas");
  logger.error("Waiting for #btnLibroCompras...");
  await new Promise((resolve) => setTimeout(resolve, 4000));
};

const newDeclaration = async (page: Page) => {
  await page.waitForFunction(() => document.readyState === "complete");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  try {
    logger.info("Opening new declaration...");
    await page.evaluate(() => {
      const button: HTMLButtonElement | null = document.querySelector(
        'button[aria-label="Sin texto (iva.home.btn.nueva.declaracion.alt)"]',
      );
      if (button) {
        button.click();
      } else {
        console.error("ERROR INGRESAR");
      }
    });
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    console.log(error);
  }
};

const getNewPage = async (browser: Browser): Promise<Page> => {
  try {
    logger.info("Opening new page...");
    const newPagePromise: Promise<Page> = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout waiting for new page")),
        10_000, // Increased timeout for new page creation
      );

      browser.once("targetcreated", async (target) => {
        clearTimeout(timeout);
        const page: Page | null = await target.page();
        if (!page) {
          throw new Error("Target did not produce a page");
        }
        resolve(page);
      });
    });

    logger.debug("Waiting for new page...");
    const newPageC: Page = await newPagePromise;
    logger.debug("New page created...");

    // if you know the page needs additional time to load fully, use a fixed delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info("New page opened...");

    return newPageC;
  } catch (error: any) {
    logger.error("Error in getNewPage:", error); // Log the full error details
    throw new Error("Failed to open new page: " + error.message);
  }
};

const loginToAfip = async (page: Page, username: string, password: string) => {
  try {
    logger.info(`Logging in to AFIP...${username}`);
    await page.waitForFunction(() => document.readyState === "complete");
    await page.waitForSelector("#F1\\:username", {
      timeout: 6_000,
    });
    await page.type("#F1\\:username", username);
    await page.click("#F1\\:btnSiguiente");

    await page.waitForSelector("#F1\\:password", {
      timeout: 6_000,
    });
    await page.type("#F1\\:password", password);
    logger.info("Clicking login button...");
    await page.click("#F1\\:btnIngresar");
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    console.error("Login failed, retrying...", error.message);
    await retryWithDelay(page, "#F1\\:password", 3000);
  }
};

const navigateToPortalIVA = async (page: Page) => {
  try {
    logger.info("Navigating to Portal IVA...");
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.waitForSelector("#buscadorInput", {
      timeout: 6_000,
    });
    await page.type("#buscadorInput", "Portal iva");
    await page.click("#rbt-menu-item-0");
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Failed to navigate to Portal IVA: " + error.message);
  }
};

const switchCompanyContext = async (page: Page, cuitCompany: string) => {
  try {
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    logger.info(`Switching company context to ${cuitCompany}...`);
    await page.waitForSelector('a[title="cambio relación"]', {
      timeout: 10_000,
    });
    await page.click('a[title="cambio relación"]');
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const cuitCompanyText = formatCUIT(cuitCompany);
    const targetElementFound = await page.evaluate((cuitCompanyText) => {
      const elements: HTMLElement[] | null = Array.from(
        document.querySelectorAll("div.media-body h3"),
      );
      const targetElement = elements.find((el) =>
        el.textContent?.includes(cuitCompanyText),
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
          document.querySelectorAll("div.media-body h3"),
        );
        const targetElement = elements.find((el) =>
          el.textContent?.includes(cuitCompanyText),
        );
        if (targetElement !== undefined) {
          (targetElement as HTMLElement).click();
        } else {
          console.error(`Element containing CUIT ${cuitCompanyText} not found`);
        }
      }, cuitCompanyText);
    } catch (error: any) {
      await page.goBack();
    }
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Failed to switch company context: " + error.message);
  }
};

const checkAndValidatePeriod = async (page: Page) => {
  try {
    await page.waitForFunction(() => document.readyState === "complete");
    logger.info("Checking and validating period...");
    await page.waitForSelector("#periodo", {
      timeout: 10_000,
    });
    console.log("Waiting for periodo...");
    const optionsCount = await page.evaluate(() => {
      const selectElement = document.querySelector(
        "#periodo",
      ) as HTMLSelectElement;
      if (!selectElement) {
        throw new Error("Select element not found");
      }
      return selectElement.options.length;
    });

    if (optionsCount > 2) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const lastmonth = today.getMonth().toString().padStart(2, "0");
      const period = `${year}${lastmonth}`;
      const selected = await page.select("#periodo", period);

      if (selected.length === 0) {
        await page.select("#periodo", `${year}${month}`);
      }
    }

    await page.click(
      'button[aria-label="Sin texto (iva.btn.home.validar.periodo.alt)"]',
    );
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Failed to validate period: " + error.message);
  }
};

const extractData = async (
  page: Page,
  cuitCompany: string,
  username: string,
  isCompany: boolean,
  companyName: string,
  realName: string,
) => {
  try {
    logger.info(`Extracting data...${realName}`);
    await page.waitForFunction(() => document.readyState === "complete");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    logger.debug("Waiting for selector...");
    await page.waitForSelector("#importeDJV1", {
      timeout: 5_000,
    });

    const extractedData = await page.evaluate(() => {
      const extractValues = (prefix: string) => {
        const getTextContent = (id: string) => {
          const element = document.querySelector(`#${id}`);
          return element ? element.textContent?.trim() : null;
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
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Failed to extract data: " + error.message);
  }
};

const retryWithDelay = async (page: Page, selector: string, delay: number) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await page.waitForFunction(() => document.readyState === "complete");
    await page.waitForSelector(selector, {
      timeout: 6_000,
    });
  } catch (error: any) {
    const screenshotBuffer = await page.screenshot({ encoding: "binary" });
    const fileName = `screenshots/screenshot-${Date.now()}.png`;
    await uploadToSpaces(screenshotBuffer, fileName);
    throw new Error("Retry failed: " + error.message);
  }
};
