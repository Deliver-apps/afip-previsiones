const logger = require("../config/logger");

/**
 * Valida los datos de entrada del scraper
 * @param {Object} data - Datos a validar
 * @returns {Object} - Resultado de la validación
 */
const validateScraperInput = (data) => {
  const errors = [];
  const warnings = [];

  // Validar campos requeridos
  if (!data.username) {
    errors.push("username is required");
  }

  if (!data.password) {
    errors.push("password is required");
  }

  // Validar CUIT si es empresa
  if (data.is_company && !data.cuit_company) {
    errors.push("cuit_company is required for companies");
  }

  // Validar formato de CUIT
  if (data.cuit_company && data.cuit_company.length !== 11) {
    errors.push("cuit_company must be 11 digits");
  }

  // Validar IVA
  if (data.iva && !["0", "10.5", "21", "27"].includes(data.iva)) {
    errors.push("iva must be one of: 0, 10.5, 21, 27");
  }

  // Validar venta
  if (data.venta && isNaN(Number(data.venta))) {
    errors.push("venta must be a valid number");
  }

  // Warnings para datos opcionales
  if (!data.iva) {
    warnings.push("iva not provided, will use default");
  }

  if (!data.venta) {
    warnings.push("venta not provided, will use 0");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Valida los datos extraídos del scraper
 * @param {Object} extractedData - Datos extraídos
 * @returns {Object} - Resultado de la validación
 */
const validateExtractedData = (extractedData) => {
  const errors = [];
  const warnings = [];

  if (!extractedData.ventas || !extractedData.compras) {
    errors.push("Missing ventas or compras data");
  }

  if (!extractedData.cuit) {
    errors.push("Missing cuit");
  }

  if (!extractedData.nameToShow) {
    errors.push("Missing nameToShow");
  }

  // Verificar que los valores numéricos son válidos
  const checkNumericValues = (data, prefix) => {
    if (data.operaciones) {
      Object.entries(data.operaciones).forEach(([key, value]) => {
        if (value && isNaN(Number(value))) {
          warnings.push(`${prefix}.operaciones.${key} is not a valid number: ${value}`);
        }
      });
    }
    
    if (data.notasDeCredito) {
      Object.entries(data.notasDeCredito).forEach(([key, value]) => {
        if (value && isNaN(Number(value))) {
          warnings.push(`${prefix}.notasDeCredito.${key} is not a valid number: ${value}`);
        }
      });
    }
  };

  if (extractedData.ventas) {
    checkNumericValues(extractedData.ventas, "ventas");
  }

  if (extractedData.compras) {
    checkNumericValues(extractedData.compras, "compras");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Formatea los datos para logging
 * @param {Object} data - Datos a formatear
 * @returns {Object} - Datos formateados
 */
const formatDataForLogging = (data) => {
  const { password, ...safeData } = data;
  return {
    ...safeData,
    password: "***HIDDEN***",
  };
};

module.exports = {
  validateScraperInput,
  validateExtractedData,
  formatDataForLogging,
}; 