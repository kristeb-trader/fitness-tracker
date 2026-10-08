// Google Sheets / Apps Script simulado para probar apps-script/Code.gs sin conexión.
// Imita lo que más problemas dio: un texto con forma de fecha u hora se convierte
// en fecha real si la celda NO tiene formato de texto («@»).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function autoConvertir(v) {
  if (typeof v !== 'string') return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + 'T00:00:00Z');
  if (/^\d{2}:\d{2}$/.test(v)) { const [h, m] = v.split(':').map(Number); return new Date(Date.UTC(1899, 11, 30, h, m)); }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return new Date(v);
  return v;
}

function crearHoja(nombre) {
  const s = { nombre, filas: [], formato: {}, maxRows: 1000 };
  const esTexto = (r, c) => s.formato[r + ':' + c] === '@';
  const ancho = () => s.filas.reduce((m, f) => Math.max(m, f ? f.length : 0), 0);
  const leerCelda = (r, c) => (s.filas[r - 1] && s.filas[r - 1][c - 1] !== undefined ? s.filas[r - 1][c - 1] : '');
  const escribirCelda = (r, c, v) => {
    while (s.filas.length < r) s.filas.push([]);
    const f = s.filas[r - 1];
    while (f.length < c - 1) f.push('');
    f[c - 1] = esTexto(r, c) ? v : autoConvertir(v);
  };
  s.getMaxRows = () => s.maxRows;
  s.getLastRow = () => { let n = s.filas.length; while (n && !(s.filas[n - 1] || []).some(v => v !== '' && v !== undefined)) n--; return n; };
  s.getLastColumn = () => ancho();
  s.setFrozenRows = () => s;
  s.deleteRow = (n) => { s.filas.splice(n - 1, 1); };
  s.appendRow = (fila) => { const r = s.getLastRow() + 1; fila.forEach((v, i) => escribirCelda(r, i + 1, v)); };
  s.getDataRange = () => ({ getValues: () => { const w = ancho(); return s.filas.slice(0, s.getLastRow()).map(f => Array.from({ length: w }, (_, i) => (f[i] === undefined ? '' : f[i]))); } });
  s.getRange = (r, c, nr = 1, nc = 1) => {
    const rango = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => leerCelda(r + i, c + j))),
      setValues: (v) => { v.forEach((fila, i) => fila.forEach((x, j) => escribirCelda(r + i, c + j, x))); return rango; },
      setValue: (x) => { escribirCelda(r, c, x); return rango; },
      setNumberFormat: (f) => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) s.formato[(r + i) + ':' + (c + j)] = f; return rango; },
      setFontWeight: () => rango
    };
    return rango;
  };
  return s;
}

const dos = (n) => String(n).padStart(2, '0');
function formatDate(d, zona, patron) {
  // El simulador trabaja en UTC
  const f = d.getUTCFullYear() + '-' + dos(d.getUTCMonth() + 1) + '-' + dos(d.getUTCDate());
  const h = dos(d.getUTCHours()) + ':' + dos(d.getUTCMinutes());
  if (patron === 'HH:mm') return h;
  if (patron === 'yyyy-MM-dd') return f;
  return f + 'T' + h + ':' + dos(d.getUTCSeconds());
}

/** Carga Code.gs en un entorno simulado y devuelve { ctx, hojas, props, post, llamadasApi, ... }. */
function crearServicio(opciones = {}) {
  const hojas = {};
  const props = Object.assign({ TOKEN: 'clave-de-prueba-1234567890' }, opciones.props || {});
  const llamadasApi = [];
  const estado = { respuestaApi: () => ({ getResponseCode: () => 500, getContentText: () => '{}' }), n: 0, registros: [] };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSpreadsheetTimeZone: () => 'UTC',
      getSheetByName: (x) => hojas[x] || null,
      insertSheet: (x) => (hojas[x] = crearHoja(x)),
      getSheets: () => Object.values(hojas),
      deleteSheet: (h) => { delete hojas[h.nombre]; }
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    UrlFetchApp: { fetch: (url, opt) => { llamadasApi.push({ url, opt }); return estado.respuestaApi(); } },
    Utilities: { getUuid: () => 'id-' + (++estado.n), formatDate },
    Logger: { log: (x) => estado.registros.push(String(x)) },
    JSON, Date, Object, Math, String, Number, isFinite, isNaN, Error, Array, RegExp
  };
  vm.createContext(ctx);
  const archivo = opciones.codigo || path.join(__dirname, '..', 'apps-script', 'Code.gs');
  vm.runInContext(fs.readFileSync(archivo, 'utf8'), ctx, { filename: 'Code.gs' });
  const post = (o) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(o) } }).text);
  return { ctx, hojas, props, post, llamadasApi, estado, crearHoja };
}

module.exports = { crearServicio, crearHoja, autoConvertir };
