// Pruebas del servicio de Google (apps-script/Code.gs) con una hoja simulada.
// Uso: node tests/servicio.test.js
'use strict';
const assert = require('assert');
const { crearServicio, crearHoja } = require('./mockhoja');

let fallas = 0;
function prueba(nombre, fn) {
  try { fn(); console.log('  ok   ', nombre); }
  catch (e) { fallas++; console.log('  FALLA', nombre, '\n        ', e.message.split('\n').join('\n         ')); }
}
const json = (x) => JSON.stringify(x);

// ---------------------------------------------------------------------------
console.log('Instalación y contraseña');
{
  const s = crearServicio();
  const T = s.props.TOKEN;
  s.ctx.setup();
  s.ctx.setup();

  prueba('setup crea las 5 pestañas con sus encabezados', () => {
    assert.deepStrictEqual(Object.keys(s.hojas).sort(), ['comidas', 'ejercicio', 'medidas', 'metas', 'series_gym']);
    assert.strictEqual(json(s.hojas.comidas.filas[0]), json(['id', 'fecha', 'hora', 'tipo_comida', 'descripcion', 'kcal', 'proteina_g', 'carbos_g', 'grasa_g', 'estimado', 'creado_en']));
  });
  prueba('setup se puede repetir sin duplicar las metas', () => assert.strictEqual(s.hojas.metas.getLastRow(), 6));
  prueba('la dirección del servicio responde con su versión', () => {
    assert.strictEqual(JSON.parse(s.ctx.doGet().text).version, 2);
  });
  prueba('sin contraseña, con una incorrecta o con una corta: no autorizado', () => {
    assert.strictEqual(s.post({ accion: 'ping' }).error, 'No autorizado');
    assert.strictEqual(s.post({ token: 'x'.repeat(T.length), accion: 'ping' }).error, 'No autorizado');
    const corto = crearServicio({ props: { TOKEN: 'corta' } });
    assert.strictEqual(corto.post({ token: 'corta', accion: 'ping' }).error, 'No autorizado');
  });
  prueba('ping devuelve la versión y si el chat con API está activo', () => {
    const r = s.post({ token: T, accion: 'ping' });
    assert.ok(r.ok); assert.strictEqual(r.version, 2); assert.strictEqual(r.chat, false);
  });
  prueba('espacios sobrantes en la contraseña guardada o escrita no importan', () => {
    const e = crearServicio({ props: { TOKEN: '  clave-con-espacios-123  \n' } });
    assert.ok(e.post({ token: 'clave-con-espacios-123', accion: 'ping' }).ok);
    assert.ok(e.post({ token: ' clave-con-espacios-123 ', accion: 'ping' }).ok);
  });
}

