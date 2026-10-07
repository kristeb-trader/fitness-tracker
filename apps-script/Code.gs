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
      case 'chat': return salida(chat(pedido));
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
    chat: !!claveApi(),
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

// ---------- Chat: Claude estima y guarda lo que escribes ----------
// Requiere la propiedad ANTHROPIC_API_KEY (opcional: MODELO). Nunca va en el repositorio.

var API_URL = 'https://api.anthropic.com/v1/messages';
var MODELO_POR_DEFECTO = 'claude-opus-5-5';

function claveApi() { return PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || ''; }

var NUM = { type: 'number' };
var HERRAMIENTAS = [
  {
    name: 'registrar_comida',
    description: 'Guarda UNA comida (todo lo de un mismo desayuno, almuerzo, cena o snack en un solo registro, con los totales).',
    input_schema: {
      type: 'object', additionalProperties: false,
      properties: {
        fecha: { type: 'string', description: 'AAAA-MM-DD. Si no se dice, usa la fecha de hoy.' },
        hora: { type: 'string', description: 'HH:MM. Si no se dice, usa la hora actual.' },
        tipo_comida: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena', 'snack'] },
        descripcion: { type: 'string', description: 'Qué comió, corto, con las cantidades.' },
        kcal: NUM, proteina_g: NUM, carbos_g: NUM, grasa_g: NUM,
        estimado: { type: 'boolean', description: 'true si los valores son una estimación; false solo si vienen de etiqueta o pesos exactos.' }
      },
      required: ['tipo_comida', 'descripcion', 'kcal', 'proteina_g', 'carbos_g', 'grasa_g', 'estimado']
    }
  },
  {
    name: 'registrar_medidas',
    description: 'Guarda peso en ayunas, cintura y/o horas de sueño de un día. Incluye solo los datos que el usuario dio.',
    input_schema: {
      type: 'object', additionalProperties: false,
      properties: { fecha: { type: 'string' }, peso_kg: NUM, cintura_cm: NUM, horas_sueno: NUM }
    }
  },
  {
    name: 'registrar_ejercicio',
    description: 'Guarda una sesión de ejercicio.',
    input_schema: {
      type: 'object', additionalProperties: false,
      properties: {
        fecha: { type: 'string' },
        tipo: { type: 'string', enum: ['gym', 'bici', 'caminata'] },
        duracion_min: NUM, kcal: NUM,
        fuente: { type: 'string', enum: ['manual', 'estimado', 'strava'], description: 'estimado si las kcal las calculas tú.' },
        notas: { type: 'string' }
      },
      required: ['tipo']
    }
  },
  {
    name: 'registrar_serie_gym',
    description: 'Guarda UNA serie de gym. Si dice "4 series de 8 con 60 kg", llama a esta herramienta 4 veces (numero_serie 1 a 4).',
    input_schema: {
      type: 'object', additionalProperties: false,
      properties: {
        fecha: { type: 'string' }, rutina: { type: 'string' }, ejercicio: { type: 'string' },
        numero_serie: NUM, peso_kg: NUM, repeticiones: NUM
      },
      required: ['rutina', 'ejercicio', 'numero_serie', 'peso_kg', 'repeticiones']
    }
  }
];

function promptSistema(hoy, hora) {
  return [
    'Eres el asistente de seguimiento personal de un hombre de 41 años (1,72 m, unos 72 kg) que busca ganar masa muscular y reducir grasa abdominal.',
    'Tu trabajo: leer lo que escribe y GUARDAR los datos con las herramientas. Responde siempre en español, breve y claro; unidades kg, cm y kcal.',
    'Fecha de hoy: ' + hoy + '. Hora actual: ' + hora + '. Si dice "ayer", "anoche" o un día, calcula la fecha.',
    'Comidas: estima kcal, proteína, carbos y grasa con porciones típicas. estimado=true salvo que dé etiqueta o pesos exactos. Una comida con varios alimentos es UN registro con los totales.',
    'Antes de guardar, revisa que las cantidades sean plausibles. Si algo es ambiguo o raro (por ejemplo 5.000 kcal en un snack, o no se entiende el alimento), NO guardes: haz una sola pregunta corta.',
    'No inventes datos que no dijo (no pongas peso si no lo dio). Si el mensaje no trae nada que registrar, contesta con una frase corta y no llames herramientas.',
    'Después de llamar las herramientas puedes añadir una frase corta; el sistema ya muestra lo guardado y los totales del día.'
  ].join('\n');
}

