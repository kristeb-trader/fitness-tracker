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
console.log(fallas ? '\n' + fallas + ' prueba(s) fallaron' : '\nTodas las pruebas de Garmin pasaron');
process.exit(fallas ? 1 : 0);
