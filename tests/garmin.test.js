// Comprueba que cada ejercicio de la biblioteca tiene su equivalente de Garmin (categoría y nombre del catálogo FIT).
// Uso: node tests/garmin.test.js
'use strict';
const assert = require('assert');
global.window = {};
require('../ejercicios.js');
const B = window.BIBLIOTECA_EJ;
const CALIDADES = ['ok', 'cerca', 'ninguno'];
const CAMEL = /^[a-z][A-Za-z0-9]+$/;
let fallas = 0;
const prueba = (n, f) => { try { f(); console.log('  ok   ', n); } catch (e) { fallas++; console.log('  FALLA', n, '\n        ', e.message); } };
prueba('todas las fichas tienen equivalente de Garmin con un formato válido', () => {
  const malas = B.filter((e) => !(Array.isArray(e.g) && e.g.length === 3 && CAMEL.test(e.g[0]) && CAMEL.test(e.g[1]) && CALIDADES.includes(e.g[2]))).map((e) => e.n);
  assert.deepStrictEqual(malas, []);
});
prueba('las que no tienen equivalente exacto son pocas y están marcadas', () => {
  const sin = B.filter((e) => e.g[2] === 'ninguno').map((e) => e.n);
  assert.deepStrictEqual(sin, ['Extensión de piernas (cuádriceps)']);
});
prueba('el archivo .fit se arma bien: cabecera, tamaño e integridad (CRC)', () => {
  global.window = globalThis; require('../garmin-ids.js');
  const F = require('../garmin-fit.js');
  const b = F.construir({ nombre: 'Pecho', ejercicios: B.slice(0, 6).map((e) => ({ nombre: e.n, categoria: e.g[0], ejercicio: e.g[1], series: 4, reps: 12, kg: 40 })) });
  assert.strictEqual(String.fromCharCode(b[8], b[9], b[10], b[11]), '.FIT');
  const datos = b[4] + b[5] * 256 + b[6] * 65536 + b[7] * 16777216;
  assert.strictEqual(b.length, 14 + datos + 2, 'tamaño de datos = lo que dice la cabecera');
  assert.strictEqual(F.crc16(Array.from(b), 0, b.length), 0, 'CRC de todo el archivo (incluido el suyo) da 0');
  assert.strictEqual(F.crc16(Array.from(b), 0, 14), 0, 'CRC de la cabecera');
});
prueba('todos los equivalentes de las fichas tienen su número de Garmin', () => {
  const ids = window.GARMIN_IDS;
  const faltan = B.filter((e) => !(ids.cats[e.g[0]] !== undefined && ids.nombres[e.g[0]] && ids.nombres[e.g[0]][e.g[1]] !== undefined)).map((e) => e.n);
  assert.deepStrictEqual(faltan, []);
});
console.log(fallas ? '\n' + fallas + ' prueba(s) fallaron' : '\nTodas las pruebas de Garmin pasaron');
process.exit(fallas ? 1 : 0);