function aRegistro(nombre, a, pedido) {
  var f = a.fecha && /^\d{4}-\d{2}-\d{2}$/.test(a.fecha) ? a.fecha : pedido.hoy;
  var copia = {};
  Object.keys(a).forEach(function (k) { copia[k] = a[k]; });
  copia.fecha = f;
  return copia;
}

function ejecutarHerramienta(nombre, a, pedido) {
  var r, f;
  if (nombre === 'registrar_comida') {
    f = aRegistro(nombre, a, pedido);
    if (!f.hora) f.hora = pedido.hora;
    r = conBloqueo(function () { return agregar('comidas', f); });
    return { tabla: 'comidas', id: r.id, fecha: f.fecha, texto: cap(f.tipo_comida) + ': ' + f.descripcion + ' · ' + redond(f.kcal) + ' kcal · ' + redond(f.proteina_g) + ' g proteína' + (f.estimado ? ' (estimado)' : '') };
  }
  if (nombre === 'registrar_medidas') {
    f = aRegistro(nombre, a, pedido);
    conBloqueo(function () { return guardarMedidas(f); });
    var partes = [];
    if (f.peso_kg != null) partes.push(f.peso_kg + ' kg');
    if (f.cintura_cm != null) partes.push('cintura ' + f.cintura_cm + ' cm');
    if (f.horas_sueno != null) partes.push(f.horas_sueno + ' h de sueño');
    return { tabla: 'medidas', id: null, fecha: f.fecha, texto: 'Medidas: ' + partes.join(' · ') };
  }
  if (nombre === 'registrar_ejercicio') {
    f = aRegistro(nombre, a, pedido);
    if (!f.fuente) f.fuente = 'manual';
    r = conBloqueo(function () { return agregar('ejercicio', f); });
    return { tabla: 'ejercicio', id: r.id, fecha: f.fecha, texto: cap(f.tipo) + (f.duracion_min ? ' · ' + f.duracion_min + ' min' : '') + (f.kcal != null ? ' · ' + redond(f.kcal) + ' kcal' : '') };
  }
  if (nombre === 'registrar_serie_gym') {
    f = aRegistro(nombre, a, pedido);
    r = conBloqueo(function () { return agregar('series_gym', f); });
    return { tabla: 'series_gym', id: r.id, fecha: f.fecha, texto: f.ejercicio + ' · serie ' + f.numero_serie + ': ' + f.peso_kg + ' kg × ' + f.repeticiones };
  }
  throw new Error('Herramienta desconocida');
}

function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function redond(n) { return n == null ? '?' : Math.round(Number(n) * 10) / 10; }

function llamarClaude(pedido, mensajes) {
  var cuerpo = {
    model: PropertiesService.getScriptProperties().getProperty('MODELO') || MODELO_POR_DEFECTO,
    max_tokens: 2048,
    system: promptSistema(pedido.hoy, pedido.hora),
    messages: mensajes,
    tools: HERRAMIENTAS,
    output_config: { effort: 'low' },
    fallbacks: 'default'
  };
  var resp = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': claveApi(), 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify(cuerpo)
  });
  var codigo = resp.getResponseCode();
  var json;
  try { json = JSON.parse(resp.getContentText()); } catch (e) { json = {}; }
  if (codigo !== 200) {
    var detalle = json && json.error && json.error.message ? ': ' + String(json.error.message).slice(0, 200) : '';
    throw new Error('El chat no pudo responder (código ' + codigo + ')' + detalle);
  }
  return json;
}

