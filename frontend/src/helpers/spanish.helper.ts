import { GridLocaleText } from "@mui/x-data-grid";

const spanishLocaleText: Partial<GridLocaleText> = {
  noRowsLabel: "Sin filas",
  noResultsOverlayLabel: "Sin resultados",

  // Density selector toolbar button text
  toolbarDensity: "Densidad",
  toolbarDensityLabel: "Densidad",
  toolbarDensityCompact: "Compacto",
  toolbarDensityStandard: "Estándar",
  toolbarDensityComfortable: "Cómodo",

  // Columns panel text
  toolbarColumns: "Columnas",
  toolbarColumnsLabel: "Selecciona columnas",

  // Filters panel text
  toolbarFilters: "Filtros",
  toolbarFiltersLabel: "Mostrar filtros",
  toolbarFiltersTooltipHide: "Ocultar filtros",
  toolbarFiltersTooltipShow: "Mostrar filtros",
  toolbarFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} filtros activos` : `${count} filtro activo`,

  // Export panel text
  toolbarExport: "Exportar",
  toolbarExportLabel: "Exportar",
  toolbarExportCSV: "Descargar como CSV",
  toolbarExportPrint: "Imprimir",

  // Columns panel text

  // Filter panel text
  filterPanelAddFilter: "Añadir filtro",
  filterPanelDeleteIconLabel: "Eliminar",
  filterPanelOperatorAnd: "Y",
  filterPanelOperatorOr: "O",
  filterPanelColumns: "Columnas",
  filterPanelInputLabel: "Valor",
  filterPanelInputPlaceholder: "Valor de filtro",

  // Column menu text
  columnMenuLabel: "Menú",
  columnMenuShowColumns: "Mostrar columnas",
  columnMenuManageColumns: "Administrar columnas",
  columnMenuFilter: "Filtrar",
  columnMenuHideColumn: "Ocultar columna",
  columnMenuUnsort: "Deshacer ordenamiento",
  columnMenuSortAsc: "Ordenar por ASC",
  columnMenuSortDesc: "Ordenar por DESC",

  // Column header text
  columnHeaderFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} filtros activos` : `${count} filtro activo`,
  columnHeaderFiltersLabel: "Mostrar filtros",
  columnHeaderSortIconLabel: "Ordenar",

  // Footer text
  footerRowSelected: (count) =>
    count !== 1
      ? `${count.toLocaleString()} filas seleccionadas`
      : `${count.toLocaleString()} fila seleccionada`,

  // Pagination text
  footerTotalRows: "Filas totales:",
  // Checkbox selection text
  checkboxSelectionHeaderName: "Checkbox de selección",
  checkboxSelectionSelectAllRows: "Seleccionar todas las filas",
  checkboxSelectionUnselectAllRows: "Deseleccionar todas las filas",
  checkboxSelectionSelectRow: "Seleccionar fila",
  checkboxSelectionUnselectRow: "Deseleccionar fila",

  // Boolean cell text
  booleanCellTrueLabel: "sí",
  booleanCellFalseLabel: "no",

  // Actions cell more text
  actionsCellMore: "más",
};

export default spanishLocaleText;
