// Prueba de extremo a extremo: la app real en un navegador con tamaño de celular,
// hablando con apps-script/Code.gs sobre una hoja simulada.
// Uso: node tests/app.e2e.js   (necesita el paquete «playwright» y Chromium)
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');
const { crearServicio } = require('./mockhoja');

const RAIZ = path.join(__dirname, '..');
const CAPTURAS = process.env.CAPTURAS || '';
const URL_A = 'https://script.google.com/macros/s/PRUEBA_A/exec';
const URL_B = 'https://script.google.com/macros/s/PRUEBA_B/exec';

const dos = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
const hoy = isoLocal(new Date());
const ayer = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return isoLocal(d); })();
const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return isoLocal(d); })();
const serieDe = (f) => (Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5;

function servidorEstatico(configJs) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    if (p === '/config.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(configJs); }
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    res.setHeader('Content-Type', tipos[path.extname(f)] || 'text/plain');
    res.end(fs.readFileSync(f));
  });
}

async function abrir(configJs, servicios) {
  const servidor = servidorEstatico(configJs);
  await new Promise((r) => servidor.listen(0, r));
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-ES', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await contexto.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errores.push('console: ' + m.text()); });
  const llamadas = [];
  const control = { fallo: null };
  await page.route('https://script.google.com/**', async (route) => {
    const url = route.request().url();
    const servicio = servicios[url];
    const cuerpo = route.request().postData() || '{}';
    llamadas.push({ url, accion: JSON.parse(cuerpo).accion });
    if (control.retraso) await new Promise((r) => setTimeout(r, control.retraso));
    if (control.rechazar && cuerpo.includes(control.rechazar)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'tipo_comida no es válido (usa: desayuno, almuerzo, cena, snack)' }) });
    if (control.fallo === 'red') return route.abort('failed');
    if (control.fallo === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Sorry, unable to open the file at this time.</html>' });
    if (!servicio) return route.fulfill({ status: 404, contentType: 'text/html', body: 'no existe' });
    const out = servicio.ctx.doPost({ postData: { contents: cuerpo } }).text;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  // Fotos de ejercicios: imagen mínima, sin salir a internet
  await page.route('https://raw.githubusercontent.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') }));
  // Lista de ejercicios de la biblioteca de fotos (mínima, de prueba)
  await page.route('https://raw.githubusercontent.com/**/dist/exercises.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { id: 'Ab_Crunch_Machine', name: 'Ab Crunch Machine', equipment: 'machine', primaryMuscles: ['abdominals'], secondaryMuscles: [], images: ['Ab_Crunch_Machine/0.jpg', 'Ab_Crunch_Machine/1.jpg'] },
    { id: 'Crunches', name: 'Crunches', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: [], images: ['Crunches/0.jpg', 'Crunches/1.jpg'] },
    { id: 'Butterfly', name: 'Butterfly', equipment: 'machine', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'], images: ['Butterfly/0.jpg', 'Butterfly/1.jpg'] }
  ]) }));
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  const base = 'http://localhost:' + servidor.address().port + '/';
  const cerrar = async () => { await navegador.close(); servidor.close(); };
  return { page, base, errores, llamadas, control, cerrar };
}

async function entrar(page, token) {
  await page.waitForSelector('#tok');
  await page.fill('#tok', token);
  await page.click('text=Entrar');
}

let fallas = 0;
async function prueba(nombre, fn) {
  try { await fn(); console.log('  ok   ', nombre); }
  catch (e) { fallas++; console.log('  FALLA', nombre, '\n        ', String(e.message).split('\n').slice(0, 6).join('\n         ')); }
}
const captura = async (page, nombre) => { if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, nombre + '.png') }); };