function chat(pedido) {
  if (!claveApi()) throw new Error('El chat no está activado: falta la propiedad ANTHROPIC_API_KEY.');
  var texto = String(pedido.texto || '').trim().slice(0, 1000);
  if (!texto) throw new Error('Escribe un mensaje.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedido.hoy || '')) throw new Error('Fecha inválida');
  if (!/^\d{2}:\d{2}$/.test(pedido.hora || '')) pedido.hora = '12:00';

  var mensajes = [];
  (Array.isArray(pedido.historial) ? pedido.historial.slice(-8) : []).forEach(function (m) {
    if (m && (m.rol === 'user' || m.rol === 'assistant') && typeof m.texto === 'string' && m.texto) {
      mensajes.push({ role: m.rol, content: m.texto.slice(0, 1000) });
    }
  });
  // la API exige que empiece con "user" y alterne
  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  var limpio = [];
  mensajes.forEach(function (m) {
    if (limpio.length && limpio[limpio.length - 1].role === m.role) limpio[limpio.length - 1].content += '\n' + m.content;
    else limpio.push(m);
  });
  if (limpio.length && limpio[limpio.length - 1].role === 'user') limpio.pop();
  limpio.push({ role: 'user', content: texto });

  var r = llamarClaude(pedido, limpio);
  if (r.stop_reason === 'refusal') return { ok: true, respuesta: 'No pude procesar ese mensaje. Prueba escribiéndolo de otra forma.', guardados: [] };

  var textos = [], guardados = [], fallos = [], fechas = {};
  (r.content || []).forEach(function (b) {
    if (b.type === 'text' && b.text) textos.push(b.text.trim());
    if (b.type === 'tool_use') {
      try {
        var g = ejecutarHerramienta(b.name, b.input || {}, pedido);
        guardados.push({ tabla: g.tabla, id: g.id, texto: g.texto });
        if (g.tabla === 'comidas') fechas[g.fecha] = true;
      } catch (e) {
        fallos.push('No guardé ' + b.name.replace('registrar_', '').replace('_', ' ') + ': ' + e.message);
      }
    }
  });

  var partes = [];
  if (guardados.length) partes.push('Guardé:\n' + guardados.map(function (g) { return '• ' + g.texto; }).join('\n'));
  fallos.forEach(function (f) { partes.push(f); });
  Object.keys(fechas).forEach(function (f) { partes.push(totalesDelDia(f, f === pedido.hoy)); });
  if (textos.length) partes.push(textos.join('\n'));
  if (!partes.length) partes.push('No entendí qué registrar. ¿Puedes darme más detalle?');
  return { ok: true, respuesta: partes.join('\n\n'), guardados: guardados };
}

function totalesDelDia(fecha, esHoy) {
  var d = dia(fecha), kcal = 0, prot = 0;
  d.comidas.forEach(function (c) { kcal += Number(c.kcal) || 0; prot += Number(c.proteina_g) || 0; });
  var m = d.metas, pmin = m.proteina_min_g != null ? m.proteina_min_g : 130;
  var extra = 0;
  d.ejercicio.forEach(function (e) { extra += Number(e.kcal) || 0; });
  var base = m.kcal_base != null ? m.kcal_base : 2500;
  var def = ((m.deficit_min_kcal != null ? m.deficit_min_kcal : 200) + (m.deficit_max_kcal != null ? m.deficit_max_kcal : 300)) / 2;
  var meta = base + extra - def, quedan = Math.round(meta - kcal);
  return (esHoy ? 'Hoy' : 'Ese día') + ' llevas ' + Math.round(kcal) + ' kcal y ' + Math.round(prot) + ' g de proteína. ' +
    (quedan >= 0 ? 'Te quedan ' + quedan + ' kcal' : 'Te pasaste ' + (-quedan) + ' kcal') +
    (prot >= pmin ? ' y ya llegaste a tu meta de proteína.' : ' y te faltan ' + Math.round(pmin - prot) + ' g de proteína para la meta de ' + pmin + ' g.');
}