// ---------------------------------------------------------------------------
console.log('Guardar');
{
  const s = crearServicio();
  const T = s.props.TOKEN;
  s.ctx.setup();
  const agregar = (tabla, fila) => s.post({ token: T, accion: 'agregar', tabla, fila });

  prueba('guarda una comida y la fecha queda como texto (Sheets no la convierte)', () => {
    const r = agregar('comidas', { fecha: '2026-10-09', hora: '08:10', tipo_comida: 'desayuno', descripcion: '3 huevos', kcal: 480, proteina_g: 28, carbos_g: 30, grasa_g: 25, estimado: true });
    assert.ok(r.ok, json(r));
    const fila = s.hojas.comidas.filas[1];
    assert.strictEqual(fila[1], '2026-10-09'); assert.strictEqual(fila[2], '08:10');
  });
  prueba('acepta variantes comunes: Almuerzo, "620,5", "true", 9/10/2026, 8:05', () => {
    const r = agregar('comidas', { fecha: '9/10/2026', hora: '8:05', tipo_comida: ' Almuerzo ', descripcion: 'Pollo', kcal: '620,5', proteina_g: '46', carbos_g: 60, grasa_g: 12, estimado: 'true' });
    assert.ok(r.ok, json(r));
    const fila = s.hojas.comidas.filas[2];
    assert.strictEqual(json(fila.slice(1, 6)), json(['2026-10-09', '08:05', 'almuerzo', 'Pollo', 620.5]));
    assert.strictEqual(fila[9], true);
  });
  prueba('rechaza lo inválido con un mensaje claro', () => {
    assert.ok(/no es válido \(usa: desayuno, almuerzo, cena, snack\)/.test(agregar('comidas', { fecha: '2026-10-09', tipo_comida: 'pizza', descripcion: 'x' }).error));
    assert.ok(/menor que 0/.test(agregar('comidas', { fecha: '2026-10-09', tipo_comida: 'cena', descripcion: 'x', kcal: -5 }).error));
    assert.ok(/Fecha inválida/.test(agregar('comidas', { fecha: 'ayer', tipo_comida: 'cena', descripcion: 'x' }).error));
    assert.strictEqual(agregar('metas', { clave: 'x', valor: 1 }).error, 'Tabla no permitida');
  });
  prueba('ejercicio usa «manual» si no se dice la fuente', () => {
    assert.ok(agregar('ejercicio', { fecha: '2026-10-09', tipo: 'caminata', duracion_min: 40, kcal: 210 }).ok);
    assert.strictEqual(s.hojas.ejercicio.filas[1][5], 'manual');
  });
  prueba('series de gym se guardan', () => {
    assert.ok(agregar('series_gym', { fecha: '2026-10-09', rutina: 'Pecho', ejercicio: 'Press banca', numero_serie: 1, peso_kg: 60, repeticiones: 8 }).ok);
  });
  prueba('medidas: una fila por día, sin borrar lo que ya estaba', () => {
    s.post({ token: T, accion: 'medidas', fila: { fecha: '2026-10-09', peso_kg: 71.8 } });
    const r = s.post({ token: T, accion: 'medidas', fila: { fecha: '2026-10-09', horas_sueno: 7 } });
    assert.strictEqual(r.actualizado, true);
    assert.strictEqual(s.hojas.medidas.getLastRow(), 2);
    assert.strictEqual(json(s.hojas.medidas.filas[1].slice(0, 4)), json(['2026-10-09', 71.8, '', 7]));
    assert.ok(/al menos un dato/.test(s.post({ token: T, accion: 'medidas', fila: { fecha: '2026-10-09' } }).error));
  });
  prueba('borrar quita la fila; borrar dos veces avisa', () => {
    const id = s.hojas.comidas.filas[1][0];
    assert.ok(s.post({ token: T, accion: 'borrar', tabla: 'comidas', id }).ok);
    assert.ok(/No se encontró/.test(s.post({ token: T, accion: 'borrar', tabla: 'comidas', id }).error));
  });
}

