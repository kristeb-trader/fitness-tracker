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
      assert.ok((await page.innerText('.hero')).includes('64 / 130 g'));
    });
    await prueba('no aparece el aviso de servicio desactualizado', async () => {
      assert.strictEqual(await page.locator('.banda').count(), 0);
    });
    await prueba('muestra la sección Gym con las series del día', async () => {
      const gym = await page.innerText('.lista:has(.item:has-text("Press banca"))');
      assert.ok(gym.includes('Press banca · 2 series') && gym.includes('60 kg × 8'), gym);
      await captura(page, 'hoy');
    });
    await prueba('el peso de ayer se muestra como último registro', async () => {
      const t = await page.innerText('.dos');
      assert.ok(t.includes('72,1') && t.includes('Cintura 86 cm'), t);
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
      await page.waitForFunction(() => document.querySelector('.dos').innerText.includes('71,6'));
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
      assert.ok((await page.innerText('.dos')).includes('71,6'), 'no borra el peso');
      await page.click('.dos button[aria-label="Registrar peso y cintura"]');
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'f-peso_kg');
      await page.keyboard.press('Escape');
    });
    await prueba('borrar una serie de gym desde su detalle', async () => {
      page.once('dialog', (d) => d.accept());
      await page.click('.item:has-text("Press banca")');
      await page.click('dialog button[aria-label="Borrar serie 2"]');
      await page.waitForFunction(() => /Press banca · 1 serie/.test(document.body.innerText));
    });
    await prueba('Ajustes: simple; lo técnico plegado en «Opciones avanzadas», con el botón que copia el código', async () => {
      await page.click('.nav [aria-label="Ajustes"]');
      await page.waitForSelector('dialog >> text=Mis metas');
      await captura(page, 'ajustes-simple');
      assert.ok(!(await page.innerText('dialog')).includes('versión 2'), 'lo técnico no se ve hasta abrir «Opciones avanzadas»');
      await page.click('dialog summary:has-text("Opciones avanzadas")');
      const t = await page.innerText('dialog');
      assert.ok(t.includes('versión 2 (al día)') && t.includes('…'), t);
      await page.click('dialog button:has-text("Copiar código del servicio")');
      await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('var VERSION = 2'));
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
      assert.ok((await page.innerText('.carrusel')).includes('Huevos'));
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
