/**
 * Mi seguimiento: servicio que conecta la app con tu hoja de Google.
 * Se pega UNA vez en la hoja: Extensiones > Apps Script.
 *
 * Seguridad: toda petición debe traer la contraseña guardada en
 * Configuración del proyecto > Propiedades de la secuencia de comandos > TOKEN.
 * La contraseña NO está en este archivo ni en el repositorio.
 */

var TABLAS = {
  comidas: [
    { c: 'id', t: 'id' },
    { c: 'fecha', t: 'fecha', req: true },
    { c: 'hora', t: 'hora' },
    { c: 'tipo_comida', t: 'texto', req: true, op: ['desayuno', 'almuerzo', 'cena', 'snack'] },
    { c: 'descripcion', t: 'texto', req: true },
    { c: 'kcal', t: 'num', min: 0, max: 10000 },
    { c: 'proteina_g', t: 'num', min: 0, max: 1000 },
    { c: 'carbos_g', t: 'num', min: 0, max: 1500 },
    { c: 'grasa_g', t: 'num', min: 0, max: 1000 },
    { c: 'estimado', t: 'bool' },
    { c: 'creado_en', t: 'ts' }
  ],
  ejercicio: [
    { c: 'id', t: 'id' },
    { c: 'fecha', t: 'fecha', req: true },
    { c: 'tipo', t: 'texto', req: true, op: ['gym', 'bici', 'caminata'] },
    { c: 'duracion_min', t: 'num', min: 1, max: 1440 },
    { c: 'kcal', t: 'num', min: 0, max: 10000 },
    { c: 'fuente', t: 'texto', op: ['strava', 'manual', 'estimado'], def: 'manual' },
    { c: 'strava_id', t: 'texto' },
    { c: 'notas', t: 'texto' },
    { c: 'creado_en', t: 'ts' }
  ],
  series_gym: [
    { c: 'id', t: 'id' },
    { c: 'fecha', t: 'fecha', req: true },
    { c: 'rutina', t: 'texto', req: true },
    { c: 'ejercicio', t: 'texto', req: true },
    { c: 'numero_serie', t: 'num', req: true, min: 1, max: 100, ent: true },
    { c: 'peso_kg', t: 'num', req: true, min: 0, max: 1000 },
    { c: 'repeticiones', t: 'num', req: true, min: 1, max: 1000, ent: true },
    { c: 'creado_en', t: 'ts' }
  ],
  medidas: [
    { c: 'fecha', t: 'fecha', req: true },
    { c: 'peso_kg', t: 'num', min: 20, max: 400 },
    { c: 'cintura_cm', t: 'num', min: 20, max: 300 },
    { c: 'horas_sueno', t: 'num', min: 0, max: 24 },
    { c: 'creado_en', t: 'ts' }
  ],
  metas: [
    { c: 'clave', t: 'texto', req: true },
    { c: 'valor', t: 'num', req: true }
  ]
};

var METAS_INICIALES = [
  ['proteina_min_g', 130],
  ['proteina_max_g', 160],
  ['kcal_base', 2500],
  ['deficit_min_kcal', 200],
  ['deficit_max_kcal', 300]
];

/** Ejecútala UNA vez desde el editor: crea las pestañas y las metas iniciales. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLAS).forEach(function (nombre) {
    var cols = TABLAS[nombre].map(function (k) { return k.c; });
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    TABLAS[nombre].forEach(function (k, i) {
      // fecha y hora como texto, para que Sheets no las convierta en fechas raras
      if (k.t === 'fecha' || k.t === 'hora' || k.t === 'id') hoja.getRange(2, i + 1, 2000, 1).setNumberFormat('@');
    });
  });
  var metas = ss.getSheetByName('metas');
  if (metas.getLastRow() < 2) {
    metas.getRange(2, 1, METAS_INICIALES.length, 2).setValues(METAS_INICIALES);
  }
  var vacia = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (vacia && vacia.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(vacia);
}

function doGet() {
  return salida({ ok: true, servicio: 'mi-seguimiento' });
}

function doPost(e) {
  try {
    var pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!tokenValido(pedido.token)) return salida({ ok: false, error: 'No autorizado' });
    switch (pedido.accion) {
      case 'ping': return salida({ ok: true });
      case 'dia': return salida({ ok: true, datos: dia(pedido.fecha) });
      case 'agregar': return salida(conBloqueo(function () { return agregar(pedido.tabla, pedido.fila); }));
      case 'medidas': return salida(conBloqueo(function () { return guardarMedidas(pedido.fila); }));
      case 'borrar': return salida(conBloqueo(function () { return borrar(pedido.tabla, pedido.id); }));
      default: return salida({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return salida({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------- utilidades ----------

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tokenValido(recibido) {
  var real = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!real || real.length < 16 || typeof recibido !== 'string' || recibido.length !== real.length) return false;
  var diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ recibido.charCodeAt(i);
  return diff === 0;
}

function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function hoja(nombre) {
  var h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!h) throw new Error('Falta la pestaña "' + nombre + '". Ejecuta setup().');
  return h;
}

function leer(nombre) {
  var valores = hoja(nombre).getDataRange().getValues();
  var cols = valores[0];
  return valores.slice(1)
    .filter(function (f) { return f.some(function (v) { return v !== ''; }); })
    .map(function (f) {
      var o = {};
      cols.forEach(function (c, i) { o[c] = f[i] === '' ? null : f[i]; });
      return o;
    });
}

function ahora() { return new Date().toISOString(); }

/** Valida una fila contra el esquema y devuelve el objeto limpio. */
function validar(nombre, fila) {
  if (!fila || typeof fila !== 'object') throw new Error('Datos vacíos');
  var out = {};
  TABLAS[nombre].forEach(function (k) {
    var v = fila[k.c];
    if (k.t === 'id') { out[k.c] = Utilities.getUuid(); return; }
    if (k.t === 'ts') { out[k.c] = ahora(); return; }
    if (v === undefined || v === null || v === '') {
      if (k.req) throw new Error('Falta ' + k.c);
      out[k.c] = k.t === 'bool' ? false : (k.def !== undefined ? k.def : null);
      return;
    }
    if (k.t === 'fecha') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Fecha inválida');
    } else if (k.t === 'hora') {
      if (!/^\d{2}:\d{2}$/.test(v)) throw new Error('Hora inválida');
    } else if (k.t === 'num') {
      v = Number(v);
      if (!isFinite(v)) throw new Error(k.c + ' debe ser un número');
      if (k.min !== undefined && v < k.min) throw new Error(k.c + ' es menor que ' + k.min);
      if (k.max !== undefined && v > k.max) throw new Error(k.c + ' es mayor que ' + k.max);
      if (k.ent && Math.floor(v) !== v) throw new Error(k.c + ' debe ser entero');
    } else if (k.t === 'bool') {
      v = v === true;
    } else {
      v = String(v).slice(0, 500);
      if (k.op && k.op.indexOf(v) < 0) throw new Error(k.c + ' no es válido');
    }
    out[k.c] = v;
  });
  return out;
}