// ---------------------------------------------------------------------------
console.log('Leer datos que ya estaban en la hoja (lo que antes no aparecía)');
{
  const s = crearServicio();
  const T = s.props.TOKEN;
  s.ctx.setup();
  const c = s.hojas.comidas.filas;
  // Filas escritas por versiones anteriores o a mano, en formatos que Sheets puede producir:
  c.push(['a', new Date('2026-10-09T00:00:00Z'), new Date(Date.UTC(1899, 11, 30, 13, 30)), 'almuerzo', 'Fecha real', 620, 46, 60, 12, true, '']);
  c.push(['b', 46304, 0.5, 'cena', 'Número de serie', 500, 30, 50, 10, false, '']);
  c.push(['c', '09/10/2026', '19:45', 'snack', 'Día/mes/año', 180, 18, 10, 5, false, '']);
  c.push(['d', '2026-10-09T05:00:00.000Z', '', 'snack', 'Fecha con hora', 100, 5, 10, 5, false, '']);
  c.push(['e', '2026-07-01', '', 'cena', 'Antigua', 700, 40, 60, 20, false, '']);
  s.hojas.medidas.filas.push([new Date('2026-10-09T00:00:00Z'), 71.8, '', '', '']);

  prueba('fecha real, número de serie, 9/10/2026 y fecha con hora se leen como 2026-10-09', () => {
    const r = s.post({ token: T, accion: 'leer' });
    assert.ok(r.ok, json(r));
    const del9 = r.comidas.filter((x) => x.fecha === '2026-10-09').map((x) => x.descripcion);
    assert.deepStrictEqual(del9, ['Fecha real', 'Número de serie', 'Día/mes/año', 'Fecha con hora']);
  });
  prueba('las horas guardadas como hora real o fracción del día se leen como HH:MM', () => {
    const r = s.post({ token: T, accion: 'leer' });
    assert.deepStrictEqual(r.comidas.slice(0, 3).map((x) => x.hora), ['13:30', '12:00', '19:45']);
  });
  prueba('«desde» deja fuera lo anterior, pero las medidas vienen completas', () => {
    const r = s.post({ token: T, accion: 'leer', desde: '2026-09-01' });
    assert.ok(!r.comidas.some((x) => x.descripcion === 'Antigua'));
    assert.strictEqual(r.medidas.length, 1);
    assert.strictEqual(r.medidas[0].fecha, '2026-10-09');
    assert.strictEqual(r.metas.proteina_min_g, 130);
  });
  prueba('guardar medidas de ese día actualiza la fila existente (no duplica)', () => {
    s.post({ token: T, accion: 'medidas', fila: { fecha: '2026-10-09', cintura_cm: 85.5 } });
    assert.strictEqual(s.hojas.medidas.getLastRow(), 2);
  });
  prueba('el resumen del día (para el chat y apps viejas) también los encuentra', () => {
    const d = s.post({ token: T, accion: 'dia', fecha: '2026-10-09' }).datos;
    assert.strictEqual(d.comidas.length, 4);
    assert.strictEqual(d.medida.peso_kg, 71.8);
    assert.strictEqual(d.medida.cintura_cm, 85.5);
  });
  prueba('probar() resume la hoja sin cambiar nada', () => {
    const antes = json(s.hojas.comidas.filas);
    s.ctx.probar();
    assert.strictEqual(json(s.hojas.comidas.filas), antes);
    assert.ok(s.estado.registros.some((l) => /comidas: 5 filas/.test(l)), s.estado.registros.join(' | '));
    assert.ok(s.estado.registros.some((l) => /Versión del servicio: 2/.test(l)));
  });
}

// ---------------------------------------------------------------------------
console.log('Hojas armadas a mano o con versiones viejas');
{
  const s = crearServicio();
  const T = s.props.TOKEN;
  // Pestaña comidas con columnas en otro orden y una columna propia del usuario
  const h = s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('comidas');
  h.filas.push(['fecha', 'descripcion', 'Mis notas', 'kcal', 'tipo_comida', 'id']);
  h.filas.push([new Date('2026-10-08T00:00:00Z'), 'Vieja', 'algo mío', 300, 'desayuno', 'x1']);
  s.ctx.setup();

  prueba('setup no toca las filas existentes ni su formato', () => {
    assert.strictEqual(h.filas[1][2], 'algo mío');
    assert.ok(h.filas[1][0] instanceof Date);
    assert.strictEqual(h.formato['2:1'], undefined);
    assert.strictEqual(h.formato['3:1'], '@');
  });
  prueba('setup agrega al final las columnas que faltan', () => {
    assert.deepStrictEqual(h.filas[0].slice(0, 6), ['fecha', 'descripcion', 'Mis notas', 'kcal', 'tipo_comida', 'id']);
    assert.ok(h.filas[0].includes('proteina_g') && h.filas[0].includes('creado_en'));
  });
  prueba('guarda en la columna correcta aunque el orden sea otro', () => {
    assert.ok(s.post({ token: T, accion: 'agregar', tabla: 'comidas', fila: { fecha: '2026-10-09', tipo_comida: 'cena', descripcion: 'Nueva', kcal: 500 } }).ok);
    const enc = h.filas[0], fila = h.filas[2];
    assert.strictEqual(fila[enc.indexOf('descripcion')], 'Nueva');
    assert.strictEqual(fila[enc.indexOf('fecha')], '2026-10-09');
    assert.strictEqual(fila[enc.indexOf('Mis notas')], '');
  });
  prueba('lee bien las dos filas', () => {
    const r = s.post({ token: T, accion: 'leer' });
    assert.deepStrictEqual(r.comidas.map((x) => [x.fecha, x.descripcion]), [['2026-10-08', 'Vieja'], ['2026-10-09', 'Nueva']]);
  });
  prueba('si falta una pestaña, el mensaje dice qué hacer', () => {
    delete s.hojas.series_gym;
    assert.ok(/ejecuta la función setup/.test(s.post({ token: T, accion: 'leer' }).error));
  });
}

