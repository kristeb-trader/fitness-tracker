/*
 * Genera un archivo de entrenamiento de Garmin (.fit) con ejercicios de fuerza: cada ejercicio con su categoría y nombre del
 * catálogo oficial, series, repeticiones, peso y descanso. Se copia al reloj (carpeta GARMIN/NewFiles) y aparece en Entrenamientos.
 * Formato: FIT Protocol (Garmin). Números de campos y de enumeraciones tomados del perfil oficial del SDK de Garmin.
 */
(function (raiz) {
  "use strict";
  // Números de categoría y de cada ejercicio, del catálogo oficial (garmin-ids.js)
  var IDS = raiz.GARMIN_IDS || { cats: {}, nombres: {} };
  var CATEGORIA = IDS.cats;

  // Tipos base de FIT
  var T = { enum: [0x00, 1], uint8: [0x02, 1], uint16: [0x84, 2], uint32: [0x86, 4], uint32z: [0x8C, 4], string: [0x07, 1] };

  function crc16(bytes, ini, fin, crc) {
    var tabla = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
    crc = crc || 0;
    for (var i = ini; i < fin; i++) {
      var b = bytes[i], t = tabla[crc & 0xF];
      crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ tabla[b & 0xF];
      t = tabla[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ tabla[(b >> 4) & 0xF];
    }
    return crc;
  }
  function textoBytes(s, max) {
    var out = [], enc = unescape(encodeURIComponent(String(s || "")));
    for (var i = 0; i < enc.length && out.length < max - 1; i++) out.push(enc.charCodeAt(i));
    // no cortar a la mitad de un carácter de varios bytes
    while (out.length && (out[out.length - 1] & 0xC0) === 0x80 && i < enc.length) out.pop();
    while (out.length && (out[out.length - 1] & 0xC0) === 0xC0) out.pop();
    while (out.length < max) out.push(0);
    return out;
  }
  function numBytes(v, tam) { var o = []; for (var i = 0; i < tam; i++) o.push((v / Math.pow(256, i)) & 0xFF); return o; }

  /** Un tipo de mensaje: definición (una vez) y datos (cada fila). campos: [número, tipo, tamaño (solo texto)] */
  function Mensaje(global, local, campos) {
    this.global = global; this.local = local; this.campos = campos;
  }
  Mensaje.prototype.definicion = function () {
    var b = [0x40 | this.local, 0, 0].concat(numBytes(this.global, 2), [this.campos.length]);
    this.campos.forEach(function (c) { var tipo = T[c[1]]; b.push(c[0], c[1] === "string" ? c[2] : tipo[1] * 1, tipo[0]); });
    return b;
  };
  Mensaje.prototype.datos = function (valores) {
    var b = [this.local];
    this.campos.forEach(function (c, i) {
      var v = valores[i], tipo = T[c[1]];
      if (c[1] === "string") b = b.concat(textoBytes(v, c[2]));
      else b = b.concat(numBytes(v, tipo[1]));
    });
    return b;
  };

  var FIT_EPOCA = Date.UTC(1989, 11, 31) / 1000;
  /**
   * rutina: { nombre, ejercicios: [{ nombre, categoria, ejercicio, series, reps, kg, descanso }] }
   * Devuelve un Uint8Array con el archivo .fit completo.
   */
  function construir(rutina, opciones) {
    opciones = opciones || {};
    var descansoSerie = opciones.descansoSerie || 90, descansoEj = opciones.descansoEjercicio || 120;
    var ahora = Math.floor((opciones.fecha ? opciones.fecha.getTime() : Date.now()) / 1000) - FIT_EPOCA;
    var pasos = [], i;
    rutina.ejercicios.forEach(function (e, k) {
      var cat = CATEGORIA[e.categoria], nombre = IDS.nombres[e.categoria] && IDS.nombres[e.categoria][e.ejercicio];
      var series = Math.max(1, Math.min(99, Math.round(e.series || 3))), reps = Math.max(1, Math.min(999, Math.round(e.reps || 10)));
      var inicio = pasos.length;
      // Serie (repeticiones) y descanso; se repite hasta completar las series
      pasos.push({ nombre: e.nombre, dur: 29, durV: reps, objetivo: 2, objV: 0, intens: 0, cat: cat === undefined ? 0xFFFF : cat, ej: nombre === undefined ? 0xFFFF : nombre, kg: e.kg ? Math.round(e.kg * 100) : 0xFFFF, unidad: e.kg ? 1 : 0xFFFF });
      var ultimo = k === rutina.ejercicios.length - 1;
      pasos.push({ nombre: "Descanso", dur: 0, durV: (k === rutina.ejercicios.length - 1 ? descansoSerie : descansoSerie) * 1000, objetivo: 2, objV: 0, intens: 1, cat: 0xFFFF, ej: 0xFFFF, kg: 0xFFFF, unidad: 0xFFFF });
      pasos.push({ nombre: "Repetir", dur: 6, durV: inicio, objetivo: 2, objV: series, intens: 0, cat: 0xFFFF, ej: 0xFFFF, kg: 0xFFFF, unidad: 0xFFFF });
      // Entre ejercicios, un descanso más largo
      if (!ultimo) pasos.push({ nombre: "Cambio", dur: 0, durV: descansoEj * 1000, objetivo: 2, objV: 0, intens: 1, cat: 0xFFFF, ej: 0xFFFF, kg: 0xFFFF, unidad: 0xFFFF });
    });
    var mFile = new Mensaje(0, 0, [[0, "enum"], [1, "uint16"], [2, "uint16"], [3, "uint32z"], [4, "uint32"]]);
    var mWkt = new Mensaje(26, 1, [[4, "enum"], [6, "uint16"], [8, "string", 32], [11, "enum"]]);
    var mPaso = new Mensaje(27, 2, [[254, "uint16"], [0, "string", 16], [1, "enum"], [2, "uint32"], [3, "enum"], [4, "uint32"], [7, "enum"], [10, "uint16"], [11, "uint16"], [12, "uint16"], [13, "uint16"]]);
    var cuerpo = [];
    cuerpo = cuerpo.concat(mFile.definicion(), mFile.datos([5, 255, 0, 123456, ahora]));
    cuerpo = cuerpo.concat(mWkt.definicion(), mWkt.datos([10, pasos.length, rutina.nombre, 20]));
    cuerpo = cuerpo.concat(mPaso.definicion());
    pasos.forEach(function (p, idx) {
      cuerpo = cuerpo.concat(mPaso.datos([idx, p.nombre, p.dur, p.durV, p.objetivo, p.objV, p.intens, p.cat, p.ej, p.kg, p.unidad]));
    });
    var cab = [14, 0x20].concat(numBytes(21222, 2), numBytes(cuerpo.length, 4), [0x2E, 0x46, 0x49, 0x54]);
    var crcCab = crc16(cab, 0, 12); cab = cab.concat(numBytes(crcCab, 2));
    var todo = cab.concat(cuerpo), crc = crc16(todo, 0, todo.length);
    todo = todo.concat(numBytes(crc, 2));
    return new Uint8Array(todo);
  }

  var api = { construir: construir, crc16: crc16, ids: IDS };
  raiz.GarminFit = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