function fila(nombre, obj) {
  return TABLAS[nombre].map(function (k) { return obj[k.c] === null ? '' : obj[k.c]; });
}

// ---------- acciones ----------

function agregar(nombre, datos) {
  if (nombre !== 'comidas' && nombre !== 'ejercicio' && nombre !== 'series_gym') throw new Error('Tabla no permitida');
  var obj = validar(nombre, datos);
  hoja(nombre).appendRow(fila(nombre, obj));
  return { ok: true, id: obj.id };
}

/** Una fila por día. Solo actualiza los campos que vienen llenos. */
function guardarMedidas(datos) {
  var obj = validar('medidas', datos);
  if (obj.peso_kg === null && obj.cintura_cm === null && obj.horas_sueno === null) throw new Error('Escribe al menos un dato');
  var h = hoja('medidas');
  var valores = h.getDataRange().getValues();
  var cols = valores[0];
  var idx = {};
  cols.forEach(function (c, i) { idx[c] = i; });
  for (var r = 1; r < valores.length; r++) {
    if (String(valores[r][idx.fecha]) === obj.fecha) {
      ['peso_kg', 'cintura_cm', 'horas_sueno'].forEach(function (c) {
        if (obj[c] !== null) h.getRange(r + 1, idx[c] + 1).setValue(obj[c]);
      });
      return { ok: true, actualizado: true };
    }
  }
  h.appendRow(fila('medidas', obj));
  return { ok: true, actualizado: false };
}

function borrar(nombre, id) {
  if (nombre !== 'comidas' && nombre !== 'ejercicio' && nombre !== 'series_gym') throw new Error('Tabla no permitida');
  var h = hoja(nombre);
  var valores = h.getDataRange().getValues();
  var ci = valores[0].indexOf('id');
  for (var r = 1; r < valores.length; r++) {
    if (String(valores[r][ci]) === String(id)) { h.deleteRow(r + 1); return { ok: true }; }
  }
  throw new Error('No se encontró el registro');
}

/** Todo lo que necesita la pantalla "Hoy" en una sola llamada. */
function dia(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw new Error('Fecha inválida');
  var metas = {};
  leer('metas').forEach(function (m) { metas[m.clave] = m.valor; });
  var medidas = leer('medidas').sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  var hastaHoy = medidas.filter(function (m) { return m.fecha <= fecha; });
  var mismoDia = medidas.filter(function (m) { return m.fecha === fecha; })[0] || null;
  var conPeso = hastaHoy.filter(function (m) { return m.peso_kg !== null; });
  var conCintura = hastaHoy.filter(function (m) { return m.cintura_cm !== null; });
  return {
    metas: metas,
    comidas: leer('comidas').filter(function (c) { return c.fecha === fecha; })
      .sort(function (a, b) { return String(a.hora || '') < String(b.hora || '') ? -1 : 1; }),
    ejercicio: leer('ejercicio').filter(function (e) { return e.fecha === fecha; }),
    medida: mismoDia,
    ultimoPeso: conPeso.length ? conPeso[conPeso.length - 1] : null,
    ultimaCintura: conCintura.length ? conCintura[conCintura.length - 1] : null,
    pesos: conPeso.slice(-7).map(function (m) { return { fecha: m.fecha, peso_kg: m.peso_kg }; })
  };
}