// ---------------------------------------------------------------------------
console.log('Chat opcional con API');
{
  const s = crearServicio();
  const T = s.props.TOKEN;
  s.ctx.setup();
  const respuesta = (codigo, obj) => () => ({ getResponseCode: () => codigo, getContentText: () => JSON.stringify(obj) });
  const pedido = (extra) => Object.assign({ token: T, accion: 'chat', texto: 'desayuno 3 huevos', hoy: '2026-10-09', hora: '08:05', historial: [] }, extra || {});

  prueba('sin ANTHROPIC_API_KEY no llama a la API', () => {
    assert.ok(/ANTHROPIC_API_KEY/.test(s.post(pedido()).error));
    assert.strictEqual(s.llamadasApi.length, 0);
  });
  s.props.ANTHROPIC_API_KEY = 'sk-ant-prueba';
  s.estado.respuestaApi = respuesta(200, { stop_reason: 'tool_use', content: [
    { type: 'text', text: 'Anotado.' },
    { type: 'tool_use', name: 'registrar_comida', input: { tipo_comida: 'desayuno', descripcion: '3 huevos', kcal: 480, proteina_g: 28, carbos_g: 35, grasa_g: 24, estimado: true } },
    { type: 'tool_use', name: 'registrar_medidas', input: { peso_kg: 72.4 } },
    { type: 'tool_use', name: 'registrar_serie_gym', input: { rutina: 'Pecho', ejercicio: 'Press banca', numero_serie: 1, peso_kg: 60, repeticiones: 8 } },
    { type: 'tool_use', name: 'registrar_comida', input: { tipo_comida: 'pizza', descripcion: 'x', kcal: 1, proteina_g: 1, carbos_g: 1, grasa_g: 1, estimado: true } }
  ] });
  prueba('guarda lo válido, avisa lo inválido y da los totales del día', () => {
    const r = s.post(pedido({ historial: [{ rol: 'assistant', texto: 'hola' }, { rol: 'user', texto: 'a' }, { rol: 'assistant', texto: 'b' }] }));
    assert.ok(r.ok, json(r));
    assert.strictEqual(r.guardados.length, 3);
    assert.ok(r.respuesta.includes('No guardé comida'));
    assert.ok(r.respuesta.includes('Hoy llevas 480 kcal y 28 g de proteína'), r.respuesta);
  });
  prueba('lo que se envía a Claude: modelo, clave en cabecera, historial que alterna', () => {
    const q = s.llamadasApi[s.llamadasApi.length - 1];
    const body = JSON.parse(q.opt.payload);
    assert.strictEqual(q.opt.headers['x-api-key'], 'sk-ant-prueba');
    assert.strictEqual(body.model, 'claude-opus-5-5');
    assert.strictEqual(body.fallbacks, 'default');
    assert.deepStrictEqual(body.messages.map((m) => m.role), ['user', 'assistant', 'user']);
    assert.ok(body.system.includes('proteína de 130 a 160 g al día'));
    assert.ok(!JSON.stringify(body).includes('sk-ant'));
  });
  prueba('un error de la API no muestra la clave', () => {
    s.estado.respuestaApi = respuesta(401, { error: { message: 'invalid x-api-key' } });
    const r = s.post(pedido());
    assert.ok(r.error.includes('401') && !r.error.includes('sk-ant'));
  });
}

console.log(fallas ? '\n' + fallas + ' prueba(s) fallaron' : '\nTodas las pruebas del servicio pasaron');
process.exit(fallas ? 1 : 0);