(async () => {
  // =========================================================================
  console.log('Servicio nuevo con datos en formatos raros (lo que antes no se veía)');
  {
    const s = crearServicio();
    s.ctx.setup();
    const T = s.props.TOKEN;
    // Filas de hoy guardadas como Sheets las deja a veces: fecha real y número de serie
    s.hojas.comidas.filas.push(['v1', new Date(hoy + 'T00:00:00Z'), '', 'almuerzo', 'Pollo con arroz', 620, 46, 60, 12, true, '']);
    s.hojas.comidas.filas.push(['v2', serieDe(hoy), '', 'snack', 'Yogur griego', 180, 18, 10, 5, true, '']);
    s.hojas.series_gym.filas.push(['g1', hoy, 'Pecho', 'Press banca', 1, 60, 8, '']);
    s.hojas.series_gym.filas.push(['g2', hoy, 'Pecho', 'Press banca', 2, 60, 7, '']);
    s.hojas.medidas.filas.push([new Date(ayer + 'T00:00:00Z'), 72.1, 86, 7, '']);

    const { page, base, errores, llamadas, control, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);

    await prueba('contraseña incorrecta: lo dice claramente', async () => {
      await entrar(page, 'otra-contraseña-cualquiera-xx');
      await page.waitForSelector('text=La contraseña no es correcta.');
    });
    await prueba('fallo de red y página de error de Google: mensajes distintos con detalle', async () => {
      control.fallo = 'html';
      await page.fill('#tok', T); await page.click('text=Entrar');
      await page.waitForFunction(() => document.querySelector('.entrada .error').textContent.includes('no es de la app'));
      control.fallo = 'red';
      await page.click('text=Entrar');
      await page.waitForFunction(() => document.querySelector('.entrada .error').textContent.includes('No se pudo conectar'));
      control.fallo = null;
    });
    await prueba('entra y muestra las comidas de hoy aunque Sheets cambió el formato de la fecha', async () => {
      await page.click('text=Entrar');
      await page.waitForSelector('.hero');
      const textos = await page.locator('.plato .desc').allInnerTexts();
      assert.deepStrictEqual(textos.sort(), ['Pollo con arroz', 'Yogur griego']);
      const hero = await page.innerText('.hero');
      assert.ok(/Consumido\s+800 kcal/.test(hero) && /Gastado\s+2.500 kcal/.test(hero) && hero.includes('−1.700 kcal'), hero);
      const mac = await page.innerText('.macros');
      assert.ok(mac.includes('64 g') && mac.includes('meta 130'), mac);
    });
    await prueba('no aparece el aviso de servicio desactualizado', async () => {
      assert.strictEqual(await page.locator('.banda').count(), 0);
    });
    await prueba('muestra la sección Gym con las series del día', async () => {
      const gym = await page.innerText('.lista:has(.item:has-text("Press banca"))');
      assert.ok(gym.includes('Press banca · 2 series') && gym.includes('60 kg × 8'), gym);
      await captura(page, 'hoy');
    });
    await prueba('Hoy no muestra el peso: el peso y la cintura están en Cuerpo', async () => {
      assert.ok(!(await page.innerText('.app')).includes('72,1'));
      await page.click('.nav [aria-label="Cuerpo"]');
      await page.waitForSelector('.hero-cuerpo');
      assert.ok((await page.innerText('.graf:has(h3:text-is("Peso"))')).includes('72,1'));
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.hero');
    });
    await prueba('cambiar de día y de semana no vuelve a pedir datos a Google', async () => {
      const antes = llamadas.length;
      await page.click('[aria-label="Semana anterior"]');
      await page.waitForSelector('.vacio');
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.plato');
      assert.strictEqual(llamadas.length, antes);
    });
    await prueba('al volver a abrir: se ve al instante con lo guardado y se actualiza con UNA sola consulta', async () => {
      control.retraso = 2500; // Google lento
      const antes = llamadas.length;
      const t0 = Date.now();
      await page.reload();
      await page.waitForSelector('.plato', { timeout: 1500 });
      assert.ok(Date.now() - t0 < 2000, 'se mostró antes de que Google respondiera');
      assert.ok(await page.locator('.app.actualizando').count() === 1, 'muestra la barrita de actualización');
      await page.waitForSelector('.app:not(.actualizando)', { timeout: 6000 });
      control.retraso = 0;
      const nuevas = llamadas.slice(antes).map((l) => l.accion);
      assert.deepStrictEqual(nuevas, ['leer']);
    });
    await prueba('sin internet al abrir: muestra lo guardado y avisa', async () => {
      control.fallo = 'red';
      await page.reload();
      await page.waitForSelector('.plato');
      await page.waitForSelector('text=Sin conexión con Google');
      control.fallo = null;
    });
    await prueba('Pegar: sin fecha usa el día abierto; acepta «Almuerzo»; rechaza fechas futuras y tablas raras', async () => {
      await page.click('.fab');
      await page.waitForSelector('dialog button:has-text("Revisar")');
      await page.click('dialog button:has-text("Copiar instrucciones para Claude")');
      const instr = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(instr.includes('NO pongas el campo «fecha»') && !instr.includes('"fecha":"20'), 'instrucciones sin fechas fijas');
      assert.ok(instr.includes('proteína de 130 a 160 g al día'));
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', 'Listo:\n```json\n[{"tabla":"comidas","tipo_comida":"Cena","descripcion":"Salmón con papas","kcal":650,"proteina_g":40,"carbos_g":45,"grasa_g":28,"estimado":true},\n {"tabla":"Gym","rutina":"Pecho","ejercicio":"Aperturas","numero_serie":1,"peso_kg":"14","repeticiones":12},\n {"tabla":"comidas","fecha":"' + manana + '","tipo_comida":"cena","descripcion":"Futura","kcal":1,"proteina_g":1,"carbos_g":1,"grasa_g":1},\n {"tabla":"usuarios","x":1}]\n```');
      await page.click('dialog button:has-text("Revisar")');
      await page.waitForSelector('dialog button:has-text("Guardar 2 registros")');
      const vista = await page.innerText('dialog .lista');
      assert.ok(vista.includes('(fecha futura)') && vista.includes('Registro no reconocido'), vista);
      await page.click('dialog button:has-text("Guardar 2 registros")');
      await page.waitForSelector('.plato .desc:has-text("Salmón con papas")');
      assert.ok((await page.innerText('.lista:has(.item:has-text("Aperturas"))')).includes('14 kg × 12'));
    });
    await prueba('Pegar con fecha de ayer en otro formato (9/10/2026): guarda ahí y te lleva a ese día', async () => {
      const [a, m, d] = ayer.split('-');
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', '[{"tabla":"comidas","fecha":"' + d + '/' + m + '/' + a + '","tipo_comida":"desayuno","descripcion":"Avena de ayer","kcal":350,"proteina_g":15,"carbos_g":55,"grasa_g":8}]');
      await page.click('dialog button:has-text("Revisar")');
      await page.click('dialog button:has-text("Guardar 1 registro")');
      await page.waitForSelector('.plato .desc:has-text("Avena de ayer")');
      assert.ok((await page.innerText('.titulo')).startsWith('Resumen del '));
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.plato .desc:has-text("Salmón con papas")');
    });
    await prueba('Pegar 40 registros anteriores: botón verde arriba, muestra avance y no repite si pegas lo mismo otra vez', async () => {
      const dia = (n) => new Date(Date.parse(hoy + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
      const lote = [];
      for (let i = 1; i <= 20; i++) {
        lote.push({ tabla: 'comidas', fecha: dia(i + 1), tipo_comida: 'almuerzo', descripcion: 'Lote ' + i, kcal: 500 + i, proteina_g: 30, carbos_g: 50, grasa_g: 15 });
        lote.push({ tabla: 'medidas', fecha: dia(i + 1), peso_kg: 72 + i / 10, horas_sueno: 7 });
      }
      const antes = s.hojas.comidas.filas.length;
      const texto = JSON.stringify(lote, null, 2);
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', texto);
      await page.click('dialog button:has-text("Revisar")');
      const btn = page.locator('dialog button:has-text("Guardar 40 registros")');
      await btn.waitFor();
      assert.ok((await btn.getAttribute('class')).includes('lima'), 'el botón Guardar es verde');
      assert.ok(await btn.evaluate((b) => b.getBoundingClientRect().top < document.querySelector('dialog .lista').getBoundingClientRect().top), 'Guardar va antes de la lista');
      control.retraso = 150;
      await btn.click();
      await page.waitForSelector('dialog button:has-text("Guardando")');
      await page.waitForSelector('text=40 registros guardados', { timeout: 20000 });
      control.retraso = 0;
      assert.strictEqual(s.hojas.comidas.filas.length - antes, 20);
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', texto);
      await page.click('dialog button:has-text("Revisar")');
      await page.waitForSelector('dialog .resumen-pegar:has-text("20 ya estaban guardados")');
      assert.ok((await page.innerText('dialog .resumen-pegar')).startsWith('20 listos'), 'las medidas solo se actualizan');
      await page.keyboard.press('Escape');
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.plato .desc:has-text("Salmón con papas")');
    });
    await prueba('Pegar: traduce «merienda», «correr» y «pesas»; avisa antes de guardar lo que Google rechazaría', async () => {
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', JSON.stringify([
        { tabla: 'comidas', tipo_comida: 'Merienda', descripcion: 'Fruta', kcal: '120 kcal', proteina_g: 1 },
        { tabla: 'ejercicio', tipo: 'Correr', duracion_min: 30, kcal: 300 },
        { tabla: 'gym', ejercicio: 'Sentadilla', numero_serie: 1, peso_kg: 80, repeticiones: 5 },
        { tabla: 'medidas', horas_sueno: 30 },
        { tabla: 'comidas', tipo_comida: 'cena', descripcion: 'Exagerada', kcal: 20000 }
      ]));
      await page.click('dialog button:has-text("Revisar")');
      await page.waitForSelector('dialog button:has-text("Guardar 3 registros")');
      const v = await page.innerText('dialog .lista');
      assert.ok(v.includes('Snack: Fruta · 120 kcal') && v.includes('Ejercicio: Caminata') && v.includes('Gym: Sentadilla'), v);
      assert.ok(v.includes('horas de sueño mayor que 24') && v.includes('calorías mayor que 10.000'), v);
      await page.click('dialog button:has-text("Guardar 3 registros")');
      await page.waitForSelector('text=3 registros guardados');
      const ej = s.hojas.ejercicio.filas[s.hojas.ejercicio.filas.length - 1];
      assert.ok(ej.includes('caminata') && ej.includes('Correr'), String(ej));
    });
    await prueba('Pegar: si Google rechaza alguno, lo explica y lo deja en el cuadro para reintentar', async () => {
      control.rechazar = 'Rechazada';
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', JSON.stringify([
        { tabla: 'comidas', tipo_comida: 'cena', descripcion: 'Buena', kcal: 400 },
        { tabla: 'comidas', tipo_comida: 'cena', descripcion: 'Rechazada', kcal: 400 }
      ]));
      await page.click('dialog button:has-text("Revisar")');
      await page.click('dialog button:has-text("Guardar 2 registros")');
      await page.waitForSelector('text=Guardé 1 y fallaron 1.');
      const v = await page.innerText('dialog .lista');
      assert.ok(v.includes('No se guardó: Cena: Rechazada') && v.includes('tipo de comida no es válido'), v);
      const caja = await page.inputValue('dialog textarea[aria-label="Datos de Claude"]');
      assert.ok(caja.includes('Rechazada') && !caja.includes('Buena'), caja);
      control.rechazar = null;
      await page.click('dialog button:has-text("Revisar")');
      await page.click('dialog button:has-text("Guardar 1 registro")');
      await page.waitForSelector('text=1 registro guardado');
    });
    await prueba('formularios: comida, medidas y ejercicio', async () => {
      await page.click('.fab');
      await page.click('dialog [role=tab]:has-text("Comida")');
      await page.fill('#f-descripcion', 'Huevos');
      await page.fill('#f-kcal', '300');
      await page.click('dialog button:has-text("Guardar comida")');
      await page.waitForSelector('.plato .desc:has-text("Huevos")');
      await page.click('.fab');
      await page.click('dialog [role=tab]:has-text("Medidas")');
      await page.fill('#f-peso_kg', '71.6');
      await page.click('dialog button:has-text("Guardar medidas")');
      await page.waitForSelector('text=Medidas guardadas');
      await page.click('.fab');
      await page.click('dialog [role=tab]:has-text("Ejercicio")');
      await page.selectOption('#f-tipo', 'caminata');
      await page.fill('#f-kcal', '200');
      await page.click('dialog button:has-text("Guardar ejercicio")');
      await page.waitForSelector('.item:has-text("Caminata")');
    });
    await prueba('tocar la tarjeta de Sueño o de Peso abre el registro listo para escribir', async () => {
      await page.click('.dos button[aria-label="Registrar horas de sueño"]');
      await page.waitForSelector('dialog [role=tab].on:has-text("Medidas")');
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'f-horas_sueno');
      assert.strictEqual(await page.inputValue('#f-peso_kg'), '71.6', 'trae el peso ya guardado del día');
      await page.keyboard.type('7.5');
      await page.click('dialog button:has-text("Guardar medidas")');
      await page.waitForFunction(() => /7,5\s*h/.test(document.querySelector('.dos').innerText));
      const enc = s.hojas.medidas.filas[0], fila = s.hojas.medidas.filas.find((f) => f[0] === hoy);
      assert.strictEqual(fila[enc.indexOf('peso_kg')], 71.6, 'no borra el peso');
      await page.click('.dos button[aria-label="Ver entreno"]');
      await page.waitForSelector('.titulo:has-text("Entreno")');
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.hero');
    });
    await prueba('borrar una serie de gym desde su detalle', async () => {
      page.once('dialog', (d) => d.accept());
      await page.click('.item:has-text("Press banca")');
      await page.click('dialog button[aria-label="Borrar serie 2"]');
      await page.waitForFunction(() => /Press banca · 1 serie/.test(document.body.innerText));
    });
    await prueba('Ajustes: simple; lo técnico plegado en «Opciones avanzadas», con el botón que copia el código', async () => {
      await page.click('.top [aria-label="Ajustes"]');
      await page.waitForSelector('dialog >> text=Mis metas');
      await captura(page, 'ajustes-simple');
      assert.ok(!(await page.innerText('dialog')).includes('versión 3'), 'lo técnico no se ve hasta abrir «Opciones avanzadas»');
      await page.click('dialog summary:has-text("Opciones avanzadas")');
      const t = await page.innerText('dialog');
      assert.ok(t.includes('versión 3 (al día)') && t.includes('…'), t);
      await page.click('dialog button:has-text("Copiar código del servicio")');
      await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('var VERSION = 3'));
      await captura(page, 'ajustes');
    });
    await prueba('cambiar la dirección del servicio desde la app (sin tocar GitHub)', async () => {
      await page.click('dialog button:has-text("Cambiar la dirección del servicio")');
      await page.fill('#f-servicio', 'https://ejemplo.com/no');
      await page.click('dialog button:has-text("Guardar dirección")');
      await page.waitForSelector('dialog >> text=La dirección debe empezar');
      await page.fill('#f-servicio', URL_B);
      await page.click('dialog button:has-text("Guardar dirección")');
      await page.waitForSelector('.hero');
      assert.strictEqual(llamadas[llamadas.length - 1].url, URL_B, 'las peticiones van a la dirección nueva');
    });

    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Progreso: gráficas y medición trimestral');
  {
    const s = crearServicio();
    s.ctx.setup();
    const T = s.props.TOKEN;
    const hace = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoLocal(d); };
    let semilla = 3; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 40; n++) {
      if (n % 9 === 4) continue; // días sin registrar
      const f = hace(n);
      s.hojas.comidas.filas.push(['c' + n, f, '13:00', 'almuerzo', 'Comida ' + n, n === 3 ? 3400 : 1900 + Math.round(azar() * 500), n % 5 === 0 ? 110 : 135 + Math.round(azar() * 20), 200, 70, true, '']);
      s.hojas.medidas.filas.push([f, '', '', +(6 + azar() * 2.4).toFixed(1), '']);
      if (n % 3 === 0) s.hojas.ejercicio.filas.push(['e' + n, f, n % 2 ? 'bici' : 'gym', 45, 300, 'manual', '', '', '']);
      if (n % 3 === 0 && n % 2 === 0) {
        for (let k = 1; k <= 3; k++) s.hojas.series_gym.filas.push(['g' + n + k, f, 'Pecho', 'Press banca', k, 60 + (40 - n) / 4, 8, '']);
        s.hojas.series_gym.filas.push(['r' + n, f, 'Espalda', 'Remo', 1, 40, 10, '']);
      }
    }
    // Mediciones trimestrales: hace 6 meses, hace 3 meses y hace 20 días (fuera de los días cargados, igual se ven)
    // Repetidos: la misma comida 3 veces y el mismo ejercicio 2 veces (como al pegar el mismo bloque varias veces)
    const comida1 = s.hojas.comidas.filas.find((r) => r[0] === 'c1');
    s.hojas.comidas.filas.push(['c1-bis', ...comida1.slice(1, 10), '2099-01-01T00:00:00Z']);
    s.hojas.comidas.filas.push(['c1-tris', ...comida1.slice(1, 10), '2099-01-02T00:00:00Z']);
    const ejer3 = s.hojas.ejercicio.filas.find((r) => r[0] === 'e3');
    s.hojas.ejercicio.filas.push(['e3-bis', ...ejer3.slice(1, 8), '2099-01-01T00:00:00Z']);
    s.hojas.medidas.filas.push([hace(185), 74.2, 89, '', '']);
    s.hojas.medidas.filas.push([hace(95), 73.1, 87.5, '', '']);
    s.hojas.medidas.filas.push([hace(20), 72.3, 86, '', '']);

    const { page, base, errores, llamadas, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);
    await entrar(page, T);
    await page.waitForSelector('.hero');

    await prueba('Cuerpo: cuántos días faltan para la próxima medición', async () => {
      await page.click('.nav [aria-label="Cuerpo"]');
      const t = await page.innerText('.hero-cuerpo');
      assert.ok(t.includes('70') && t.includes('días para la próxima'), t);
      await page.click('.nav [aria-label="Hoy"]');
      await captura(page, 'hoy');
    });
    await prueba('repetidos: avisa en Hoy, los muestra y al confirmar deja uno de cada uno', async () => {
      await page.waitForSelector('.banda:has-text("Hay 3 registros repetidos")');
      assert.ok((await page.innerText('.banda')).includes('Suman ' + (comida1[5] * 2).toLocaleString('de-DE') + ' kcal de más'));
      await page.click('.banda button:has-text("Revisar")');
      await page.waitForSelector('dialog >> text=Guardado 3 veces · se borran 2');
      await page.waitForSelector('dialog >> text=Guardado 2 veces · se borran 1');
      page.once('dialog', (d) => d.accept());
      await page.click('dialog button:has-text("Borrar 3 repetidos")');
      await page.waitForSelector('text=3 repetidos borrados', { timeout: 15000 });
      const ids = s.hojas.comidas.filas.map((r) => r[0]);
      assert.ok(ids.includes('c1') && !ids.includes('c1-bis') && !ids.includes('c1-tris'), 'deja el original');
      const idsE = s.hojas.ejercicio.filas.map((r) => r[0]);
      assert.ok(idsE.includes('e3') && !idsE.includes('e3-bis'));
      await page.waitForFunction(() => !document.querySelector('.banda'));
    });
    await prueba('Ajustes: «Buscar registros repetidos» dice que ya no hay', async () => {
      await page.click('.top [aria-label="Ajustes"]');
      await page.click('dialog button:has-text("Buscar registros repetidos")');
      await page.waitForSelector('dialog >> text=No encontré registros repetidos');
      await page.keyboard.press('Escape');
    });
    await prueba('Progreso abre en 30 días con el consolidado: balance = consumido − gastado', async () => {
      await page.click('.nav [aria-label="Progreso"]');
      await page.waitForSelector('.hero-bal');
      assert.strictEqual(await page.innerText('.seg .pill.on'), '30 d');
      // Cálculo esperado con los mismos datos: gastado = mantenimiento + ejercicio del día
      const metas = { kcal_base: 2500 }; // la que crea setup()
      let bal = 0, dias = 0, cons = 0;
      for (const r of s.hojas.comidas.filas) {
        const f = r[1]; if (typeof r[5] !== 'number' || f < hace(29)) continue; // la fila 1 son los títulos
        const ej = s.hojas.ejercicio.filas.filter((e) => e[1] === f && typeof e[4] === 'number').reduce((a, e) => a + e[4], 0);
        bal += r[5] - (metas.kcal_base + ej); cons += r[5]; dias++;
      }
      const fmt = (v) => Math.round(Math.abs(v)).toLocaleString('de-DE');
      const hero = await page.innerText('.hero-bal');
      assert.ok(hero.includes((bal < 0 ? '−' : '+') + fmt(bal)), 'balance ' + bal + ' en ' + hero);
      assert.ok(hero.includes(fmt(cons / dias)) && hero.includes('Comido / día') && hero.includes('Gastado / día'), hero);
      assert.ok((await page.innerText('.filtros .rango')).includes(dias + ' con comidas'));
      const kpis = await page.innerText('.kpis');
      assert.ok(kpis.includes('Proteína') && kpis.includes('Sueño') && kpis.includes('Entrenos') && kpis.includes('Quemado'), kpis);
      if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'progreso.png'), fullPage: true });
    });
    await prueba('1 · ¿Comí más o menos de lo que gasté?: una barra por día, responde y al tocar muestra el día', async () => {
      const g = page.locator('.graf:has(h3:text-is("¿Comí más o menos de lo que gasté?"))');
      const n = await g.locator('rect.hit').count();
      assert.ok(n >= 25 && n <= 30, String(n));
      assert.ok(/de \d+ días gastaste más de lo que comiste/.test(await g.locator('.resp').innerText()));
      await g.locator('rect.hit').last().click();
      const dato = await g.locator('.dato').innerText();
      assert.ok(/comiste .* gastaste .* (déficit|superávit)/.test(dato), dato);
    });
    await prueba('2 y 3 · déficit acumulado y calendario de proteína', async () => {
      assert.ok((await page.innerText('.graf:has(h3:text-is("¿Cuánta grasa voy quemando?")) .resp')).includes('kg de grasa'));
      const cal = page.locator('.graf:has(h3:text-is("¿Llegué a mi proteína cada día?"))');
      assert.strictEqual(await cal.locator('.cal-d').count(), 30);
      assert.ok(await cal.locator('.cal-d.mal').count() > 0 && await cal.locator('.cal-d.ok').count() > 0 && await cal.locator('.cal-d.sin').count() > 0);
      await cal.locator('.cal-d.mal').first().click();
      assert.ok((await cal.locator('.dato').innerText()).includes('faltaron'));
    });
    await prueba('4 y 5 · sueño y fuerza (elige el ejercicio)', async () => {
      assert.ok((await page.innerText('.graf:has(h3:text-is("¿Estoy durmiendo bien?")) .resp')).includes('Promedio'));
      const g = page.locator('.graf:has(h3:text-is("¿Estoy más fuerte?"))');
      assert.strictEqual(await g.locator('.chips button.on').innerText(), 'Press banca');
      assert.ok((await g.locator('.resp').innerText()).includes('Press banca: de'));
      await g.locator('.chips button:has-text("Remo")').click();
      await page.waitForFunction(() => document.querySelector('.chips button.on').textContent === 'Remo');
    });
    await prueba('filtro «Con entreno» y «Descanso» cambian el consolidado', async () => {
      const todos = await page.innerText('.hero-bal .big');
      await page.click('.pill:has-text("Con entreno")');
      await page.waitForSelector('.pill.on:has-text("Con entreno")');
      const n = await page.locator('.graf:has(h3:text-is("¿Comí más o menos de lo que gasté?")) rect.hit').count();
      assert.ok(n >= 5 && n <= 11, String(n));
      assert.notStrictEqual(await page.innerText('.hero-bal .big'), todos);
      assert.ok(await page.locator('.cal-d.fuera').count() > 0, 'los días que no entran se ven vacíos');
      await page.click('.pill:has-text("Descanso")');
      await page.waitForSelector('.pill.on:has-text("Descanso")');
      await page.click('.pill:has-text("Todos")');
    });
    await prueba('90 días: trae de la hoja las fechas que faltan y compara con el periodo anterior', async () => {
      const antes = llamadas.length;
      await page.click('.pill[aria-label="90 días"]');
      await page.waitForFunction(() => /comparado con los 90 días anteriores/.test(document.body.innerText), null, { timeout: 15000 });
      assert.ok(llamadas.slice(antes).some((l) => l.accion === 'leer'), 'pidió las fechas que faltaban');
      await page.click('.pill[aria-label="7 días"]');
      await page.waitForSelector('.pill.on[aria-label="7 días"]');
      assert.ok((await page.innerText('.nota-centro')).includes('7 días anteriores'));
    });
    await prueba('Fechas: elegir desde y hasta a mano', async () => {
      await page.click('.pill[aria-label="Elegir fechas"]');
      await page.fill('#f-desde', hace(13));
      await page.dispatchEvent('#f-desde', 'change');
      await page.waitForFunction(() => /14 días/.test(document.querySelector('.filtros .rango').textContent));
      await page.click('.pill[aria-label="Este mes"]');
      await page.waitForSelector('.pill.on[aria-label="Este mes"]');
    });
    await prueba('Cuerpo: mediciones trimestrales', async () => {
      await page.click('.nav [aria-label="Cuerpo"]');
      const peso = await page.innerText('.graf:has(h3:text-is("Peso"))');
      assert.ok(peso.includes('−0,8 kg') && peso.includes('72,3 kg'), peso);
      assert.strictEqual(await page.locator('.graf:has(h3:text-is("Peso")) circle.hit').count(), 3);
      assert.ok((await page.innerText('.graf:has(h3:text-is("Cintura"))')).includes('−1,5 cm'));
    });
    await prueba('volver a Hoy', async () => {
      await page.click('.nav [aria-label="Hoy"]');
      await page.waitForSelector('.hero');
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Entreno: series con foto, récords, músculos trabajados y cardio');
  {
    const s = crearServicio();
    s.ctx.setup();
    const T = s.props.TOKEN;
    const hace = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoLocal(d); };
    const serie = (id, f, ej, n, kg, reps) => s.hojas.series_gym.filas.push([id, f, 'Espalda y bíceps', ej, n, kg, reps, '']);
    // La vez anterior (hace 7 días) y hoy: en jalón sube el peso (récord)
    serie('a1', hace(7), 'Jalón al frente', 1, 40, 12); serie('a2', hace(7), 'Jalón al frente', 2, 40, 10); serie('a3', hace(7), 'Jalón al frente', 3, 45, 8);
    serie('b1', hoy, 'Jalón al frente', 1, 40, 12); serie('b2', hoy, 'Jalón al frente', 2, 45, 10); serie('b3', hoy, 'Jalón al frente', 3, 50, 8);
    serie('c1', hoy, 'Remo bajo', 1, 45, 12);
    serie('d1', hoy, 'Curl martillo', 1, 12, 12);
    serie('f1', hoy, 'Cristos Invertidos En Maquina', 1, 25, 12);
    serie('g1', hoy, 'Crunch abdominal en máquina Evolve', 1, 0, 12);
    s.hojas.ejercicio.filas.push(['e1', hoy, 'gym', 80, 350, 'estimado', '', '', '']);
    s.hojas.ejercicio.filas.push(['e2', hoy, 'bici', 203, 2035, 'strava', '', 'Ruta Amagá: 56 km, 1.368 m de desnivel', '']);
    s.hojas.ejercicio.filas.push(['e3', hace(1), 'caminata', 30, 120, 'manual', '', '', '']);
    const { page, base, errores, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);
    await entrar(page, T);
    await page.waitForSelector('.hero');

    await prueba('la barra de abajo trae Entreno y abre la pantalla con la semana', async () => {
      await page.click('.nav [aria-label="Entreno"]');
      await page.waitForSelector('.titulo:has-text("Entreno")');
      const kp = await page.innerText('.kp-ent');
      assert.ok(kp.includes('2.314') && kp.includes('kg levantados'), kp);
      assert.ok((await page.innerText('.racha')).includes('🔥 2 días'));
    });
    await prueba('músculos trabajados: figura de frente y espalda, con espalda y bíceps', async () => {
      assert.strictEqual(await page.locator('.cuerpo-fig svg').count(), 2);
      const chips = await page.innerText('.chips-m');
      assert.ok(chips.includes('Espalda') && chips.includes('Bíceps'), chips);
    });
    await prueba('filtrar por día: el muñeco y las sesiones muestran solo ese día', async () => {
      const semana = await page.innerText('.chips-m');
      const totalSesiones = await page.locator('.sesion').count(); // depende del día de la semana en que se corre
      await page.locator('.dia-ent.on').last().click();
      await page.waitForSelector('.filtro-dia .pill.on:not(:has-text("Toda la semana"))');
      const dia = await page.innerText('.graf:has(h3:text-is("Músculos trabajados")) .chips-m');
      assert.ok(dia.includes('Espalda'), dia);
      assert.strictEqual(await page.locator('.sesion').count(), 2, 'solo las sesiones de ese día (gym y bici)');
      assert.ok(!(await page.innerText('.app')).includes('Caminata'), 'la caminata de otro día no sale');
      await page.click('.filtro-dia .pill:has-text("Toda la semana")');
      await page.waitForFunction((n) => document.querySelectorAll('.sesion').length === n, totalSesiones);
      assert.strictEqual(await page.innerText('.chips-m'), semana);
    });
    await prueba('cada ejercicio con su foto, sus series y la comparación con la vez anterior', async () => {
      const card = page.locator('.ej:has(b:text-is("Jalón al frente"))');
      const src = await card.locator('.foto-ej img').getAttribute('src');
      assert.ok(src.endsWith('Wide-Grip_Lat_Pulldown/0.jpg'), src);
      await card.locator('.foto-ej').click();
      await page.waitForSelector('dialog.visor img');
      assert.ok((await page.locator('dialog.visor img').getAttribute('src')).endsWith('Wide-Grip_Lat_Pulldown/0.jpg'), 'se abre en grande con la posición 1');
      await page.click('dialog.visor .visor-n:has-text("2")');
      assert.ok((await page.locator('dialog.visor img').getAttribute('src')).endsWith('Wide-Grip_Lat_Pulldown/1.jpg'), 'la posición 2 también en grande');
      await page.click('dialog.visor img');
      assert.ok((await page.locator('dialog.visor img').getAttribute('src')).endsWith('/0.jpg'), 'tocar la foto cambia de posición');
      await page.click('dialog.visor [aria-label="Cerrar"]');
      await page.waitForFunction(() => !document.querySelector('dialog.visor'));
      const t = await card.innerText();
      assert.ok(t.includes('🏆 Récord: 50 kg') && t.includes('▲ 5 kg') && t.includes('Volumen 1.330 kg') && /% vs el/.test(t), t);
      assert.ok((await page.innerText('.ej:has(b:text-is("Curl martillo"))')).includes('Bíceps'));
    });
    await prueba('«Cristos Invertidos En Maquina» (nombre de Smart Fit) usa la foto de la máquina, no la de mancuernas', async () => {
      const src = await page.locator('.ej:has(b:text-is("Cristos Invertidos En Maquina")) .foto-ej img').getAttribute('src');
      assert.ok(src.endsWith('Reverse_Machine_Flyes/0.jpg'), src);
    });
    await prueba('historial del ejercicio con su gráfica', async () => {
      await page.click('[aria-label="Historial de Jalón al frente"]');
      await page.waitForSelector('dialog >> text=2 sesiones');
      assert.ok((await page.innerText('dialog')).includes('🏆 récord'));
      await page.keyboard.press('Escape');
    });
    await prueba('cardio: distancia y desnivel sacados de las notas de Strava', async () => {
      const t = await page.innerText('.sesion:has-text("Ruta Amagá")');
      assert.ok(t.includes('56 km') && t.includes('1.368 m de desnivel') && t.includes('3 h 23'), t);
      if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'entreno.png'), fullPage: true });
    });
    await prueba('semana anterior y vuelta', async () => {
      await page.click('[aria-label="Semana anterior de entreno"]');
      await page.waitForFunction(() => !/Esta semana/.test(document.querySelector('.hero-ent .hero-t').textContent));
      assert.ok((await page.innerText('.app')).includes('Jalón al frente'), 'la sesión de hace 7 días');
      await page.click('[aria-label="Semana siguiente de entreno"]');
      await page.waitForSelector('.hero-ent .hero-t:has-text("Esta semana")');
    });
    await prueba('cambiar el nombre de un ejercicio en todas sus series corrige la foto', async () => {
      await page.locator('.ej:has(b:text-is("Curl martillo")) .ej-editar').click();
      await page.locator('dialog summary:has-text("La foto no es la correcta")').click();
      await page.fill('#f-nuevo-nombre', 'Cristos Invertidos En Maquina');
      page.once('dialog', (d) => d.accept());
      await page.click('dialog button:has-text("Cambiar el nombre en 1 serie")');
      await page.waitForSelector('text=Listo: 1 serie cambiada');
      const nombres = s.hojas.series_gym.filas.slice(1).map((f) => f[3]);
      assert.ok(!nombres.includes('Curl martillo') && nombres.filter((n) => n === 'Cristos Invertidos En Maquina').length === 2, nombres.join('|'));
    });
    await prueba('«Crunch abdominal en máquina» usa la foto de la máquina abdominal', async () => {
      await page.click('.nav [aria-label="Entreno"]');
      const src = await page.locator('.ej:has(b:text-is("Crunch abdominal en máquina Evolve")) .foto-ej img').getAttribute('src');
      assert.ok(src.endsWith('Ab_Crunch_Machine/0.jpg'), src);
    });
    await prueba('Ajustes → Ejercicios y fotos: elegir otra foto para un ejercicio', async () => {
      await page.click('.top [aria-label="Ajustes"]');
      await page.click('dialog button:has-text("Ejercicios y fotos")');
      await page.click('dialog .item:has-text("Remo bajo")');
      await page.fill('#f-buscar-foto', 'crunch machine');
      await page.waitForSelector('dialog .foto-op');
      assert.strictEqual(await page.locator('dialog .foto-op').count(), 1, 'la búsqueda filtra');
      await page.click('dialog [aria-label="Usar la foto de Ab Crunch Machine"]');
      await page.waitForSelector('text=Foto elegida para «Remo bajo»');
      const src = await page.locator('.ej:has(b:text-is("Remo bajo")) .foto-ej img').getAttribute('src');
      assert.ok(src.endsWith('Ab_Crunch_Machine/0.jpg'), 'la foto elegida se usa en Entreno: ' + src);
    });
    await prueba('la foto elegida se puede quitar (vuelve la automática)', async () => {
      await page.click('.top [aria-label="Ajustes"]');
      await page.click('dialog button:has-text("Ejercicios y fotos")');
      await page.click('dialog .item:has-text("Remo bajo")');
      await page.click('dialog button:has-text("Quitar la foto que elegí")');
      await page.waitForSelector('text=vuelve la foto automática');
      const src = await page.locator('.ej:has(b:text-is("Remo bajo")) .foto-ej img').getAttribute('src');
      assert.ok(src.endsWith('Seated_Cable_Rows/0.jpg'), src);
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Medición trimestral completa (báscula, cinta métrica y por zona)');
  {
    const s = crearServicio();
    s.ctx.setup();
    const T = s.props.TOKEN;
    // Datos inventados: 2 mediciones de báscula de bioimpedancia y una con cinta métrica hoy
    const bloque = JSON.parse(fs.readFileSync(path.join(__dirname, 'medicion-ejemplo.json'), 'utf8'));
    bloque[2].fecha = hoy;
    const { page, base, errores, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);
    await entrar(page, T);
    await page.waitForSelector('.hero');

    await prueba('Pegar: reconoce la medición completa y la guarda', async () => {
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', JSON.stringify(bloque));
      await page.click('dialog button:has-text("Revisar")');
      await page.waitForSelector('dialog button:has-text("Guardar 3 registros")');
      const v = await page.innerText('dialog .lista');
      assert.ok(v.includes('81 kg · grasa 24 % · músculo 35 kg · +15 datos más'), v);
      assert.ok(v.includes('cintura 90 cm · +6 datos más'), v);
      await page.click('dialog button:has-text("Guardar 3 registros")');
      await page.waitForSelector('text=3 registros guardados', { timeout: 15000 });
      const enc = s.hojas.medidas.filas[0];
      const fila = s.hojas.medidas.filas.find((f) => f[0] === '2026-04-20');
      assert.strictEqual(fila[enc.indexOf('grasa_tronco_kg')], 10.5);
    });
    await prueba('Cuerpo: la medición de hoy cuenta 90 días para la próxima', async () => {
      await page.click('.nav [aria-label="Cuerpo"]');
      await page.waitForFunction(() => /90\s*días para la próxima/.test(document.querySelector('.hero-cuerpo').innerText));
    });
    await prueba('Progreso → Cuerpo: última vs anterior con su ▲▼ y gráficas de grasa y músculo', async () => {
      const card = page.locator('.graf:has(h3:text-is("Última medición vs la anterior"))');
      const grasa = await card.locator('.cmp-fila:has-text("Grasa corporal")').innerText();
      assert.ok(/24\s+22,8 %\s+▼ 1,2/.test(grasa), grasa);
      assert.ok((await card.locator('.cmp-fila:has-text("Grasa corporal") .delta').getAttribute('class')).includes('up'), 'bajar grasa es bueno');
      assert.ok((await card.locator('.cmp-fila:has-text("Masa muscular") .delta').getAttribute('class')).includes('dn'), 'bajar músculo no es bueno');
      assert.ok((await card.locator('.cmp-fila:has-text("Pecho")').innerText()).includes('nuevo'));
      await card.locator('summary:has-text("Por zona")').click();
      assert.ok((await card.locator('.cmp-fila:has-text("Grasa tronco")').innerText()).includes('▼ 1,5'));
      assert.ok((await page.innerText('.graf:has(h3:text-is("Grasa corporal"))')).includes('−1,2 %'));
      assert.ok((await page.innerText('.graf:has(h3:text-is("Masa muscular"))')).includes('34,6 kg'));
      if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'cuerpo.png'), fullPage: true });
    });
    await prueba('el formulario de Medidas trae báscula, cinta y por zona', async () => {
      await page.click('.fab');
      await page.click('dialog [role=tab]:has-text("Medidas")');
      for (const id of ['#f-grasa_pct', '#f-masa_muscular_kg', '#f-pecho_cm', '#f-muslo_cm']) await page.waitForSelector(id);
      assert.strictEqual(await page.inputValue('#f-pecho_cm'), '102');
      await page.fill('#f-grasa_pct', '150');
      await page.click('dialog button:has-text("Guardar medidas")');
      await page.waitForSelector('text=Grasa corporal: revisa el número');
      if (CAPTURAS) await page.screenshot({ path: path.join(CAPTURAS, 'form-medidas.png'), fullPage: true });
      await page.keyboard.press('Escape');
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Servicio versión 2 (antes de la medición completa)');
  {
    const s = crearServicio({ codigo: path.join(__dirname, 'servicio-v2.gs.txt') });
    s.ctx.setup();
    const T = s.props.TOKEN;
    s.post({ token: T, accion: 'agregar', tabla: 'comidas', fila: { fecha: hoy, tipo_comida: 'almuerzo', descripcion: 'Arroz con pollo', kcal: 700, proteina_g: 40, carbos_g: 80, grasa_g: 15 } });
    const { page, base, errores, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);
    await entrar(page, T);
    await prueba('todo sigue funcionando y pide actualizar el servicio', async () => {
      await page.waitForSelector('.plato .desc:has-text("Arroz con pollo")');
      await page.waitForSelector('.banda >> text=Actualiza tu servicio de Google');
    });
    await prueba('Pegar no guarda a medias la medición completa (avisa que hay que actualizar)', async () => {
      await page.click('.fab');
      await page.fill('dialog textarea[aria-label="Datos de Claude"]', JSON.stringify([{ tabla: 'medidas', fecha: ayer, peso_kg: 79.5, grasa_pct: 22.8 }, { tabla: 'medidas', horas_sueno: 7 }]));
      await page.click('dialog button:has-text("Revisar")');
      await page.waitForSelector('dialog button:has-text("Guardar 1 registro")');
      assert.ok((await page.innerText('dialog .lista')).includes('primero actualiza tu servicio de Google'));
      await page.keyboard.press('Escape');
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Servicio anterior (el que había antes de esta versión)');
  {
    const s = crearServicio({ codigo: path.join(__dirname, 'servicio-v1.gs.txt') });
    s.ctx.setup();
    const T = s.props.TOKEN;
    s.post({ token: T, accion: 'agregar', tabla: 'comidas', fila: { fecha: hoy, tipo_comida: 'desayuno', descripcion: 'Huevos', kcal: 300, proteina_g: 20, carbos_g: 2, grasa_g: 20 } });
    const { page, base, errores, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"' + URL_A + '"};', { [URL_A]: s });
    await page.goto(base);
    await entrar(page, T);

    await prueba('la app sigue funcionando y avisa que hay que actualizar el servicio', async () => {
      await page.waitForSelector('.hero');
      await page.waitForSelector('.banda >> text=Actualiza tu servicio de Google');
      assert.ok((await page.innerText('.lista.comidas')).includes('Huevos'));
      await captura(page, 'aviso-actualizar');
    });
    await prueba('el botón «Ver cómo» lleva a los pasos, con el estado «desactualizado»', async () => {
      await page.click('.banda button:has-text("Ver cómo")');
      const t = await page.innerText('dialog');
      assert.ok(t.includes('versión 1 (desactualizado)') && t.includes('Nueva versión'), 'con servicio viejo la sección se abre sola: ' + t);
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  // =========================================================================
  console.log('Primera vez, sin dirección en config.js');
  {
    const s = crearServicio();
    s.ctx.setup();
    const { page, base, errores, cerrar } = await abrir('window.CONFIG={SCRIPT_URL:"https://script.google.com/macros/s/TU-ID/exec"};', { [URL_A]: s });
    await page.goto(base);
    await prueba('pide la dirección y deja ponerla en la app', async () => {
      await page.waitForSelector('text=Falta la dirección del servicio');
      await page.click('text=Poner la dirección');
      await page.fill('#f-servicio', URL_A);
      await page.click('dialog button:has-text("Guardar dirección")');
      await entrar(page, s.props.TOKEN);
      await page.waitForSelector('.hero');
    });
    await prueba('sin errores en la consola', async () => assert.deepStrictEqual(errores, []));
    await cerrar();
  }

  console.log(fallas ? '\n' + fallas + ' prueba(s) fallaron' : '\nTodas las pruebas de la app pasaron');
  process.exit(fallas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
