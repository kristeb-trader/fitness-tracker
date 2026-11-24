(function () {
  "use strict";

  var VERSION_APP = 2;
  var SERVICIO_REQUERIDO = 5; // versión de apps-script/Code.gs que espera esta app (3: medición trimestral; 4: rutinas; 5: mis ejercicios)
  var DIAS_CARGADOS = 100;    // la app trae de una vez los últimos 100 días: cambiar de día y ver Progreso (hasta 90) es instantáneo
  var DIAS_MEDICION = 90;     // peso y cintura se miden cada 3 meses
  // Medición trimestral: [campo, nombre, unidad, decimales, grupo, qué es mejor ("sube", "baja" o null), mín, máx]
  var CAMPOS_MEDICION = [
    ["peso_kg", "Peso", "kg", 1, "bascula", null, 20, 400],
    ["grasa_pct", "Grasa corporal", "%", 1, "bascula", "baja", 2, 70],
    ["masa_muscular_kg", "Masa muscular", "kg", 1, "bascula", "sube", 5, 150],
    ["masa_libre_grasa_kg", "Masa libre de grasa", "kg", 1, "bascula", "sube", 10, 200],
    ["agua_l", "Agua", "L", 1, "bascula", null, 10, 120],
    ["grasa_visceral", "Grasa visceral", "", 1, "bascula", "baja", 0, 60],
    ["metabolismo_basal_kcal", "Metabolismo basal", "kcal", 0, "bascula", "sube", 500, 5000],
    ["imc", "IMC", "", 1, "bascula", null, 10, 70],
    ["cintura_cm", "Cintura", "cm", 1, "cinta", "baja", 20, 300],
    ["abdomen_bajo_cm", "Abdomen bajo", "cm", 1, "cinta", "baja", 20, 300],
    ["pecho_cm", "Pecho", "cm", 1, "cinta", "sube", 20, 300],
    ["cadera_cm", "Cadera / glúteo", "cm", 1, "cinta", null, 20, 300],
    ["brazo_izq_cm", "Brazo izquierdo", "cm", 1, "cinta", "sube", 10, 100],
    ["brazo_der_cm", "Brazo derecho", "cm", 1, "cinta", "sube", 10, 100],
    ["muslo_cm", "Muslo", "cm", 1, "cinta", "sube", 20, 150],
    ["magra_brazo_izq_kg", "Músculo brazo izq.", "kg", 2, "zona", "sube", 0, 30],
    ["magra_brazo_der_kg", "Músculo brazo der.", "kg", 2, "zona", "sube", 0, 30],
    ["magra_tronco_kg", "Músculo tronco", "kg", 2, "zona", "sube", 0, 100],
    ["magra_pierna_izq_kg", "Músculo pierna izq.", "kg", 2, "zona", "sube", 0, 50],
    ["magra_pierna_der_kg", "Músculo pierna der.", "kg", 2, "zona", "sube", 0, 50],
    ["grasa_brazo_izq_kg", "Grasa brazo izq.", "kg", 2, "zona", "baja", 0, 30],
    ["grasa_brazo_der_kg", "Grasa brazo der.", "kg", 2, "zona", "baja", 0, 30],
    ["grasa_tronco_kg", "Grasa tronco", "kg", 2, "zona", "baja", 0, 100],
    ["grasa_pierna_izq_kg", "Grasa pierna izq.", "kg", 2, "zona", "baja", 0, 50],
    ["grasa_pierna_der_kg", "Grasa pierna der.", "kg", 2, "zona", "baja", 0, 50]
  ];
  var CAMPOS_V3 = CAMPOS_MEDICION.map(function (c) { return c[0]; }).filter(function (c) { return c !== "peso_kg" && c !== "cintura_cm"; });
  function tieneMedicion(x) { return CAMPOS_MEDICION.some(function (c) { return !vacio(x[c[0]]); }); }

  var CFG = window.CONFIG || {};
  var MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIAS_CORTO = ["L", "M", "X", "J", "V", "S", "D"];

  // ---------- Iconos y platos (texto fijo, sin datos del usuario) ----------
  var ICON = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    meta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    peso: '<path d="M4 7h16M6 7l-2 12h16L18 7M9 7a3 3 0 0 1 6 0"/>',
    luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    pesa: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    camina: '<circle cx="13" cy="4" r="2"/><path d="M8 21l3-7-3-3 3-4 4 3 3 1M11 14l5 2 1 5"/>',
    ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    sig: '<path d="M9 5l7 7-7 7"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    grafica: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    casa: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    mancuerna: '<rect x="4.5" y="6" width="3.5" height="12" rx="1.2"/><rect x="16" y="6" width="3.5" height="12" rx="1.2"/><path d="M2 9.5v5M22 9.5v5M8 12h8"/>',
    persona: '<circle cx="12" cy="4.5" r="2"/><path d="m9 21 3-7 3 7"/><path d="m5 9 7 2 7-2"/><path d="M12 11v3"/>',
    cubiertos: '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
    fuego: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    trofeo: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>',
    bici: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    correr: '<circle cx="15" cy="4" r="2"/><path d="m5 21 4-5 3 1 1.5-5.5L9 10l-3 3"/><path d="m13.5 11.5 2.5 3h4"/>',
    libro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    lapiz: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    camara: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    amanecer: '<path d="M12 2v6M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    manzana: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
    estrella: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    libros: '<path d="m16 6 4 14M12 6v14M8 8v12M4 4v16"/>',
    tendencia: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    brote: '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    foco: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    enlace: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    nota: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
    rayo: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    compartir: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
    reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    guardar: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
    montana: '<path d="m8 3 4 8 5-5 5 15H2z"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>'
  };
  // Los emojis de la interfaz se muestran como íconos de línea (mismo trazo y color en toda la app).
  var EMOJI_ICONO = { "🏠": "casa", "🏋️": "mancuerna", "🏋": "mancuerna", "💪": "mancuerna", "📊": "grafica", "🧍": "persona", "🍽️": "cubiertos", "🍽": "cubiertos",
    "🔥": "fuego", "🌙": "luna", "🍳": "amanecer", "🍛": "sol", "🍲": "luna", "🍌": "manzana", "🚴": "bici", "🚶": "camina", "🏃": "correr", "📅": "calendario",
    "🔍": "lupa", "🏆": "trofeo", "📖": "libro", "✎": "lapiz", "⭐": "estrella", "📚": "libros", "📷": "camara", "⚠️": "alerta", "⚠": "alerta", "📈": "tendencia",
    "🌱": "brote", "💡": "foco", "🔗": "enlace", "📝": "nota", "⚡": "rayo", "📤": "compartir", "🎯": "meta", "🕑": "reloj", "💾": "guardar", "⛰️": "montana", "⛰": "montana" };
  var RE_EMOJI = new RegExp("(" + Object.keys(EMOJI_ICONO).sort(function (a, b) { return b.length - a.length; }).join("|") + ")\\s?", "g");
  var NO_ICONOS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, INPUT: 1 };
  function iconizarTexto(nodo) {
    var p = nodo.parentNode, txt = nodo.nodeValue;
    if (!p || NO_ICONOS[p.nodeName] || p.closest && p.closest("svg") || !RE_EMOJI.test(txt)) return;
    RE_EMOJI.lastIndex = 0;
    var frag = document.createDocumentFragment(), ult = 0, m;
    while ((m = RE_EMOJI.exec(txt))) {
      if (m.index > ult) frag.appendChild(document.createTextNode(txt.slice(ult, m.index)));
      var solo = txt.trim() === m[1];
      var ic = h("span", { class: "ic" + (solo ? " solo" : ""), "aria-hidden": "true" }, svg(ICON[EMOJI_ICONO[m[1]]], 24));
      frag.appendChild(ic);
      ult = m.index + m[0].length;
    }
    if (ult < txt.length) frag.appendChild(document.createTextNode(txt.slice(ult)));
    p.replaceChild(frag, nodo);
  }
  function iconizar(raizNodo) {
    if (raizNodo.nodeType === 3) return iconizarTexto(raizNodo);
    if (raizNodo.nodeType !== 1 || NO_ICONOS[raizNodo.nodeName]) return;
    var w = document.createTreeWalker(raizNodo, NodeFilter.SHOW_TEXT), l = [], n;
    while ((n = w.nextNode())) l.push(n);
    l.forEach(iconizarTexto);
  }
  if (window.MutationObserver) {
    new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, iconizar); }); })
      .observe(document.documentElement, { childList: true, subtree: true });
  }
  function svg(inner, size, extra) {
    var t = document.createElement("template");
    t.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + (extra || 24) + " " + (extra || 24) +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
    return t.content.firstChild;
  }
  function icono(nombre, tam) { return svg(ICON[nombre], tam || 22); }

  // ---------- Utilidades ----------
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    function agregar(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { c.forEach(agregar); return; }
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    for (var i = 2; i < arguments.length; i++) agregar(arguments[i]);
    return el;
  }
  function fmt(n, dec) {
    if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
    return Number(n).toLocaleString("de-DE", { maximumFractionDigits: dec === undefined ? 0 : dec });
  }
  function dos(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function iso(d) { return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
  function deISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumarDias(fecha, n) { var d = deISO(fecha); d.setDate(d.getDate() + n); return iso(d); }
  function sumar(lista, campo) { return lista.reduce(function (a, x) { return a + (Number(x[campo]) || 0); }, 0); }
  function corta(s) { var d = deISO(s); return d.getDate() + " " + MESES[d.getMonth()]; }
  function ahoraHHMM() { var d = new Date(); return dos(d.getHours()) + ":" + dos(d.getMinutes()); }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function vacio(v) { return v === null || v === undefined || v === ""; }
  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }

  /** Cualquier forma de fecha que pueda venir de la hoja o de Claude → «AAAA-MM-DD». */
  function normFecha(v) {
    if (vacio(v)) return "";
    if (typeof v === "number") {
      if (v > 20000 && v < 80000) { // número de serie de Sheets
        var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
        return d.getUTCFullYear() + "-" + dos(d.getUTCMonth() + 1) + "-" + dos(d.getUTCDate());
      }
      return String(v);
    }
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return m[1] + "-" + dos(m[2]) + "-" + dos(m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))) return m[3] + "-" + dos(m[2]) + "-" + dos(m[1]);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var f = new Date(s); if (!isNaN(f.getTime())) return iso(f); }
    return s;
  }
  function normHora(v) {
    if (vacio(v)) return "";
    if (typeof v === "number" && v >= 0 && v < 1) { var min = Math.round(v * 1440); return dos(Math.floor(min / 60) % 24) + ":" + dos(min % 60); }
    var s = String(v).trim(), m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return dos(m[1]) + ":" + m[2];
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var f = new Date(s); if (!isNaN(f.getTime())) return dos(f.getHours()) + ":" + dos(f.getMinutes()); }
    return s;
  }

  var toastT;
  function aviso(txt, error) {
    var t = document.getElementById("toast");
    t.textContent = txt;
    t.className = "toast ver" + (error ? " err" : "");
    try { if (t.showPopover && !t.matches(":popover-open")) t.showPopover(); } catch (e) { /* sin popover: se ve igual */ }
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      t.className = "toast";
      try { if (t.hidePopover && t.matches(":popover-open")) t.hidePopover(); } catch (e) { /* nada */ }
    }, error ? 9000 : 3200);
  }

  // ---------- Lo que se guarda en este dispositivo ----------
  function leerLocal(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function guardarLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function borrarLocal(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
  var tokenMemoria = "";
  var URL_VALIDA = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
  function urlServicio() { var u = leerLocal("servicio"); return URL_VALIDA.test(u) ? u : (CFG.SCRIPT_URL || ""); }
  function urlConfigurada() { var u = urlServicio(); return !!u && u.indexOf("TU-ID") < 0; }

  // ---------- Conexión con el servicio de Google ----------
  function api(accion, extra, tokenProbar) {
    var cuerpo = Object.assign({ token: tokenProbar || tokenMemoria || leerLocal("token"), accion: accion }, extra || {});
    var control = typeof AbortController !== "undefined" ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, 45000) : null;
    return fetch(urlServicio(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita la petición previa que Google no admite
      body: JSON.stringify(cuerpo),
      signal: control ? control.signal : undefined
    }).catch(function (x) {
      var tardo = x && x.name === "AbortError";
      var e = new Error(tardo ? "Tu servicio de Google tardó demasiado en responder. Inténtalo de nuevo." : "No se pudo conectar con tu servicio de Google. Revisa tu internet y la dirección del servicio (Ajustes → Opciones avanzadas).");
      e.red = true;
      e.detalle = String((x && x.message) || x);
      throw e;
    }).then(function (r) {
      return r.text().then(function (t) {
        try { return JSON.parse(t); } catch (x) {
          var e = new Error("Tu servicio de Google respondió algo que no es de la app: puede ser una dirección de implementación vieja o el acceso mal configurado.");
          e.formato = true;
          e.detalle = "HTTP " + r.status + " · " + t.replace(/\s+/g, " ").slice(0, 140);
          throw e;
        }
      });
    }).then(function (j) {
      if (reloj) clearTimeout(reloj);
      if (!j.ok) {
        var e = new Error(j.error || "Error");
        e.noAutorizado = j.error === "No autorizado";
        // Error por el contenido del dato (no se arregla reintentando)
        e.datos = /no es válido|es mayor que|es menor que|debe ser|^Falta |inválida/.test(e.message);
        throw e;
      }
      return j;
    }, function (e) { if (reloj) clearTimeout(reloj); throw e; });
  }
  function textoError(e) {
    return ((e && e.message) || "Error") + (e && e.detalle ? " (Detalle: " + e.detalle + ")" : "");
  }
  function manejarError(e) {
    if (e && e.noAutorizado) { borrarLocal("token"); olvidarDatos(); tokenMemoria = ""; pantallaEntrada("La contraseña no es correcta."); return; }
    var msg = textoError(e);
    var enEntrada = document.querySelector(".entrada .error");
    if (enEntrada) enEntrada.textContent = msg;
    aviso(msg, true);
  }

  // ---------- Estado ----------
  var hoy = iso(new Date());
  var estado = {
    fecha: hoy,
    pantalla: "hoy", // "hoy" o "progreso"
    diaEntreno: null, // día elegido en Entreno (null = toda la semana)
    semanaEntreno: 0, // 0 = esta semana; −1 = la anterior…
    periodo: 30,     // Progreso: 7, 30, 90, "mes" o "fechas"
    rango: null,     // fechas elegidas a mano {desde, hasta}
    filtroDias: "todos", // "todos", "entreno" o "descanso"
    gymEjercicio: null,
    version: null,   // versión del servicio de Google (1 = anterior a esta app)
    chat: false,
    metas: {},
    tablas: null,    // datos de los últimos días (servicio versión 2 o más)
    desde: null,
    legado: null,    // resumen de un solo día (servicio versión 1)
    cargadoEn: null,
    historial: []
  };
  var raiz = document.getElementById("app");

  function pantallaEntrada(mensaje) {
    raiz.textContent = "";
    var campo = h("input", { type: "password", id: "tok", autocomplete: "current-password", placeholder: "Tu contraseña" });
    var err = h("p", { class: "error", text: mensaje || "" });
    var ir = function () {
      var t = campo.value.trim();
      if (!t) return;
      err.textContent = "Comprobando…";
      api("ping", {}, t).then(function (r) {
        guardarLocal("token", t); tokenMemoria = t;
        estado.version = Number(r.version) || 1; estado.chat = !!r.chat;
        err.textContent = "Contraseña correcta. Cargando tus datos…";
        cargar();
      }).catch(function (e) { err.textContent = e.noAutorizado ? "La contraseña no es correcta." : textoError(e); });
    };
    campo.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });
    raiz.appendChild(h("div", { class: "entrada" },
      h("h1", { text: "Mi seguimiento" }),
      h("p", { class: "ayuda", text: "Escribe la contraseña que creaste en tu hoja de Google (la propiedad TOKEN). Solo se pide una vez en este dispositivo." }),
      h("label", { for: "tok", text: "Contraseña" }), campo, err,
      h("button", { class: "btn lima", text: "Entrar", onclick: ir }),
      h("button", { class: "btn sec", text: "Cambiar la dirección del servicio", onclick: function () { abrirDireccion(); } })
    ));
  }

  function filaNormal(f) {
    var o = {};
    Object.keys(f || {}).forEach(function (k) { o[k] = f[k]; });
    if ("fecha" in o) o.fecha = normFecha(o.fecha);
    if ("hora" in o) o.hora = normHora(o.hora);
    return o;
  }

  // Lo último que se trajo queda guardado en este teléfono: al abrir la app se ve al instante.
  function guardarCache() {
    if (!estado.tablas) return;
    guardarLocal("datos", JSON.stringify({ url: urlServicio(), version: estado.version, chat: estado.chat, metas: estado.metas, tablas: estado.tablas, desde: estado.desde, guardado: Date.now() }));
  }
  function leerCache() {
    try {
      var c = JSON.parse(leerLocal("datos") || "null");
      if (c && c.url === urlServicio() && c.tablas && c.tablas.comidas) return c;
    } catch (e) { /* guardado dañado: se ignora */ }
    return null;
  }
  function usarCache(c) {
    estado.version = c.version; estado.chat = !!c.chat; estado.metas = c.metas || {};
    estado.tablas = c.tablas; estado.desde = c.desde; estado.cargadoEn = new Date(c.guardado || Date.now());
  }
  function olvidarDatos() { borrarLocal("datos"); estado.tablas = null; estado.version = null; }

  function recibirTodo(r, desde) {
    estado.tablas = {
      comidas: (r.comidas || []).map(filaNormal),
      ejercicio: (r.ejercicio || []).map(filaNormal),
      series_gym: (r.series_gym || []).map(filaNormal),
      medidas: (r.medidas || []).map(filaNormal),
      rutinas: Array.isArray(r.rutinas) ? r.rutinas.map(filaNormal) : null, // null: servicio anterior a la versión 4
      ejercicios: Array.isArray(r.ejercicios) ? r.ejercicios.map(filaNormal) : null // null: servicio anterior a la versión 5
    };
    estado.metas = r.metas || {};
    estado.chat = !!r.chat;
    estado.desde = desde;
    estado.legado = null;
    estado.version = Number(r.version) || 2;
  }

  function cargarLegado() {
    return api("dia", { fecha: estado.fecha }).then(function (r) {
      estado.legado = r.datos;
      estado.metas = (r.datos && r.datos.metas) || {};
      estado.chat = !!(r.datos && r.datos.chat);
      estado.tablas = null;
    });
  }

  function pantallaCargando() {
    raiz.textContent = "";
    // Esqueleto con la forma de la pantalla mientras llegan los datos
    raiz.appendChild(h("div", { class: "esqueleto", role: "status", "aria-label": "Cargando tus datos…" },
      h("div", { class: "sk sk-t" }), h("div", { class: "sk sk-dias" }), h("div", { class: "sk sk-hero" }),
      h("div", { class: "sk-fila" }, h("div", { class: "sk sk-med" }), h("div", { class: "sk sk-med" }), h("div", { class: "sk sk-med" })),
      h("div", { class: "sk sk-lista" }), h("p", { class: "sk-txt", text: "Cargando tus datos…" })));
  }

  /**
   * Trae los datos con UNA sola consulta a Google. silencioso: no oscurece la pantalla
   * (se usa cuando ya hay datos a la vista y solo se actualizan).
   */
  var cargandoAhora = null;
  function cargar(opc) {
    opc = opc || {};
    if (cargandoAhora && opc.silencioso) return cargandoAhora;
    hoy = iso(new Date());
    raiz.classList.add(opc.silencioso ? "actualizando" : "cargando");
    var desde = sumarDias(estado.fecha < hoy ? estado.fecha : hoy, -DIAS_CARGADOS);
    if (estado.tablas && estado.desde && estado.desde < desde) desde = estado.desde > sumarDias(hoy, -400) ? estado.desde : sumarDias(hoy, -400);
    var paso = estado.version !== null && estado.version < 2
      ? cargarLegado()
      : api("leer", { desde: desde }).then(function (r) { recibirTodo(r, desde); }, function (e) {
          // Servicio anterior (versión 1): no conoce «leer»
          if (e && e.message === "Acción desconocida") { estado.version = 1; return cargarLegado(); }
          throw e;
        });
    cargandoAhora = paso.then(function () {
      estado.cargadoEn = new Date();
      raiz.classList.remove("cargando", "actualizando");
      pintar();
      guardarCache();
      migrarEjercicios().then(function (hubo) { if (hubo && !hojaActual) pintar(); });
    }).catch(function (e) {
      raiz.classList.remove("cargando", "actualizando");
      if (opc.silencioso && estado.tablas && !(e && e.noAutorizado)) aviso("Sin conexión con Google: ves lo último guardado.", true);
      else manejarError(e);
    }).then(function () { cargandoAhora = null; });
    return cargandoAhora;
  }

  /** Cambia de día: si los datos ya están en el teléfono, es instantáneo. */
  function irA(fecha) {
    estado.fecha = fecha > hoy ? hoy : fecha;
    if (estado.tablas && estado.desde && estado.fecha >= sumarDias(estado.desde, 7)) pintar();
    else cargar();
  }

  /** Lo que se ve en un día, venga del servicio nuevo o del anterior. */
  function vistaDia() {
    var f = estado.fecha, porHora = function (a, b) { return String(a.hora || "") < String(b.hora || "") ? -1 : 1; };
    if (estado.tablas) {
      var T = estado.tablas;
      var medidas = T.medidas.filter(function (m) { return m.fecha; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
      var hasta = medidas.filter(function (m) { return m.fecha <= f; });
      var conPeso = hasta.filter(function (m) { return !vacio(m.peso_kg); });
      var conCintura = hasta.filter(function (m) { return !vacio(m.cintura_cm); });
      return {
        comidas: T.comidas.filter(function (c) { return c.fecha === f; }).sort(porHora),
        ejercicio: T.ejercicio.filter(function (e) { return e.fecha === f; }),
        series: T.series_gym.filter(function (s) { return s.fecha === f; }),
        medida: medidas.filter(function (m) { return m.fecha === f; })[0] || null,
        ultimoPeso: conPeso.length ? conPeso[conPeso.length - 1] : null,
        ultimaCintura: conCintura.length ? conCintura[conCintura.length - 1] : null,
        pesos: conPeso.slice(-7)
      };
    }
    var d = estado.legado || {};
    return {
      comidas: (d.comidas || []).map(filaNormal).sort(porHora),
      ejercicio: (d.ejercicio || []).map(filaNormal),
      series: (d.series_gym || []).map(filaNormal),
      medida: d.medida || null,
      ultimoPeso: d.ultimoPeso || null,
      ultimaCintura: d.ultimaCintura || null,
      pesos: d.pesos || []
    };
  }

  // ---------- Pantalla "Hoy" ----------
  function lunesDe(fecha) {
    var d = deISO(fecha), dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  }

  /** Series de gym agrupadas por ejercicio, en el orden en que se hicieron. */
  function agruparSeries(series) {
    var grupos = [], porNombre = {};
    series.slice().sort(function (a, b) { return (Number(a.numero_serie) || 0) - (Number(b.numero_serie) || 0); }).forEach(function (s) {
      var k = String(s.ejercicio || "Ejercicio").trim();
      if (!porNombre[k]) { porNombre[k] = { ejercicio: k, rutina: s.rutina, series: [] }; grupos.push(porNombre[k]); }
      porNombre[k].series.push(s);
    });
    return grupos;
  }

  function numMeta(v, def) { return vacio(v) || isNaN(v) ? def : Number(v); }
  /** Meta de calorías de un día = base + ejercicio del día − déficit promedio. */
  function metaDia(kcalEjercicio) {
    var m = estado.metas || {};
    var deficit = (numMeta(m.deficit_min_kcal, 200) + numMeta(m.deficit_max_kcal, 300)) / 2;
    return numMeta(m.kcal_base, 2500) + (kcalEjercicio || 0) - deficit;
  }

  /** Última medición de peso y cintura (cada 3 meses) y cuánto falta para la próxima. */
  function medicion() {
    var meds = estado.tablas ? estado.tablas.medidas : [];
    if (!estado.tablas) {
      var L = estado.legado || {};
      meds = [L.ultimoPeso, L.ultimaCintura].filter(Boolean).map(filaNormal);
    }
    meds = meds.filter(function (x) { return x.fecha && x.fecha <= hoy && tieneMedicion(x); })
      .sort(function (x, y) { return x.fecha < y.fecha ? -1 : 1; });
    var conPeso = meds.filter(function (x) { return !vacio(x.peso_kg); });
    var conCint = meds.filter(function (x) { return !vacio(x.cintura_cm); });
    var ult = meds.length ? meds[meds.length - 1] : null;
    var faltan = ult ? DIAS_MEDICION - Math.round((deISO(hoy) - deISO(ult.fecha)) / 86400000) : 0;
    return {
      lista: meds, peso: conPeso.length ? conPeso[conPeso.length - 1] : null, cintura: conCint.length ? conCint[conCint.length - 1] : null,
      fecha: ult ? ult.fecha : null, faltan: faltan, toca: !ult || faltan <= 0
    };
  }

  function navegacion(activa) {
    var tab = function (clave, nombre, ico, accion) {
      return h("button", { class: "tab" + (activa === clave ? " on" : ""), "aria-label": nombre, onclick: accion }, h("span", { class: "tab-ico", "aria-hidden": "true" }, icono(ico, 22)), h("span", { class: "tab-t", text: nombre }));
    };
    var ir = function (p) { return function () { estado.pantalla = p; if (p === "hoy") estado.fecha = estado.fecha > hoy ? hoy : estado.fecha; pintar(); window.scrollTo(0, 0); }; };
    return h("nav", { class: "nav nav5", "aria-label": "Principal" },
      tab("hoy", "Hoy", "casa", function () { estado.pantalla = "hoy"; irA(iso(new Date())); window.scrollTo(0, 0); }),
      tab("entreno", "Entreno", "mancuerna", ir("entreno")),
      h("button", { class: "fab", "aria-label": "Agregar registro", onclick: function () { abrirAgregar(estado.chat ? "chat" : "pegar"); } }, icono("plus", 28)),
      tab("progreso", "Progreso", "grafica", ir("progreso")),
      tab("cuerpo", "Cuerpo", "persona", ir("cuerpo")));
  }

  // Al cambiar de pantalla, las tarjetas entran en cascada y los números cuentan hasta su valor.
  var pantallaPintada = null;
  var REDUCIR = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function pintar() {
    var nueva = estado.pantalla !== pantallaPintada;
    pantallaPintada = estado.pantalla;
    pintarPantalla();
    if (nueva && !REDUCIR && estado.pantalla !== "sesion") animarEntrada();
  }
  function animarEntrada() {
    raiz.classList.remove("entrando");
    Array.prototype.forEach.call(raiz.children, function (c, i) { c.style.setProperty("--i", Math.min(i, 9)); });
    void raiz.offsetWidth;
    raiz.classList.add("entrando");
    clearTimeout(animarEntrada.t);
    animarEntrada.t = setTimeout(function () { raiz.classList.remove("entrando"); }, 1100);
    raiz.querySelectorAll(".duo b, .res b, .kpi .v, .card .valor, .racha b, .kp-ent b, .hero-bal .big, .hero-num").forEach(contarHasta);
  }
  function contarHasta(el) {
    var t = el.firstChild;
    if (!t || t.nodeType !== 3) { t = el.lastChild; if (!t || t.nodeType !== 3) return; }
    var m = /^(\s*[−+-]?)(\d{1,3}(?:\.\d{3})*|\d+)(,\d+)?(.*)$/.exec(t.nodeValue);
    if (!m) return;
    var fin = Number(m[2].replace(/\./g, "") + (m[3] ? "." + m[3].slice(1) : "")), dec = m[3] ? m[3].length - 1 : 0, t0 = null;
    if (!(fin > 0)) return;
    requestAnimationFrame(function paso(ts) {
      t0 = t0 || ts;
      var p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 4);
      t.nodeValue = m[1] + (p < 1 ? fmt(fin * e, dec) : m[2] + (m[3] || "")) + m[4];
      if (p < 1) requestAnimationFrame(paso);
    });
  }
  window.addEventListener("scroll", function () { document.body.classList.toggle("desplazado", window.scrollY > 24); }, { passive: true });

  function pintarPantalla() {
    if (estado.pantalla === "progreso") return pintarProgreso();
    if (estado.pantalla === "cuerpo") return pintarCuerpo();
    if (estado.pantalla === "entreno") return pintarEntreno();
    if (estado.pantalla === "rutina") return pintarRutina();
    if (estado.pantalla === "sesion") return pintarSesion();
    return pintarHoy();
  }

  function bandas() {
    if (estado.version !== null && estado.version < SERVICIO_REQUERIDO) {
      raiz.appendChild(h("div", { class: "banda" },
        h("b", { text: "Actualiza tu servicio de Google" }),
        h("span", { text: estado.version < 3 ? "Tiene una versión anterior: para guardar tu medición completa (grasa, músculo, cinta métrica) y tus rutinas con fotos hay que actualizarlo. Toma 2 minutos."
          : estado.version < 4 ? "Tiene una versión anterior: para guardar tus rutinas con tus fotos hay que actualizarlo. Toma 2 minutos."
          : "Tiene una versión anterior: para guardar tus ejercicios con sus fotos (y elegirlos en tus rutinas) hay que actualizarlo. Toma 2 minutos." }),
        h("button", { class: "btn lima", text: "Ver cómo", onclick: abrirAjustes })));
    }
    var rep = bandaRepetidos();
    if (rep) raiz.appendChild(rep);
    if (estado.sesion && estado.pantalla !== "sesion") {
      var s = estado.sesion;
      raiz.appendChild(h("button", { type: "button", class: "banda-entreno", onclick: function () { estado.pantalla = "sesion"; pintar(); window.scrollTo(0, 0); } },
        h("span", { class: "emo", "aria-hidden": "true", text: "🏋️" }),
        h("span", { class: "t" }, h("b", { text: "Entreno en curso · " + s.rutina }), h("small", { text: seriesHechas(s) + " de " + seriesTotal(s) + " series · " + minutosSesion(s) + " min" })),
        h("span", { class: "volver", text: "Volver ›" })));
    }
  }

  var EMOJI_COMIDA = { desayuno: ["🍳", "#FFF4D6"], almuerzo: ["🍛", "#E9F7E1"], cena: ["🍲", "#ECEBFD"], snack: ["🍌", "#FDEBE6"] };
  var EMOJI_EJERCICIO = { gym: ["🏋️", "#FFF1E2"], bici: ["🚴", "#E7F0FE"], caminata: ["🚶", "#E9F7E1"] };
  /** Medidor con rayitas (proteína, carbos, grasa): el arco se llena y el número cuenta hasta los gramos. */
  function medidorMacro(nombre, gramos, frac, etiqueta, color, pill, aria) {
    var cx = 80, cy = 82, r = 58, n = 30, s = "", desde = Math.PI * .85, hasta = Math.PI * 2.15;
    var pos = function (a, rr) { return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
    for (var i = 0; i <= n; i++) { var a = desde + (hasta - desde) * i / n, p1 = pos(a, r + 10), p2 = pos(a, r + (i % 5 === 0 ? 17 : 13)); s += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" stroke="rgba(255,255,255,.30)" stroke-width="1.6"/>'; }
    var largo = r * (hasta - desde), a1 = pos(desde, r), b1 = pos(hasta, r);
    var arco = "M" + a1[0].toFixed(1) + " " + a1[1].toFixed(1) + " A" + r + " " + r + " 0 1 1 " + b1[0].toFixed(1) + " " + b1[1].toFixed(1);
    var fin = (largo * (1 - Math.max(0, Math.min(1, frac || 0)))).toFixed(1);
    s += '<path d="' + arco + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12" stroke-linecap="round"/>';
    s += '<path class="prog" d="' + arco + '" fill="none" stroke="' + color + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + largo.toFixed(1) + '" stroke-dashoffset="' + largo.toFixed(1) + '"/>';
    s += '<text class="valor" x="80" y="90" text-anchor="middle" fill="#FFFFFF" stroke="none" font-size="34" font-weight="800">' + fmt(gramos) + "</text>";
    s += '<text x="80" y="110" text-anchor="middle" fill="#A9BBAF" stroke="none" font-size="11.5" font-weight="800" letter-spacing="1.2">' + etiqueta + "</text>";
    var t = document.createElement("template");
    t.innerHTML = '<svg viewBox="0 -2 160 116" aria-hidden="true">' + s + "</svg>";
    var grafico = t.content.firstChild, prog = grafico.querySelector(".prog"), valor = grafico.querySelector(".valor");
    var reducir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducir) prog.setAttribute("stroke-dashoffset", fin);
    else {
      requestAnimationFrame(function () { requestAnimationFrame(function () { prog.style.strokeDashoffset = fin; }); });
      var t0 = null, total = Number(gramos) || 0;
      requestAnimationFrame(function paso(ts) { t0 = t0 || ts; var p = Math.min(1, (ts - t0) / 1100), e = 1 - Math.pow(1 - p, 4); valor.textContent = fmt(total * e); if (p < 1) requestAnimationFrame(paso); });
    }
    return h("div", { class: "med", role: "img", "aria-label": aria },
      h("span", { class: "nom", text: nombre }), grafico,
      h("span", { class: "estado" + (pill[1] === "ambar" ? " ambar" : ""), text: pill[0] }));
  }
  function anilloMacro(pct, color, texto) {
    var C = 2 * Math.PI * 26, p = Math.max(0, Math.min(1, pct));
    var s = svg('<circle cx="32" cy="32" r="26" stroke="#EAF0E6" stroke-width="8"/><circle cx="32" cy="32" r="26" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (p * C).toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 32 32)"/>', 64, 64);
    return h("div", { class: "anillo-m" }, s, h("span", { text: texto }));
  }

  function pintarHoy() {
    var d = vistaDia(), m = estado.metas || {};
    var consumido = sumar(d.comidas, "kcal"), prot = sumar(d.comidas, "proteina_g");
    var carb = sumar(d.comidas, "carbos_g"), gra = sumar(d.comidas, "grasa_g");
    var ejercicio = sumar(d.ejercicio, "kcal");
    var base = numMeta(m.kcal_base, 2500);
    var gastado = base + ejercicio;
    var balance = consumido - gastado;
    var defMin = numMeta(m.deficit_min_kcal, 200), defMax = numMeta(m.deficit_max_kcal, 300);
    var protMin = numMeta(m.proteina_min_g, 130);
    var esHoy = estado.fecha === hoy;
    var fd = deISO(estado.fecha);
    var hora = new Date().getHours();
    var saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
    var lunes = lunesDe(estado.fecha), diasSemana = [];
    for (var i = 0; i < 7; i++) { var x = new Date(lunes); x.setDate(lunes.getDate() + i); diasSemana.push(iso(x)); }
    var conDatos = {};
    if (estado.tablas) ["comidas", "ejercicio", "series_gym"].forEach(function (t) { estado.tablas[t].forEach(function (r) { conDatos[r.fecha] = true; }); });
    var sueno = d.medida && !vacio(d.medida.horas_sueno) ? Number(d.medida.horas_sueno) : null;

    raiz.textContent = "";
    bandas();
    raiz.appendChild(h("div", { class: "top" },
      h("div", {}, h("div", { class: "sub", text: cap(DIAS_LARGO[fd.getDay()]) + " " + fd.getDate() + " de " + MESES_LARGO[fd.getMonth()] }),
        h("div", { class: "titulo", text: esHoy ? saludo : "Resumen del " + DIAS_LARGO[fd.getDay()] + " " + corta(estado.fecha) })),
      h("div", { class: "top-btns" },
        h("button", { class: "icono-btn", "aria-label": "Semana anterior", onclick: function () { irA(sumarDias(estado.fecha, -7)); } }, icono("atras", 18)),
        h("button", { class: "icono-btn", "aria-label": "Semana siguiente", disabled: diasSemana[6] >= hoy, onclick: function () { irA(sumarDias(estado.fecha, 7)); } }, icono("sig", 18)),
        botonAjustes())));
    raiz.appendChild(h("div", { class: "dias" }, diasSemana.map(function (f) {
      var dd = deISO(f);
      return h("button", { class: "dia" + (f === estado.fecha ? " on" : ""), disabled: f > hoy, "aria-label": DIAS_LARGO[dd.getDay()] + " " + dd.getDate(), onclick: function () { irA(f); } },
        h("span", { text: DIAS_CORTO[(dd.getDay() + 6) % 7] }), h("b", { text: String(dd.getDate()) }), h("i", { class: conDatos[f] ? "si" : "" }));
    })));

    // Energía del día: lo que comiste contra lo que gastaste
    var maxE = Math.max(consumido, gastado, 1);
    var enMeta = -balance >= defMin && -balance <= defMax;
    var deficit = -balance, sinCom = !d.comidas.length;
    var escMax = Math.max(defMax * 3, sinCom ? 0 : deficit + 150, 1000), escMin = -Math.max(500, escMax * .3);
    var pos = function (v) { return (Math.max(escMin, Math.min(escMax, v)) - escMin) / (escMax - escMin) * 100; };
    var estadoMeta = sinCom ? "Sin comidas aún" : enMeta ? "En tu meta" : deficit > defMax ? "Más déficit que la meta" : deficit > 0 ? "Menos déficit que la meta" : "En superávit";
    raiz.appendChild(h("div", { class: "hero hero-hoy" },
      h("div", { class: "hero-fila" }, h("div", { class: "hero-t", text: esHoy ? "Energía de hoy" : "Energía del día" }),
        h("span", { class: "hero-estado" + (enMeta && !sinCom ? " ok" : ""), text: (enMeta && !sinCom ? "✓ " : "") + estadoMeta })),
      h("div", { class: "hero-num" }, (balance < 0 ? "−" : balance > 0 ? "+" : "") + fmt(Math.abs(balance)), h("span", { text: " kcal" })),
      h("div", { class: "hero-sub", text: (sinCom ? "Aún sin comidas" : balance <= 0 ? "Déficit " + (esHoy ? "de hoy" : "del día") : "Superávit " + (esHoy ? "de hoy" : "del día")) + " · meta −" + fmt(defMin) + " a −" + fmt(defMax) }),
      h("div", { class: "meta-barra", role: "img", "aria-label": "Tu déficit contra la meta de " + fmt(defMin) + " a " + fmt(defMax) + " kcal" },
        h("div", { class: "meta-cero", style: "left:" + pos(0).toFixed(1) + "%" }),
        h("div", { class: "meta-banda", style: "left:" + pos(defMin).toFixed(1) + "%;width:" + (pos(defMax) - pos(defMin)).toFixed(1) + "%" }),
        sinCom ? null : h("div", { class: "meta-punto", style: "left:" + pos(deficit).toFixed(1) + "%" })),
      h("div", { class: "meta-ejes" }, h("span", { text: "Superávit" }), h("span", { text: "Meta" , style: "left:" + ((pos(defMin) + pos(defMax)) / 2).toFixed(1) + "%" }), h("span", { text: "Déficit" })),
      h("div", { class: "duo" },
        h("div", {}, h("small", { text: "🍽️ Consumido" }), h("b", {}, fmt(consumido), h("span", { text: " kcal" })),
          h("div", { class: "pista" }, h("div", { style: "width:" + (consumido / maxE * 100).toFixed(1) + "%;background:#0F2A1D" })),
          h("em", { text: plural(d.comidas.length, "comida", "comidas") })),
        h("div", {}, h("small", { text: "🔥 Gastado" }), h("b", {}, fmt(gastado), h("span", { text: " kcal" })),
          h("div", { class: "pista" }, h("div", { style: "width:" + (gastado / maxE * 100).toFixed(1) + "%;background:#2E7D32" })),
          h("em", { text: fmt(base) + " base" + (ejercicio ? " + " + fmt(ejercicio) + " ejerc." : "") })))));

    // Macros
    var kT = prot * 4 + carb * 4 + gra * 9 || 1;
    var protMax = numMeta(m.proteina_max_g, 160), sinComida = !d.comidas.length;
    var pctC = Math.round(carb * 4 / kT * 100), pctG = Math.round(gra * 9 / kT * 100);
    raiz.appendChild(h("div", { class: "macros medidores" },
      medidorMacro("Proteína", prot, prot / protMin, "G DE " + fmt(protMin), "#B8F05A",
        sinComida ? ["Sin comidas", "ok"] : prot < protMin ? ["Faltan " + fmt(protMin - prot) + " g", "ambar"] : prot <= protMax ? ["✓ En meta", "ok"] : ["+" + fmt(prot - protMax) + " g", "ambar"],
        "Proteína: " + fmt(prot) + " g de " + fmt(protMin) + " g de meta"),
      medidorMacro("Carbos", carb, carb * 4 / kT, pctC + " % KCAL", "#5FD69A", [fmt(carb * 4) + " kcal", "ok"], "Carbos: " + fmt(carb) + " g, " + pctC + " % de tus calorías"),
      medidorMacro("Grasa", gra, gra * 9 / kT, pctG + " % KCAL", "#F5B04D", [fmt(gra * 9) + " kcal", "ok"], "Grasa: " + fmt(gra) + " g, " + pctG + " % de tus calorías")));

    // Sueño y entreno
    var grupos = agruparSeries(d.series);
    var entrenoTxt = d.ejercicio.length ? d.ejercicio.map(function (e) { return cap(e.tipo); }).join(" + ") : grupos.length ? "Gym" : "Descanso";
    var entrenoSub = d.ejercicio.length ? sumar(d.ejercicio, "duracion_min") + " min · " + fmt(ejercicio) + " kcal" : grupos.length ? plural(grupos.length, "ejercicio", "ejercicios") : "Toca para registrar";
    raiz.appendChild(h("div", { class: "dos" },
      h("button", { type: "button", class: "card tocable", "aria-label": "Registrar horas de sueño", onclick: function () { abrirAgregar("medidas", { enfocar: "horas_sueno" }); } },
        h("div", { class: "cab" }, h("span", { class: "chip-ico", style: "background:#E7F0FE", text: "🌙" }), h("span", { text: "Sueño" }), h("span", { class: "mas", "aria-hidden": "true", text: "+" })),
        h("div", { class: "valor" }, sueno === null ? "—" : fmt(sueno, 1), " ", h("small", { text: "h" })),
        h("div", { class: "nota", text: sueno === null ? "Toca para registrar" : "Meta 8 h" + (sueno < 8 ? " · faltó " + fmt(8 - sueno, 1) + " h" : " ✓") })),
      h("button", { type: "button", class: "card tocable", "aria-label": d.ejercicio.length || grupos.length ? "Ver entreno" : "Registrar ejercicio",
        onclick: function () { if (d.ejercicio.length || grupos.length) { estado.pantalla = "entreno"; estado.tabEntreno = "semana"; estado.semanaEntreno = Math.round((lunesDe(estado.fecha) - lunesDe(hoy)) / 604800000); estado.diaEntreno = estado.fecha; pintar(); window.scrollTo(0, 0); } else abrirAgregar("ejercicio"); } },
        h("div", { class: "cab" }, h("span", { class: "chip-ico", style: "background:#FFF1E2", text: "🏋️" }), h("span", { text: "Entreno" }), h("span", { class: "mas", "aria-hidden": "true", text: "+" })),
        h("div", { class: "valor valor-t", text: entrenoTxt }),
        h("div", { class: "nota", text: entrenoSub }))));

    // Comidas
    raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Comidas" }), h("span", { text: d.comidas.length ? plural(d.comidas.length, "registro", "registros") : "" })));
    raiz.appendChild(d.comidas.length
      ? h("div", { class: "lista comidas" }, d.comidas.map(function (c) {
          var em = EMOJI_COMIDA[c.tipo_comida] || EMOJI_COMIDA.snack;
          return h("button", { class: "plato", "aria-label": c.tipo_comida + ": " + c.descripcion, onclick: function () { detalleComida(c); } },
            h("span", { class: "emo", style: "background:" + em[1], text: em[0] }),
            h("div", { class: "t" }, h("b", { text: cap(c.tipo_comida) + (c.hora ? " · " + c.hora : "") }), h("div", { class: "desc", text: c.descripcion })),
            h("div", { class: "k" }, h("b", { text: vacio(c.kcal) ? "—" : fmt(c.kcal) }), h("small", { text: vacio(c.proteina_g) ? "kcal" : fmt(c.proteina_g) + " g prot." })));
        }))
      : h("div", { class: "vacio", text: "Aún no hay comidas en este día. Toca el + para agregar." }));

    if (d.ejercicio.length) {
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Ejercicio" })));
      raiz.appendChild(h("div", { class: "lista" }, d.ejercicio.map(function (e) {
        var em = EMOJI_EJERCICIO[e.tipo] || ["🏃", "#E9F7E1"];
        return h("button", { class: "item con-emo", onclick: function () { detalleEjercicio(e); } },
          h("span", { class: "emo", style: "background:" + em[1], text: em[0] }),
          h("div", { class: "t" }, h("b", { text: cap(e.tipo) + (e.duracion_min ? " · " + fmt(e.duracion_min) + " min" : "") }),
            h("span", { text: (vacio(e.kcal) ? "" : fmt(e.kcal) + " kcal · ") + (e.notas || e.fuente || "manual") })));
      })));
    }
    if (grupos.length) {
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Gym" }), h("span", { text: plural(d.series.length, "serie", "series") })));
      raiz.appendChild(h("div", { class: "lista" }, grupos.map(function (g) {
        return h("button", { class: "item con-emo", onclick: function () { detalleGym(g); } },
          h("span", { class: "emo", style: "background:#FFF1E2", text: "🏋️" }),
          h("div", { class: "t" }, h("b", { text: g.ejercicio + " · " + plural(g.series.length, "serie", "series") }),
            h("span", { text: g.series.map(function (s) { return fmt(s.peso_kg, 1) + " kg × " + fmt(s.repeticiones); }).join(" · ") })));
      })));
    }
    raiz.appendChild(navegacion("hoy"));
  }

  // ---------- Pantalla "Progreso" ----------
  var COLOR = { tinta: "#0F2A1D", verde: "#2FA36B", ambar: "#F0A43A", banda: "#E3F5E8", rejilla: "#EEF1EB", texto: "#62716A", azul: "#4C8DF6", azulClaro: "#A9C8FB", deficit: "#2FA36B", cintura: "#0E6B47", lima: "#B8F05A" };
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fechaLarga(f) { var d = deISO(f); return cap(DIAS_LARGO[d.getDay()]) + " " + corta(f); }

  /**
   * Gráfica simple en SVG. puntos: [{x: 0..1, v, txt}] ; tipo "barras" o "linea".
   * Al tocar una barra o un punto, la línea de arriba muestra el dato exacto.
   */
  function grafica(o) {
    var W = 340, H = o.alto || 150, L = o.izq || 38, R = W - 6, T = 8, B = H - 20;
    var x = function (p) { return L + (R - L) * p; };
    var y = function (v) { return T + (B - T) * (1 - (v - o.min) / (o.max - o.min)); };
    var s = "";
    o.marcas.forEach(function (t) {
      s += '<line x1="' + L + '" x2="' + R + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + COLOR.rejilla + '"/>';
      s += '<text x="' + (L - 6) + '" y="' + (y(t) + 3).toFixed(1) + '" text-anchor="end">' + esc(o.fmtEje ? o.fmtEje(t) : fmt(t)) + "</text>";
    });
    (o.fechas || []).forEach(function (f, i, arr) {
      var anc = i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle";
      s += '<text x="' + x(f[0]).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="' + anc + '">' + esc(f[1]) + "</text>";
    });
    if (o.banda) s += '<rect x="' + L + '" width="' + (R - L) + '" y="' + y(o.banda[1]).toFixed(1) + '" height="' + (y(o.banda[0]) - y(o.banda[1])).toFixed(1) + '" fill="' + COLOR.banda + '"/>';
    if (o.cero && o.min < 0 && o.max > 0) s += '<line x1="' + L + '" x2="' + R + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" stroke="' + COLOR.tinta + '" stroke-width="1.2"/>';
    var hits = "";
    var n = o.n || o.puntos.length;
    var paso = (R - L) / Math.max(1, n);
    if (o.tipo === "barras") {
      var bw = Math.max(2, Math.min(18, paso - 2));
      o.puntos.forEach(function (p, i) {
        var cx = L + paso * (p.i + 0.5), top = y(Math.max(o.min, Math.min(o.max, p.v))), base = y(Math.max(o.min, 0));
        var r = Math.min(3, bw / 2, Math.abs(base - top));
        if (p.v < 0) s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + base.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, top - base).toFixed(1) + '" rx="' + r.toFixed(1) + '" fill="' + p.color + '"/>';
        else s += '<path d="M' + (cx - bw / 2).toFixed(1) + "," + base.toFixed(1) + "V" + (top + r).toFixed(1) + "q0,-" + r + " " + r + ",-" + r + "h" + (bw - 2 * r).toFixed(1) + "q" + r + ",0 " + r + "," + r + "V" + base.toFixed(1) + 'Z" fill="' + p.color + '"/>';
        if (p.meta !== undefined) s += '<line x1="' + (cx - paso / 2).toFixed(1) + '" x2="' + (cx + paso / 2).toFixed(1) + '" y1="' + y(p.meta).toFixed(1) + '" y2="' + y(p.meta).toFixed(1) + '" stroke="' + COLOR.tinta + '" stroke-width="2"/>';
        hits += '<rect class="hit" data-i="' + i + '" x="' + (cx - paso / 2).toFixed(1) + '" y="' + T + '" width="' + paso.toFixed(1) + '" height="' + (B - T) + '" fill="transparent"/>';
      });
      if (o.linea && o.linea.length) s += '<path d="' + o.linea.map(function (q, k) { return (k ? "L" : "M") + (L + paso * (q.i + 0.5)).toFixed(1) + "," + y(q.v).toFixed(1); }).join("") + '" fill="none" stroke="' + COLOR.tinta + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
      if (o.lineaFija !== undefined) s += '<line x1="' + L + '" x2="' + R + '" y1="' + y(o.lineaFija).toFixed(1) + '" y2="' + y(o.lineaFija).toFixed(1) + '" stroke="' + COLOR.tinta + '" stroke-width="2"/>';
    } else {
      var px = function (p) { return L + (R - L) * p.x; };
      if (o.tendencia) s += '<path d="' + o.tendencia.map(function (p, i) { return (i ? "L" : "M") + px(p).toFixed(1) + "," + y(p.v).toFixed(1); }).join("") + '" fill="none" stroke="' + COLOR.tinta + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
      if (o.area && o.puntos.length > 1) s += '<path d="' + o.puntos.map(function (p, i) { return (i ? "L" : "M") + px(p).toFixed(1) + "," + y(p.v).toFixed(1); }).join("") + "L" + px(o.puntos[o.puntos.length - 1]).toFixed(1) + "," + y(0).toFixed(1) + "L" + px(o.puntos[0]).toFixed(1) + "," + y(0).toFixed(1) + 'Z" fill="rgba(140,198,63,.25)"/>';
      if (o.unir && o.puntos.length > 1) s += '<path d="' + o.puntos.map(function (p, i) { return (i ? "L" : "M") + px(p).toFixed(1) + "," + y(p.v).toFixed(1); }).join("") + '" fill="none" stroke="' + o.color + '" stroke-width="2" stroke-linejoin="round"/>';
      var radio = o.puntos.length > 40 ? 2.5 : 4;
      o.puntos.forEach(function (p, i) {
        if (!o.sinPuntos || i === o.puntos.length - 1) s += '<circle cx="' + px(p).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + radio + '" fill="' + (o.relleno || o.color) + '" stroke="' + (o.borde || "#fff") + '" stroke-width="2"/>';
        hits += '<circle class="hit" data-i="' + i + '" cx="' + px(p).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="14" fill="transparent"/>';
      });
      var u = o.puntos[o.puntos.length - 1];
      if (u && o.etiquetaFinal) s += '<text class="etq" x="' + Math.min(px(u), R - 2).toFixed(1) + '" y="' + (y(u.v) - 10).toFixed(1) + '" text-anchor="end">' + esc(o.etiquetaFinal) + "</text>";
    }
    var t = document.createElement("template");
    t.innerHTML = '<svg class="graf-svg" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + esc(o.resumen || "") + '">' + s + hits + "</svg>";
    var el = t.content.firstChild;
    var dato = h("div", { class: "dato", "aria-live": "polite", text: o.ayuda || "Toca una barra o un punto para ver el dato." });
    var elegido = null;
    function mostrar(e) {
      var i = e.target.getAttribute && e.target.getAttribute("data-i");
      if (i === null || i === undefined) return;
      dato.textContent = o.puntos[+i].txt;
      dato.classList.add("on");
      if (elegido) elegido.classList.remove("sel");
      elegido = e.target; elegido.classList.add("sel");
    }
    el.addEventListener("click", mostrar);
    el.addEventListener("mousemove", mostrar);
    return h("div", {}, dato, el);
  }

  function leyenda(items) {
    return h("div", { class: "ley" }, items.map(function (it) { return h("span", {}, h("i", { class: it[2] || "", style: "background:" + it[0] }), it[1]); }));
  }
  function tarjetaGraf(titulo, desc, extra) {
    return h("div", { class: "graf" }, h("h3", { text: titulo }), desc ? h("div", { class: "d", text: desc }) : null, extra);
  }
  function marcasDe(min, max, n) {
    var paso = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000].filter(function (p) { return (max - min) / p <= (n || 4); })[0] || 1000;
    var out = [];
    for (var v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) out.push(+v.toFixed(2));
    return out;
  }
  function fechasEje(dias) {
    var n = dias.length;
    return [[0.5 / n, corta(dias[0])], [0.5, corta(dias[Math.floor((n - 1) / 2)])], [1 - 0.5 / n, corta(dias[n - 1])]];
  }
  function signo(v, dec, u) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), dec) + " " + u; }

  // Si el periodo elegido empieza antes de lo que hay en el teléfono, se traen esas fechas una vez.
  var cargandoRango = null, rangoFallido = null;
  function asegurarDesde(f) {
    if (!estado.tablas || !estado.desde || estado.desde <= f || cargandoRango || rangoFallido === f) return false;
    cargandoRango = api("leer", { desde: f }).then(function (r) { recibirTodo(r, f); guardarCache(); }, function (e) {
      rangoFallido = f;
      aviso("No pude traer esas fechas: " + (e && e.message ? e.message : "error"), true);
    }).then(function () { cargandoRango = null; if (estado.pantalla === "progreso" && !hojaActual) pintar(); });
    return true;
  }

  function rangoElegido() {
    var p = estado.periodo, ini, fin = hoy;
    if (p === "mes") ini = hoy.slice(0, 8) + "01";
    else if (p === "fechas" && estado.rango) { ini = estado.rango.desde; fin = estado.rango.hasta; }
    else ini = sumarDias(hoy, -((Number(p) || 30) - 1));
    if (ini > fin) { var x = ini; ini = fin; fin = x; }
    var dias = [];
    for (var f = ini; f <= fin; f = sumarDias(f, 1)) dias.push(f);
    return { ini: ini, fin: fin, dias: dias };
  }

  /** Totales por día de todo lo que hay en el teléfono. */
  function totalesPorDia() {
    var T = estado.tablas, porDia = {};
    function dia(f) { return porDia[f] || (porDia[f] = { kcal: 0, prot: 0, carb: 0, gra: 0, comidas: 0, porTipo: {}, ejercicio: 0, sesiones: [], gym: false, sueno: null }); }
    T.comidas.forEach(function (c) {
      if (!c.fecha) return;
      var d = dia(c.fecha), k = Number(c.kcal) || 0;
      d.kcal += k; d.prot += Number(c.proteina_g) || 0; d.carb += Number(c.carbos_g) || 0; d.gra += Number(c.grasa_g) || 0; d.comidas++;
      var t = c.tipo_comida || "snack"; d.porTipo[t] = (d.porTipo[t] || 0) + k;
    });
    T.ejercicio.forEach(function (e) { if (!e.fecha) return; var d = dia(e.fecha); d.ejercicio += Number(e.kcal) || 0; d.sesiones.push({ tipo: e.tipo || "otro", kcal: Number(e.kcal) || 0 }); });
    T.series_gym.forEach(function (s) { if (s.fecha) dia(s.fecha).gym = true; });
    T.medidas.forEach(function (x) { if (x.fecha && !vacio(x.horas_sueno)) dia(x.fecha).sueno = Number(x.horas_sueno); });
    return porDia;
  }
  var VACIO_DIA = { kcal: 0, prot: 0, carb: 0, gra: 0, comidas: 0, porTipo: {}, ejercicio: 0, sesiones: [], gym: false, sueno: null };
  function entrenoEse(d) { return d.sesiones.length > 0 || d.gym; }

  /** El consolidado de una lista de días (con el filtro de días ya aplicado). */
  function consolidado(dias, porDia) {
    var m = estado.metas || {}, base = numMeta(m.kcal_base, 2500), protMin = numMeta(m.proteina_min_g, 130);
    var r = { dias: dias.length, registrados: 0, consumido: 0, gastado: 0, prot: 0, carb: 0, gra: 0, diasProt: 0, sueno: 0, noches: 0, noches8: 0, sesiones: 0, tipos: {}, quemado: 0, porTipo: {} };
    dias.forEach(function (f) {
      var d = porDia[f] || VACIO_DIA;
      d.sesiones.forEach(function (s) { r.sesiones++; r.tipos[s.tipo] = (r.tipos[s.tipo] || { n: 0, kcal: 0 }); r.tipos[s.tipo].n++; r.tipos[s.tipo].kcal += s.kcal; r.quemado += s.kcal; });
      if (d.gym && !d.sesiones.some(function (s) { return s.tipo === "gym"; })) { r.sesiones++; r.tipos.gym = r.tipos.gym || { n: 0, kcal: 0 }; r.tipos.gym.n++; }
      if (d.sueno !== null) { r.sueno += d.sueno; r.noches++; if (d.sueno >= 8) r.noches8++; }
      if (!d.comidas) return;
      r.registrados++;
      r.consumido += d.kcal; r.gastado += base + d.ejercicio;
      r.prot += d.prot; r.carb += d.carb; r.gra += d.gra;
      if (d.prot >= protMin) r.diasProt++;
      Object.keys(d.porTipo).forEach(function (t) { r.porTipo[t] = (r.porTipo[t] || 0) + d.porTipo[t]; });
    });
    r.balance = r.consumido - r.gastado;
    var n = r.registrados || 1;
    r.consumidoDia = r.consumido / n; r.gastadoDia = r.gastado / n; r.balanceDia = r.balance / n;
    r.protDia = r.prot / n; r.carbDia = r.carb / n; r.graDia = r.gra / n;
    r.suenoProm = r.noches ? r.sueno / r.noches : null;
    return r;
  }

  function botonAjustes() { return h("button", { class: "icono-btn", "aria-label": "Ajustes", onclick: abrirAjustes }, icono("ajustes", 20)); }
  function encabezado(sub, titulo) {
    raiz.appendChild(h("div", { class: "top" }, h("div", {}, h("div", { class: "sub", text: sub }), h("div", { class: "titulo", text: titulo })), botonAjustes()));
  }
  /** Tarjeta con una pregunta, la respuesta en palabras (✓ o !) y su gráfica. */
  function pregunta(num, tema, titulo, bien, respuesta, contenido) {
    return h("div", { class: "graf q" },
      h("div", { class: "q-n", text: num + " · " + tema }),
      h("h3", { text: titulo }),
      respuesta ? h("div", { class: "resp" + (bien ? "" : " amb") }, h("span", { class: "s", "aria-hidden": "true", text: bien ? "✓" : "!" }), h("span", { text: respuesta })) : null,
      contenido);
  }

  function pintarProgreso() {
    raiz.textContent = "";
    bandas();
    encabezado("Tu avance", "Progreso");
    if (!estado.tablas) {
      raiz.appendChild(h("div", { class: "vacio", text: "Para ver tu progreso, la app necesita la versión nueva del servicio de Google (mira el aviso amarillo)." }));
      raiz.appendChild(navegacion("progreso"));
      return;
    }
    var m = estado.metas || {};
    var base = numMeta(m.kcal_base, 2500), protMin = numMeta(m.proteina_min_g, 130), protMax = numMeta(m.proteina_max_g, 160);
    var defMin = numMeta(m.deficit_min_kcal, 200), defMax = numMeta(m.deficit_max_kcal, 300);
    var R = rangoElegido();
    var prevIni = sumarDias(R.ini, -R.dias.length), prevDias = [];
    for (var f0 = prevIni; f0 < R.ini; f0 = sumarDias(f0, 1)) prevDias.push(f0);

    // ---- Filtros
    function pill(texto, activo, accion, etiqueta) {
      return h("button", { type: "button", class: "pill" + (activo ? " on" : ""), "aria-pressed": activo ? "true" : "false", "aria-label": etiqueta || texto, text: texto, onclick: accion });
    }
    var p = estado.periodo, fp = estado.filtroDias;
    var filaFechas = null;
    if (p === "fechas") {
      var rg = estado.rango || { desde: sumarDias(hoy, -29), hasta: hoy };
      var cambiar = function () {
        var d1 = document.getElementById("f-desde").value, d2 = document.getElementById("f-hasta").value;
        if (!d1 || !d2) return;
        var a1 = d1 <= d2 ? d1 : d2, a2 = d1 <= d2 ? d2 : d1;
        estado.rango = { desde: a1, hasta: a2 > hoy ? hoy : a2 };
        pintar();
      };
      filaFechas = h("div", { class: "fechas-f" },
        h("label", {}, "Desde", h("input", { type: "date", id: "f-desde", value: rg.desde, max: hoy, onchange: cambiar })),
        h("label", {}, "Hasta", h("input", { type: "date", id: "f-hasta", value: rg.hasta, max: hoy, onchange: cambiar })));
    }
    raiz.appendChild(h("div", { class: "filtros" },
      h("div", { class: "seg", role: "group", "aria-label": "Periodo" },
        [7, 30, 90].map(function (n) { return pill(n + " d", p === n, function () { estado.periodo = n; pintar(); }, n + " días"); }),
        pill("Mes", p === "mes", function () { estado.periodo = "mes"; pintar(); }, "Este mes"),
        pill("📅", p === "fechas", function () { estado.periodo = "fechas"; if (!estado.rango) estado.rango = { desde: sumarDias(hoy, -29), hasta: hoy }; pintar(); }, "Elegir fechas")),
      filaFechas,
      h("div", { class: "fila-f", role: "group", "aria-label": "Días" },
        h("div", { class: "pills" },
          pill("Todos", fp === "todos", function () { estado.filtroDias = "todos"; pintar(); }),
          pill("Con entreno", fp === "entreno", function () { estado.filtroDias = "entreno"; pintar(); }),
          pill("Descanso", fp === "descanso", function () { estado.filtroDias = "descanso"; pintar(); }))),
      h("div", { class: "rango", text: corta(R.ini) + " – " + corta(R.fin) + " · " + plural(R.dias.length, "día", "días") })));

    // Trae de la hoja las fechas que falten (las del periodo y las anteriores, para comparar)
    if ((asegurarDesde(prevIni) || cargandoRango) && R.ini < estado.desde) {
      raiz.appendChild(h("div", { class: "graf cargando-inicio", style: "min-height:160px" }, h("div", { class: "girando" }), h("p", { text: "Trayendo esas fechas de tu hoja…" })));
      raiz.appendChild(navegacion("progreso"));
      return;
    }

    var porDia = totalesPorDia();
    var pasa = function (f) { var d = porDia[f] || VACIO_DIA; return fp === "todos" || (fp === "entreno" ? entrenoEse(d) : !entrenoEse(d)); };
    var diasF = R.dias.filter(pasa);
    var C = consolidado(diasF, porDia);
    var P = estado.desde && estado.desde <= prevIni ? consolidado(prevDias.filter(pasa), porDia) : null;
    raiz.querySelector(".filtros .rango").textContent += " · " + C.registrados + " con comidas";
    var kcalF = function (v) { return (v < 0 ? "−" : v > 0 ? "+" : "") + fmt(Math.abs(Math.round(v))); };

    // ---- Balance del periodo
    var notaBal;
    if (!C.registrados) notaBal = "Sin comidas registradas en estos días.";
    else {
      var defDia = -C.balanceDia;
      notaBal = "≈ " + fmt(Math.abs(C.balance) / 7700, 1) + " kg de grasa " + (C.balance <= 0 ? "menos" : "más") + " (estimado) · " +
        (defDia >= defMin && defDia <= defMax ? "✓ en tu meta de déficit" : defDia > defMax ? "déficit mayor que tu meta" : defDia > 0 ? "menos déficit que tu meta" : "en superávit");
    }
    raiz.appendChild(h("div", { class: "hero-bal" },
      h("div", { class: "k", text: "Balance del periodo" }),
      h("div", { class: "big" }, C.registrados ? kcalF(C.balance) : "—", h("small", { text: " kcal" })),
      h("div", { class: "sub2", text: notaBal }),
      h("div", { class: "tres" },
        h("div", {}, h("b", { text: C.registrados ? fmt(C.consumidoDia) : "—" }), h("span", { text: "Comido / día" })),
        h("div", {}, h("b", { text: C.registrados ? fmt(C.gastadoDia) : "—" }), h("span", { text: "Gastado / día" })),
        h("div", {}, h("b", { text: C.registrados ? kcalF(C.balanceDia) : "—" }), h("span", { text: C.balanceDia <= 0 ? "Déficit / día" : "Superávit / día" })))));

    // ---- Indicadores con comparación
    function delta(actual, previo, dec, unidad, mejorSiSube) {
      if (P === null || previo === null || actual === null || isNaN(previo) || isNaN(actual)) return null;
      var dlt = actual - previo;
      if (Math.abs(dlt) < (dec ? 0.05 : 0.5)) return h("span", { class: "delta", text: "= igual" });
      var bueno = mejorSiSube ? dlt > 0 : dlt < 0;
      return h("span", { class: "delta " + (bueno ? "up" : "dn"), text: (dlt > 0 ? "▲ " : "▼ ") + fmt(Math.abs(dlt), dec) + (unidad ? " " + unidad : "") });
    }
    // Minigráfica de tendencia (día a día del periodo) para cada indicador
    function tendencia(valorDe, color) {
      var vals = diasF.map(function (f) { return valorDe(porDia[f] || VACIO_DIA); });
      var con = vals.filter(function (v) { return v !== null; });
      if (con.length < 2) return null;
      var mx = Math.max.apply(null, con), mn = Math.min.apply(null, con), W = 120, H = 30, n = vals.length;
      var pts = [];
      vals.forEach(function (v, i) { if (v !== null) pts.push([(n < 2 ? 0 : i / (n - 1)) * W, H - 3 - (mx === mn ? .5 : (v - mn) / (mx - mn)) * (H - 6)]); });
      var linea = pts.map(function (q, i) { return (i ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1); }).join("");
      var area = linea + "L" + pts[pts.length - 1][0].toFixed(1) + "," + H + "L" + pts[0][0].toFixed(1) + "," + H + "Z";
      var id = "sp" + Math.random().toString(36).slice(2, 8), u = pts[pts.length - 1];
      var t = document.createElement("template");
      t.innerHTML = '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#' + id + ')"/><path d="' + linea + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
        '<circle cx="' + u[0].toFixed(1) + '" cy="' + u[1].toFixed(1) + '" r="2.6" fill="' + color + '"/></svg>';
      return t.content.firstChild;
    }
    function kpi(k, d, valor, unidad, nota, ico, color, spark) {
      return h("div", { class: "kpi" }, h("span", { class: "k" }, h("span", { class: "kpi-ico", style: "color:" + color + ";background:" + color + "1F", "aria-hidden": "true" }, icono(ico, 16)), h("span", { class: "kpi-nom", text: k })),
        h("span", { class: "kpi-fila" }, h("span", { class: "v" }, valor, unidad ? h("small", { text: " " + unidad }) : null), d), spark, h("span", { class: "n", text: nota }));
    }
    var tiposTxt = Object.keys(C.tipos).sort(function (x, y) { return C.tipos[y].n - C.tipos[x].n; }).map(function (t) { return C.tipos[t].n + " " + t; }).join(" · ");
    raiz.appendChild(h("div", { class: "kpis" },
      kpi("Proteína", delta(C.registrados ? C.protDia : null, P && P.registrados ? P.protDia : null, 0, "g", true),
        C.registrados ? fmt(C.protDia) : "—", "g/día", C.registrados ? C.diasProt + " de " + C.registrados + " días en meta" : "Sin comidas",
        "cubiertos", "#2FA36B", tendencia(function (d) { return d.comidas ? d.prot : null; }, "#2FA36B")),
      kpi("Sueño", delta(C.suenoProm, P ? P.suenoProm : null, 1, "", true),
        C.suenoProm === null ? "—" : fmt(C.suenoProm, 1), C.suenoProm === null ? "" : "h", C.noches ? plural(C.noches8, "noche", "noches") + " de 8 h" : "Sin registrar",
        "luna", "#4C8DF6", tendencia(function (d) { return d.sueno; }, "#4C8DF6")),
      kpi("Entrenos", delta(C.sesiones, P ? P.sesiones : null, 0, "", true), String(C.sesiones), "", tiposTxt || "Ninguno", "mancuerna", "#0E6B47", null),
      kpi("Quemado", delta(C.quemado, P ? P.quemado : null, 0, "kcal", true), fmt(C.quemado), "kcal", "en ejercicio", "fuego", "#E8890C", tendencia(function (d) { return d.ejercicio; }, "#E8890C"))));
    raiz.appendChild(h("div", { class: "nota-centro", text: P ? "▲▼ comparado con los " + prevDias.length + " días anteriores" : "La comparación con el periodo anterior aparece cuando hay datos de esas fechas." }));

    var ejeX = fechasEje(R.dias), N = R.dias.length;
    var indice = {}; R.dias.forEach(function (f, i) { indice[f] = i; });
    var conComida = diasF.filter(function (f) { return porDia[f] && porDia[f].comidas; });
    var ejeKcal = function (t) { return (t < 0 ? "−" : "") + (Math.abs(t) >= 1000 ? fmt(Math.abs(t) / 1000, 1) + " mil" : fmt(Math.abs(t))); };

    // 1 · Energía
    if (!conComida.length) raiz.appendChild(pregunta(1, "Energía", "¿Comí más o menos de lo que gasté?", true, "", h("div", { class: "vacio", text: "No hay comidas registradas con este filtro." })));
    else {
      var ptsVs = [], lineaG = [], maxV = 0, diasDef = 0;
      diasF.forEach(function (f) {
        var d = porDia[f] || VACIO_DIA, g = base + d.ejercicio;
        lineaG.push({ i: indice[f], v: g }); maxV = Math.max(maxV, g);
        if (!d.comidas) return;
        maxV = Math.max(maxV, d.kcal);
        var bal = d.kcal - g;
        if (bal <= 0) diasDef++;
        ptsVs.push({ i: indice[f], v: d.kcal, color: bal <= 0 ? COLOR.verde : COLOR.ambar,
          txt: fechaLarga(f) + " · comiste " + fmt(d.kcal) + " · gastaste " + fmt(g) + (d.ejercicio ? " (ejercicio " + fmt(d.ejercicio) + ")" : "") + " · " + (bal <= 0 ? "déficit " : "superávit ") + kcalF(bal) });
      });
      var mVs = marcasDe(0, maxV * 1.05, 4);
      raiz.appendChild(pregunta(1, "Energía", "¿Comí más o menos de lo que gasté?", diasDef >= ptsVs.length / 2,
        diasDef === ptsVs.length ? "Todos los días gastaste más de lo que comiste." : diasDef + " de " + ptsVs.length + " días gastaste más de lo que comiste.", [
          grafica({ tipo: "barras", n: N, puntos: ptsVs, linea: lineaG, min: 0, max: Math.max(mVs[mVs.length - 1], maxV * 1.05), marcas: mVs, fechas: ejeX, izq: 40, fmtEje: ejeKcal,
            resumen: "Comido promedio " + fmt(C.consumidoDia) + ", gastado promedio " + fmt(C.gastadoDia) }),
          leyenda([[COLOR.verde, "Comiste menos"], [COLOR.ambar, "Comiste más"], [COLOR.tinta, "Gastado (" + fmt(base) + " + ejercicio)", "linea"]])]));

      // 2 · Déficit acumulado
      var acu = 0, ptsA = conComida.map(function (f) {
        var d = porDia[f]; acu += d.kcal - (base + d.ejercicio);
        return { x: (indice[f] + 0.5) / N, v: acu, txt: "Hasta el " + corta(f) + ": " + kcalF(acu) + " kcal (≈ " + fmt(Math.abs(acu) / 7700, 1) + " kg)" };
      });
      var vals = ptsA.map(function (q) { return q.v; }).concat([0]);
      var mnA = Math.min.apply(null, vals), mxA = Math.max.apply(null, vals), padA = Math.max(200, (mxA - mnA) * 0.12);
      var mA = marcasDe(mnA - padA, mxA + padA, 3);
      raiz.appendChild(pregunta(2, "Déficit", "¿Cuánta grasa voy quemando?", acu <= 0,
        acu <= 0 ? "Llevas " + kcalF(acu) + " kcal: unos " + fmt(Math.abs(acu) / 7700, 1) + " kg de grasa." : "Vas en superávit: " + kcalF(acu) + " kcal (≈ " + fmt(acu / 7700, 1) + " kg).", [
          grafica({ tipo: "linea", puntos: ptsA, min: Math.min(mA[0], mnA - padA), max: Math.max(mA[mA.length - 1], mxA + padA), marcas: mA, unir: true, area: true, cero: true, color: COLOR.cintura, alto: 130, izq: 44,
            fmtEje: ejeKcal, fechas: ejeX, etiquetaFinal: kcalF(acu) + " kcal", resumen: "Balance acumulado " + kcalF(acu) + " kcal", sinPuntos: ptsA.length > 20 })]));
    }

    // 3 · Proteína: calendario
    var diasP = R.dias.map(function (f) {
      var d = porDia[f];
      var estadoP = !pasa(f) ? "fuera" : !d || !d.comidas ? "sin" : d.prot >= protMin ? "ok" : "mal";
      return { f: f, e: estadoP, prot: d ? d.prot : 0 };
    });
    var okP = diasP.filter(function (x) { return x.e === "ok"; }).length, malP = diasP.filter(function (x) { return x.e === "mal"; }).length;
    var datoCal = h("div", { class: "dato", text: "Toca un día para ver tu proteína." });
    var cal = h("div", { class: "cal", role: "group", "aria-label": "Proteína por día" }, DIAS_CORTO.map(function (dl) { return h("span", { class: "cal-h", text: dl }); }));
    for (var k = 0; k < (deISO(R.ini).getDay() + 6) % 7; k++) cal.appendChild(h("span", { class: "cal-h" }));
    diasP.forEach(function (x) {
      cal.appendChild(h("button", { type: "button", class: "cal-d " + x.e, text: String(deISO(x.f).getDate()), "aria-label": fechaLarga(x.f),
        onclick: function () { datoCal.textContent = fechaLarga(x.f) + ": " + (x.e === "sin" ? "sin comidas registradas" : x.e === "fuera" ? "no entra en el filtro" : fmt(x.prot) + " g de proteína" + (x.e === "mal" ? " (faltaron " + fmt(protMin - x.prot) + " g)" : " ✓")); datoCal.classList.add("on"); } }));
    });
    raiz.appendChild(pregunta(3, "Proteína", "¿Llegué a mi proteína cada día?", !malP && okP > 0,
      okP + malP ? okP + " de " + (okP + malP) + " días sí." + (malP ? " Te faltó " + plural(malP, "día", "días") + "." : "") : "", [
        datoCal, cal, leyenda([[COLOR.verde, "Llegaste (" + fmt(protMin) + "–" + fmt(protMax) + " g)"], [COLOR.ambar, "Te faltó"], ["#EEF1EB", "Sin registro"]])]));

    // 4 · Sueño
    var ptsS = diasF.filter(function (f) { return porDia[f] && porDia[f].sueno !== null; }).map(function (f) {
      var d = porDia[f];
      return { i: indice[f], v: d.sueno, color: d.sueno < 6.5 ? COLOR.azulClaro : COLOR.azul, txt: fechaLarga(f) + ": " + fmt(d.sueno, 1) + " h de sueño" };
    });
    raiz.appendChild(pregunta(4, "Sueño", "¿Estoy durmiendo bien?", C.suenoProm !== null && C.suenoProm >= 7.5,
      C.suenoProm === null ? "" : "Promedio " + fmt(C.suenoProm, 1) + " h. La meta es 8 h.",
      ptsS.length ? [
        grafica({ tipo: "barras", n: N, puntos: ptsS, min: 0, max: Math.max(10, Math.ceil(Math.max.apply(null, ptsS.map(function (q) { return q.v; })))), marcas: [0, 4, 8], lineaFija: 8, fechas: ejeX, alto: 120, fmtEje: function (t) { return t + " h"; }, resumen: "Sueño promedio " + fmt(C.suenoProm, 1) + " horas" }),
        leyenda([[COLOR.azul, "6,5 h o más"], [COLOR.azulClaro, "Noche corta"], [COLOR.tinta, "Meta 8 h", "linea"]])] : h("div", { class: "vacio", text: "Sin registros de sueño con este filtro." })));

    // 5 · Fuerza
    raiz.appendChild(tarjetaFuerza(R, diasF, ejeX));
    raiz.appendChild(navegacion("progreso"));
  }

  function pintarCuerpo() {
    raiz.textContent = "";
    bandas();
    encabezado("Medición trimestral", "Cuerpo");
    var med = medicion();
    var frac = med.fecha ? Math.max(0, Math.min(1, 1 - med.faltan / DIAS_MEDICION)) : 1, Ca = 2 * Math.PI * 34;
    var anillo = svg('<circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,.55)" stroke-width="9"/><circle class="anillo-p" cx="40" cy="40" r="34" stroke="#0F2A1D" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (frac * Ca).toFixed(1) + " " + Ca.toFixed(1) + '" transform="rotate(-90 40 40)"/>', 80, 80);
    raiz.appendChild(h("div", { class: "hero-bal hero-cuerpo" },
      h("div", { class: "ciclo", role: "img", "aria-label": "Ciclo de medición: " + Math.round(frac * 100) + " %" }, anillo, h("span", { text: Math.round(frac * 100) + "%" })),
      h("div", { class: "k", text: med.fecha ? "Última medición: " + corta(med.fecha) + " " + deISO(med.fecha).getFullYear() : "Aún no tienes mediciones" }),
      h("div", { class: "big" }, med.toca ? "Ya toca medir" : med.faltan + " ", med.toca ? null : h("small", { text: med.faltan === 1 ? "día para la próxima" : "días para la próxima" })),
      h("div", { class: "sub2", text: "Cada 3 meses: báscula de bioimpedancia y cinta métrica, el mismo día." }),
      h("button", { class: "btn" + (med.toca ? "" : " sec"), text: "Registrar medición", onclick: function () { abrirAgregar("medidas", { enfocar: "peso_kg" }); } })));
    raiz.appendChild(tarjetaComparacion(med));
    raiz.appendChild(graficaMedida(med, "peso_kg", "Peso", "kg", COLOR.tinta));
    raiz.appendChild(graficaMedida(med, "grasa_pct", "Grasa corporal", "%", COLOR.ambar));
    raiz.appendChild(graficaMedida(med, "masa_muscular_kg", "Masa muscular", "kg", COLOR.cintura));
    raiz.appendChild(graficaMedida(med, "cintura_cm", "Cintura", "cm", COLOR.tinta));
    raiz.appendChild(navegacion("cuerpo"));
  }

  // ---------- Pantalla "Entreno" ----------
  // Fotos de ejercicios: Free Exercise DB (dominio público). Se busca por el nombre en español.
  var FOTOS_EJ = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
  var GRUPOS = { pecho: "Pecho", espalda: "Espalda", hombros: "Hombros", biceps: "Bíceps", triceps: "Tríceps", antebrazo: "Antebrazo", abdomen: "Abdomen",
    cuadriceps: "Cuádriceps", femorales: "Femorales", gluteos: "Glúteos", aductores: "Aductores", pantorrillas: "Pantorrillas" };
  // Biblioteca de ejercicios en español (ejercicios.js): cómo se reconoce cada uno por su nombre, su foto,
  // músculos y cómo hacerlo. Se revisa en orden: lo más específico va primero.
  var BIBLIOTECA = window.BIBLIOTECA_EJ || [];
  var CATALOGO_EJ = BIBLIOTECA.map(function (e) { return [e.re, e.f, e.p, e.s, e]; });
  // Palabras de la rutina o de las notas → grupos (para sesiones guardadas sin series)
  var PALABRAS_GRUPO = [[/pecho|pectoral/, "pecho"], [/espalda|dorsal/, "espalda"], [/hombro/, "hombros"], [/bicep/, "biceps"], [/tricep/, "triceps"],
    [/abdomen|abdominal/, "abdomen"], [/pierna/, "cuadriceps"], [/pierna|femoral/, "femorales"], [/pierna|gluteo/, "gluteos"], [/pantorrilla|gemelo/, "pantorrillas"], [/cuadricep/, "cuadriceps"]];
  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  /** La ficha de la biblioteca que corresponde a un nombre (o null). Las reglas de respaldo usan la ficha visible con la misma foto. */
  function fichaDe(nombre) {
    var t = sinTildes(nombre);
    for (var i = 0; i < CATALOGO_EJ.length; i++) if (CATALOGO_EJ[i][0].test(t)) {
      var e = CATALOGO_EJ[i][4];
      return e.oculto ? BIBLIOTECA.filter(function (x) { return !x.oculto && x.f === e.f; })[0] || null : e;
    }
    return null;
  }
  function nombresGrupos(l) { return l.map(function (g) { return GRUPOS[g]; }).join(" · "); }

  /** Visor grande: la foto del ejercicio a pantalla casi completa, con las dos posiciones (1 y 2). */
  function abrirVisorFoto(info, titulo, inicial) {
    var dlg = h("dialog", { class: "visor", "aria-label": "Fotos de " + titulo });
    var srcs = info.srcs || [FOTOS_EJ + info.foto + "/0.jpg", FOTOS_EJ + info.foto + "/1.jpg"];
    var n = Math.min(inicial || 0, srcs.length - 1);
    var img = h("img", { alt: "Posición " + (n + 1) + " de " + titulo, src: srcs[n] });
    var botones = srcs.map(function (x, k) {
      return h("button", { type: "button", class: "visor-n" + (k === n ? " on" : ""), text: String(k + 1), "aria-label": "Ver la posición " + (k + 1) + (k === 0 ? " (inicial)" : " (final)"),
        onclick: function () { ver(k); } });
    });
    function ver(k) {
      n = k; img.src = srcs[k]; img.alt = "Posición " + (k + 1) + " de " + titulo;
      botones.forEach(function (b, q) { b.classList.toggle("on", q === k); });
      txt.textContent = k === 0 ? "Posición inicial" : "Posición final";
    }
    var txt = h("span", { class: "visor-t", text: srcs.length < 2 ? "" : n === 0 ? "Posición inicial" : "Posición final" });
    img.addEventListener("click", function () { if (srcs.length > 1) ver(1 - n); });
    dlg.appendChild(h("div", { class: "visor-caja" },
      h("div", { class: "visor-cab" }, h("b", { text: titulo }), h("button", { type: "button", class: "icono-btn", "aria-label": "Cerrar", onclick: function () { dlg.close(); } }, icono("cerrar", 18))),
      img,
      srcs.length > 1 ? h("div", { class: "visor-pie" }, botones, txt) : null,
      srcs.length > 1 ? h("p", { class: "ayuda visor-ayuda", text: "Toca la foto para cambiar de posición." }) : null));
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { if (dlg.parentNode) dlg.parentNode.removeChild(dlg); });
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  /** Foto del ejercicio: al tocarla se abre en grande, con las dos posiciones. Sin foto: un icono. */
  function fotoEjercicio(info, titulo) {
    var caja = h("button", { type: "button", class: "foto-ej", "aria-label": "Ver en grande la foto de " + (titulo || "el ejercicio") });
    if (info.propias) {
      caja.appendChild(imgSubida(info.propias[0], "")); caja.appendChild(h("span", { class: "foto-n", text: "🔍 A · B" }));
      caja.addEventListener("click", function (e) {
        e.stopPropagation();
        traerFotos(info.propias).then(function (m) { abrirVisorFoto({ srcs: info.propias.map(function (x) { return m[x]; }).filter(Boolean) }, titulo || "Ejercicio", 0); }, manejarError);
      });
      return caja;
    }
    if (!info.foto) { caja.appendChild(h("span", { class: "foto-emo", text: "🏋️" })); caja.disabled = true; return caja; }
    var img = h("img", { src: FOTOS_EJ + info.foto + "/0.jpg", alt: "", loading: "lazy" });
    img.addEventListener("error", function () { caja.textContent = ""; caja.appendChild(h("span", { class: "foto-emo", text: "🏋️" })); caja.disabled = true; });
    caja.addEventListener("click", function (e) { e.stopPropagation(); abrirVisorFoto(info, titulo || "Ejercicio", 0); });
    caja.appendChild(img); caja.appendChild(h("span", { class: "foto-n", text: "🔍 1 · 2" }));
    return caja;
  }

  /** Figura del cuerpo (frente o espalda) con los músculos pintados según las series. */
  var FIGURA = {
    frente: [["c", 60, 20, 13, null], ["r", 53, 31, 14, 10, 4, null],
      ["e", 33, 52, 11, 10, "hombros"], ["e", 87, 52, 11, 10, "hombros"], ["r", 39, 43, 20, 28, 8, "pecho"], ["r", 61, 43, 20, 28, 8, "pecho"],
      ["e", 27, 80, 7, 14, "biceps"], ["e", 93, 80, 7, 14, "biceps"], ["e", 22, 110, 6, 14, "antebrazo"], ["e", 98, 110, 6, 14, "antebrazo"],
      ["r", 46, 73, 28, 40, 8, "abdomen"], ["r", 44, 114, 32, 14, 6, null],
      ["e", 47, 155, 12, 28, "cuadriceps"], ["e", 73, 155, 12, 28, "cuadriceps"], ["e", 58, 150, 3, 16, "aductores"], ["e", 62, 150, 3, 16, "aductores"],
      ["e", 47, 210, 8, 20, "pantorrillas"], ["e", 73, 210, 8, 20, "pantorrillas"]],
    espalda: [["c", 60, 20, 13, null], ["r", 53, 31, 14, 10, 4, null],
      ["e", 33, 52, 11, 10, "hombros"], ["e", 87, 52, 11, 10, "hombros"], ["r", 44, 41, 32, 16, 7, "espalda"], ["r", 38, 58, 44, 44, 12, "espalda"],
      ["e", 27, 80, 7, 14, "triceps"], ["e", 93, 80, 7, 14, "triceps"], ["e", 22, 110, 6, 14, "antebrazo"], ["e", 98, 110, 6, 14, "antebrazo"],
      ["r", 46, 103, 28, 12, 5, "espalda"], ["e", 50, 128, 12, 12, "gluteos"], ["e", 70, 128, 12, 12, "gluteos"],
      ["e", 48, 165, 11, 24, "femorales"], ["e", 72, 165, 11, 24, "femorales"], ["e", 47, 212, 8, 19, "pantorrillas"], ["e", 73, 212, 8, 19, "pantorrillas"]]
  };
  function colorNivel(n) { return n <= 0 ? "#E3E8E0" : n < 4 ? "#B8E68F" : n < 10 ? "#2FA36B" : "#0E6B47"; }
  function figuraCuerpo(lado, nivel) {
    var s = "";
    FIGURA[lado].forEach(function (p) {
      var g = p[p.length - 1], fill = g ? colorNivel(nivel[g] || 0) : "#D5DCD1";
      var tit = g ? "<title>" + GRUPOS[g] + ": " + fmt(nivel[g] || 0, 1) + " series</title>" : "";
      var dg = g && nivel[g] ? ' data-g="' + g + '" style="cursor:pointer"' : "";
      if (p[0] === "c") s += '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="' + p[3] + '" fill="' + fill + '"/>';
      else if (p[0] === "e") s += '<ellipse cx="' + p[1] + '" cy="' + p[2] + '" rx="' + p[3] + '" ry="' + p[4] + '" fill="' + fill + '" stroke="#fff" stroke-width="1.5"' + dg + ">" + tit + "</ellipse>";
      else s += '<rect x="' + p[1] + '" y="' + p[2] + '" width="' + p[3] + '" height="' + p[4] + '" rx="' + p[5] + '" fill="' + fill + '" stroke="#fff" stroke-width="1.5"' + dg + ">" + tit + "</rect>";
    });
    var t = document.createElement("template");
    t.innerHTML = '<svg viewBox="0 0 120 240" width="112" role="img" aria-label="Músculos trabajados, ' + lado + '">' + s + "</svg>";
    return h("div", { class: "fig" }, t.content.firstChild, h("small", { text: lado === "frente" ? "Frente" : "Espalda" }));
  }

  /** Todas las sesiones de cada ejercicio (para comparar con la vez anterior, récords e historial). */
  function historialEjercicios() {
    var porEj = {};
    (estado.tablas ? estado.tablas.series_gym : []).forEach(function (s) {
      var n = String(s.ejercicio || "").trim();
      if (!n || !s.fecha) return;
      var k = sinTildes(n);
      var e = porEj[k] = porEj[k] || { nombre: n, porFecha: {} };
      (e.porFecha[s.fecha] = e.porFecha[s.fecha] || []).push(s);
    });
    Object.keys(porEj).forEach(function (k) {
      var e = porEj[k];
      e.sesiones = Object.keys(e.porFecha).sort().map(function (f) {
        var series = e.porFecha[f].slice().sort(function (a, b) { return (Number(a.numero_serie) || 0) - (Number(b.numero_serie) || 0); });
        var max = Math.max.apply(null, series.map(function (s) { return Number(s.peso_kg) || 0; }));
        var vol = series.reduce(function (a, s) { return a + (Number(s.peso_kg) || 0) * (Number(s.repeticiones) || 0); }, 0);
        return { fecha: f, series: series, max: max, vol: vol };
      });
      var mejor = -1;
      e.sesiones.forEach(function (x, i) { x.record = i > 0 && x.max > mejor; mejor = Math.max(mejor, x.max); });
    });
    return porEj;
  }

  function abrirHistorialEjercicio(e) {
    var info = infoEjercicio(e.nombre);
    var pts = e.sesiones.map(function (x, i) { return { x: e.sesiones.length < 2 ? 0.5 : i / (e.sesiones.length - 1), v: x.max, txt: fechaLarga(x.fecha) + ": " + fmt(x.max, 1) + " kg · volumen " + fmt(x.vol) + " kg" }; });
    var vals = pts.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), pad = Math.max(2.5, (mx - mn) * 0.2);
    var marcas = marcasDe(Math.max(0, mn - pad), mx + pad, 3);
    abrirHoja(e.nombre, h("div", { style: "display:flex;flex-direction:column;gap:10px" },
      h("div", { class: "ej-cab" }, fotoEjercicio(info, e.nombre), h("div", {}, h("div", { class: "ej-m", text: nombresGrupos(info.principales.concat(info.secundarios)) || "Ejercicio" }),
        h("div", { class: "nota", text: plural(e.sesiones.length, "sesión", "sesiones") + " · mejor peso " + fmt(Math.max.apply(null, vals), 1) + " kg" }))),
      h("div", { class: "graf" }, h("h3", { text: "Peso máximo por sesión" }),
        grafica({ tipo: "linea", puntos: pts, min: Math.min(marcas[0], mn - pad / 2), max: Math.max(marcas[marcas.length - 1], mx + pad / 2), marcas: marcas, unir: true, color: COLOR.tinta, relleno: COLOR.lima, borde: COLOR.tinta, alto: 130,
          fmtEje: function (t) { return fmt(t, 1); }, fechas: pts.length > 1 ? [[0, corta(e.sesiones[0].fecha)], [1, corta(e.sesiones[e.sesiones.length - 1].fecha)]] : [], resumen: e.nombre })),
      h("div", { class: "lista" }, e.sesiones.slice().reverse().map(function (x) {
        return h("div", { class: "item" }, h("div", { class: "t" }, h("b", { text: fechaLarga(x.fecha) + (x.record ? " · 🏆 récord" : "") }),
          h("span", { text: x.series.map(function (s) { return fmt(s.peso_kg, 1) + " kg × " + fmt(s.repeticiones); }).join(" · ") })));
      }))));
  }

  function tarjetaEjercicio(g, fecha, hist) {
    var info = infoEjercicio(g.ejercicio);
    var e = hist[sinTildes(g.ejercicio)];
    var idx = e ? e.sesiones.map(function (x) { return x.fecha; }).indexOf(fecha) : -1;
    var actual = idx >= 0 ? e.sesiones[idx] : null, previa = idx > 0 ? e.sesiones[idx - 1] : null;
    var badge = null;
    if (actual && actual.record) badge = h("span", { class: "badge pr", text: "🏆 Récord: " + fmt(actual.max, 1) + " kg" });
    else if (actual && previa && actual.max !== previa.max) badge = h("span", { class: "badge " + (actual.max > previa.max ? "up" : "dn"), text: (actual.max > previa.max ? "▲ +" : "▼ −") + fmt(Math.abs(actual.max - previa.max), 1) + " kg" });
    var vol = g.series.reduce(function (a, s) { return a + (Number(s.peso_kg) || 0) * (Number(s.repeticiones) || 0); }, 0);
    var filas = g.series.map(function (s) {
      var antes = previa ? previa.series.filter(function (p) { return Number(p.numero_serie) === Number(s.numero_serie); })[0] : null;
      var dif = antes ? (Number(s.peso_kg) || 0) - (Number(antes.peso_kg) || 0) : null;
      return h("tr", {}, h("td", {}, h("span", { class: "n", text: fmt(s.numero_serie) })), h("td", { text: fmt(s.peso_kg, 1) + " kg" }), h("td", { text: fmt(s.repeticiones) }),
        h("td", { class: "v" + (dif > 0 ? " sube" : ""), text: !previa ? "nuevo" : dif === null ? "—" : dif === 0 ? "=" : (dif > 0 ? "▲ " : "▼ ") + fmt(Math.abs(dif), 1) + " kg" }));
    });
    var difVol = previa && previa.vol ? Math.round((vol - previa.vol) / previa.vol * 100) : null;
    var maxKg = Math.max.apply(null, g.series.map(function (s) { return Number(s.peso_kg) || 0; }));
    // Cerrada se ve el resumen (foto, nombre, series y peso máximo); al tocarla se abre el detalle.
    var clave = fecha + "|" + g.ejercicio, abiertos = estado.ejAbiertos = estado.ejAbiertos || {};
    return h("details", { class: "ej", open: !!abiertos[clave], ontoggle: function (ev) { abiertos[clave] = ev.target.open; } },
      h("summary", { class: "ej-cab", "aria-label": g.ejercicio + ": ver series" }, fotoEjercicio(info, g.ejercicio),
        h("div", { class: "ej-t" },
          h("b", { text: g.ejercicio }), h("div", { class: "ej-m", text: nombresGrupos(info.principales.concat(info.secundarios)) }),
          h("div", { class: "ej-res" }, h("span", { text: plural(g.series.length, "serie", "series") }), maxKg ? h("span", { text: "máx " + fmt(maxKg, 1) + " kg" }) : null), badge),
        h("span", { class: "ej-flecha", "aria-hidden": "true" }, icono("abajo", 18))),
      h("div", { class: "ej-cuerpo" },
        h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Serie" }), h("th", { text: "Peso" }), h("th", { text: "Reps" }), h("th", { class: "v", text: "vs anterior" }))), h("tbody", {}, filas)),
        h("div", { class: "tot" }, h("span", { text: "Volumen " + fmt(vol) + " kg" }),
          difVol === null ? null : h("span", { class: "badge " + (difVol >= 0 ? "up" : "dn"), text: (difVol >= 0 ? "▲ " : "▼ ") + Math.abs(difVol) + " % vs el " + corta(previa.fecha) })),
        h("div", { class: "ej-acc" },
          e ? h("button", { type: "button", class: "ej-editar", text: "📈 Historial", "aria-label": "Historial de " + g.ejercicio, onclick: function () { abrirHistorialEjercicio(e); } }) : null,
          h("button", { type: "button", class: "ej-editar ej-como", text: "📖 Cómo se hace", "aria-label": "Cómo se hace " + g.ejercicio, onclick: function () { abrirEjercicio(g.ejercicio); } }),
          h("button", { type: "button", class: "ej-editar", text: "✎ Editar", onclick: function () { detalleGym(g); } }))));
  }

  /** Qué ejercicios trabajaron un músculo en el día o la semana elegidos. */
  function abrirMusculo(g, aporte, cuando) {
    var nombres = Object.keys(aporte).sort(function (a, b) { return (aporte[b].p + aporte[b].s / 2) - (aporte[a].p + aporte[a].s / 2); });
    abrirHoja(GRUPOS[g] + " · " + cuando, h("div", { style: "display:flex;flex-direction:column;gap:10px" },
      h("p", { class: "ayuda", text: "Estos ejercicios cuentan para " + GRUPOS[g].toLowerCase() + ". Como principal, cada serie suma 1; como «también», suma media." }),
      nombres.length ? h("div", { class: "lista" }, nombres.map(function (n) {
        var x = aporte[n], partes = [];
        if (x.sinSeries) partes.push("estimado por la rutina (sin series registradas)");
        else {
          if (x.p) partes.push(plural(x.p, "serie", "series") + " · principal");
          if (x.s) partes.push(plural(x.s, "serie", "series") + " · también");
        }
        var info = x.sinSeries ? { foto: null } : infoEjercicio(n);
        return h("button", { type: "button", class: "item con-emo", onclick: function () { if (!x.sinSeries) abrirEjercicio(n); } },
          miniEjercicio(info, "emo mini-foto"),
          h("div", { class: "t" }, h("b", { text: n }), h("span", { text: partes.join(" · ") })));
      })) : h("p", { class: "ayuda", text: "Ningún ejercicio." }),
      h("p", { class: "ayuda", text: "¿Alguno no debería contar aquí? Tócalo → ✎ Editar ejercicio y cambia sus músculos." })));
  }
  function datoNotas(notas, re) { var m = sinTildes(notas).match(re); return m ? m[1].replace(/\./g, "").replace(",", ".") : null; }

  function pintarEntreno() {
    raiz.textContent = "";
    bandas();
    encabezado("Tu entrenamiento", "Entreno");
    var tab = estado.tabEntreno || "semana";
    raiz.appendChild(h("div", { class: "seg tres", role: "tablist", "aria-label": "Secciones de Entreno" }, [["semana", "Semana"], ["rutinas", "Rutinas"], ["ejercicios", "Ejercicios"]].map(function (x) {
      return h("button", { type: "button", role: "tab", class: "pill" + (tab === x[0] ? " on" : ""), "aria-selected": tab === x[0] ? "true" : "false", text: x[1],
        onclick: function () { estado.tabEntreno = x[0]; pintar(); window.scrollTo(0, 0); } });
    })));
    if (tab !== "semana") {
      if (!estado.tablas) raiz.appendChild(h("div", { class: "vacio", text: "Para esto, la app necesita la versión nueva del servicio de Google." }));
      else if (tab === "rutinas") pintarTabRutinas();
      else pintarTabEjercicios();
      raiz.appendChild(navegacion("entreno"));
      return;
    }
    if (!estado.tablas) { raiz.appendChild(h("div", { class: "vacio", text: "Para ver tu entreno, la app necesita la versión nueva del servicio de Google." })); raiz.appendChild(navegacion("entreno")); return; }
    var T = estado.tablas, hist = historialEjercicios();
    var lunes = sumarDias(iso(lunesDe(hoy)), 7 * (estado.semanaEntreno || 0)), dias = [];
    for (var i = 0; i < 7; i++) dias.push(sumarDias(lunes, i));
    var ejDe = function (f) { return T.ejercicio.filter(function (x) { return x.fecha === f; }); };
    var serDe = function (f) { return T.series_gym.filter(function (x) { return x.fecha === f; }); };
    var EMO = { gym: "💪", bici: "🚴", caminata: "🚶" };

    // Semana: sesiones, tiempo, kcal y kg levantados
    var ses = 0, minutos = 0, kcal = 0, kg = 0, nivelSemana = {}, nivelDia = {}, aporteDia = {};
    // aporte[músculo][ejercicio] = { p: series como principal, s: series como «también» }
    var sumarAporte = function (ap, g, nombre, campo, n) { var a = (ap[g] = ap[g] || {}); var x = (a[nombre] = a[nombre] || { p: 0, s: 0, sinSeries: false }); x[campo] += n; return x; };
    var elegido = dias.indexOf(estado.diaEntreno) >= 0 ? estado.diaEntreno : null; // null = toda la semana
    dias.forEach(function (f) {
      var ej = ejDe(f), se = serDe(f), nivel = nivelDia[f] = {}, ap = aporteDia[f] = {};
      ses += ej.length + (se.length && !ej.some(function (x) { return x.tipo === "gym"; }) ? 1 : 0);
      ej.forEach(function (x) { minutos += Number(x.duracion_min) || 0; kcal += Number(x.kcal) || 0; });
      se.forEach(function (s) {
        kg += (Number(s.peso_kg) || 0) * (Number(s.repeticiones) || 0);
        var inf = infoEjercicio(s.ejercicio);
        inf.principales.forEach(function (g) { nivel[g] = (nivel[g] || 0) + 1; sumarAporte(ap, g, String(s.ejercicio).trim(), "p", 1); });
        inf.secundarios.forEach(function (g) { nivel[g] = (nivel[g] || 0) + 0.5; sumarAporte(ap, g, String(s.ejercicio).trim(), "s", 1); });
      });
      // Sesiones de gym sin series: se estima con la rutina o las notas (3 series por grupo)
      if (!se.length) ej.filter(function (x) { return x.tipo === "gym"; }).forEach(function (x) {
        infoEjercicio((x.notas || "") + " " + (x.rutina || "")).principales.forEach(function (g) {
          nivel[g] = (nivel[g] || 0) + 3;
          sumarAporte(ap, g, "Gym sin series" + (x.notas ? ": " + String(x.notas).split(/[:.,]/)[0] : ""), "p", 3).sinSeries = true;
        });
      });
      Object.keys(nivel).forEach(function (g) { nivelSemana[g] = (nivelSemana[g] || 0) + nivel[g]; });
    });
    var nivel = elegido ? nivelDia[elegido] : nivelSemana;
    var aporte = {};
    (elegido ? [elegido] : dias).forEach(function (f) {
      Object.keys(aporteDia[f]).forEach(function (g) { Object.keys(aporteDia[f][g]).forEach(function (n) { var x = aporteDia[f][g][n], y = sumarAporte(aporte, g, n, "p", x.p); y.s += x.s; y.sinSeries = y.sinSeries || x.sinSeries; }); });
    });
    var etiquetaSemana = (estado.semanaEntreno || 0) === 0 ? "Esta semana" : corta(dias[0]) + " – " + corta(dias[6]);
    raiz.appendChild(h("div", { class: "hero hero-ent" },
      h("div", { class: "sem-cab" },
        h("button", { class: "mini-nav", "aria-label": "Semana anterior de entreno", onclick: function () { estado.semanaEntreno = (estado.semanaEntreno || 0) - 1; estado.diaEntreno = null; pintar(); } }, icono("atras", 16)),
        h("div", { class: "hero-t", text: etiquetaSemana }),
        h("button", { class: "mini-nav", "aria-label": "Semana siguiente de entreno", disabled: (estado.semanaEntreno || 0) >= 0, onclick: function () { estado.semanaEntreno = (estado.semanaEntreno || 0) + 1; estado.diaEntreno = null; pintar(); } }, icono("sig", 16))),
      h("div", { class: "sem-ent" }, dias.map(function (f) {
        var tipos = ejDe(f).map(function (x) { return x.tipo; });
        if (serDe(f).length && tipos.indexOf("gym") < 0) tipos.push("gym");
        var d = deISO(f);
        return h("button", { type: "button", class: "dia-ent" + (tipos.length ? " on" : "") + (f > hoy ? " fut" : "") + (f === elegido ? " sel" : ""), "aria-pressed": f === elegido ? "true" : "false",
          "aria-label": fechaLarga(f) + (tipos.length ? ": " + tipos.join(", ") : ": descanso") + (f === elegido ? " (elegido)" : ""),
          onclick: function () { estado.diaEntreno = f === elegido ? null : f; pintar(); } },
          h("small", { text: DIAS_CORTO[(d.getDay() + 6) % 7] }), h("span", { text: tipos.length ? tipos.map(function (t) { return EMO[t] || "🏃"; }).join("") : "·" }));
      })),
      h("div", { class: "kp-ent" },
        h("div", {}, h("b", { text: String(ses) }), h("small", { text: ses === 1 ? "sesión" : "sesiones" })),
        h("div", {}, h("b", { text: minutos >= 60 ? Math.floor(minutos / 60) + " h " + (minutos % 60 ? dos(minutos % 60) : "") : minutos + " min" }), h("small", { text: "tiempo" })),
        h("div", {}, h("b", { text: fmt(kcal) }), h("small", { text: "kcal" })),
        h("div", {}, h("b", { text: fmt(kg) }), h("small", { text: "kg levantados" })))));

    // Racha y récords del mes
    var entreno = {};
    T.ejercicio.forEach(function (x) { entreno[x.fecha] = true; });
    T.series_gym.forEach(function (x) { entreno[x.fecha] = true; });
    var racha = 0, f0 = entreno[hoy] ? hoy : sumarDias(hoy, -1);
    while (entreno[f0]) { racha++; f0 = sumarDias(f0, -1); }
    var mes = hoy.slice(0, 7), records = 0;
    Object.keys(hist).forEach(function (k) { hist[k].sesiones.forEach(function (x) { if (x.record && x.fecha.slice(0, 7) === mes) records++; }); });
    raiz.appendChild(h("div", { class: "racha" },
      h("div", {}, h("b", { text: "🔥 " + plural(racha, "día", "días") }), h("small", { text: "Racha entrenando" })),
      h("div", {}, h("b", { text: "🏆 " + records }), h("small", { text: records === 1 ? "Récord este mes" : "Récords este mes" }))));

    // Músculos trabajados
    var gruposSem = Object.keys(nivel).sort(function (a, b) { return nivel[b] - nivel[a]; });
    var cuando = elegido ? fechaLarga(elegido) : etiquetaSemana;
    var selector = h("div", { class: "filtro-dia", role: "group", "aria-label": "Qué músculos ver" },
      h("button", { type: "button", class: "pill" + (elegido ? "" : " on"), "aria-pressed": elegido ? "false" : "true", text: "Toda la semana", onclick: function () { estado.diaEntreno = null; pintar(); } }),
      h("button", { type: "button", class: "pill" + (elegido ? " on" : ""), "aria-pressed": elegido ? "true" : "false", text: elegido ? fechaLarga(elegido) : "Un día (toca uno arriba)",
        onclick: function () { if (!elegido) { var u = dias.filter(function (f) { return f <= hoy && (ejDe(f).length || serDe(f).length); }).pop(); if (u) { estado.diaEntreno = u; pintar(); } } } }));
    raiz.appendChild(h("div", { class: "graf" }, h("h3", { text: "Músculos trabajados" }), selector,
      h("div", { class: "d", text: cuando + " · más oscuro = más series" }),
      h("div", { class: "cuerpo-fig", onclick: function (ev) { var el = ev.target.closest && ev.target.closest("[data-g]"); if (el) abrirMusculo(el.getAttribute("data-g"), aporte[el.getAttribute("data-g")] || {}, cuando); } },
        figuraCuerpo("frente", nivel), figuraCuerpo("espalda", nivel)),
      leyenda([["#E3E8E0", "Sin trabajar"], ["#B8E68F", "Poco"], ["#2FA36B", "Medio"], ["#0E6B47", "Mucho"]]),
      gruposSem.length ? h("div", { class: "chips-m" }, gruposSem.map(function (g) {
        return h("button", { type: "button", class: "chip-musculo", "aria-label": GRUPOS[g] + ": " + fmt(nivel[g], 0) + " series. Ver qué ejercicios", text: GRUPOS[g] + " · " + fmt(nivel[g], 0) + " series ›", onclick: function () { abrirMusculo(g, aporte[g] || {}, cuando); } });
      })) : null,
      gruposSem.length ? h("div", { class: "nota", text: "Toca un músculo (o la figura) para ver qué ejercicios lo trabajaron." })
        : h("div", { class: "nota", text: elegido ? "Ese día no hubo gym." : "Aún no hay series de gym esta semana." })));

    // Sesiones de la semana (lo más reciente primero)
    var conSesion = dias.filter(function (f) { return (!elegido || f === elegido) && (ejDe(f).length || serDe(f).length); }).reverse();
    if (!conSesion.length) raiz.appendChild(h("div", { class: "vacio", text: elegido ? "Ese día no hay entrenamientos." : "Sin entrenamientos esta semana. Toca + para registrar tu ejercicio." }));
    conSesion.forEach(function (f) {
      var ej = ejDe(f), grupos = agruparSeries(serDe(f));
      var gym = ej.filter(function (x) { return x.tipo === "gym"; })[0];
      if (grupos.length || gym) {
        var volDia = serDe(f).reduce(function (a, s) { return a + (Number(s.peso_kg) || 0) * (Number(s.repeticiones) || 0); }, 0);
        var rutina = grupos.length && grupos[0].rutina ? grupos[0].rutina : gym && gym.notas ? String(gym.notas).split(/[:.,]/)[0] : "Gym";
        var sub = ["Gym"];
        if (gym && gym.duracion_min) sub.push(fmt(gym.duracion_min) + " min");
        if (gym && !vacio(gym.kcal)) sub.push(fmt(gym.kcal) + " kcal");
        if (grupos.length) { sub.push(plural(grupos.length, "ejercicio", "ejercicios")); sub.push(fmt(volDia) + " kg"); }
        raiz.appendChild(h("div", { class: "graf sesion", id: "ses-" + f },
          h("div", { class: "ses" }, h("span", { class: "emo", style: "background:#FFF1E2", text: "🏋️" }),
            h("div", {}, h("b", { text: fechaLarga(f) + " · " + rutina }), h("small", { text: sub.join(" · ") }))),
          gym && gym.notas && !grupos.length ? h("p", { class: "ses-notas", text: gym.notas }) : null,
          !grupos.length ? h("p", { class: "ayuda", text: "Para ver cada ejercicio con su foto, series y récords, registra las series (peso y repeticiones). Por ejemplo, dile a Claude: «jalón al frente 3 series: 40×12, 45×10, 50×8»." }) : null,
          grupos.map(function (g) { return tarjetaEjercicio(g, f, hist); })));
      }
      ej.filter(function (x) { return x.tipo !== "gym"; }).forEach(function (x) {
        var km = datoNotas(x.notas, /([\d.,]+)\s*km/), desn = datoNotas(x.notas, /([\d.,]+)\s*m de desnivel/);
        var nombre = x.notas ? String(x.notas).split(/[:,(]/)[0] : cap(x.tipo);
        raiz.appendChild(h("div", { class: "graf sesion", id: "ses-" + f },
          h("div", { class: "ses" }, h("span", { class: "emo", style: "background:" + (x.tipo === "bici" ? "#E7F0FE" : "#E9F7E1"), text: x.tipo === "bici" ? "🚴" : x.tipo === "caminata" ? "🚶" : "🏃" }),
            h("div", {}, h("b", { text: fechaLarga(f) + " · " + nombre }), h("small", { text: cap(x.tipo) + (x.fuente ? " · " + cap(x.fuente) : "") }))),
          h("div", { class: "cardio" },
            km ? h("div", {}, h("b", { text: fmt(Number(km), 1) + " km" }), h("small", { text: "distancia" })) : null,
            h("div", {}, h("b", { text: x.duracion_min ? (x.duracion_min >= 60 ? Math.floor(x.duracion_min / 60) + " h " + dos(x.duracion_min % 60) : fmt(x.duracion_min) + " min") : "—" }), h("small", { text: "tiempo" })),
            h("div", {}, h("b", { text: vacio(x.kcal) ? "—" : fmt(x.kcal) }), h("small", { text: "kcal" }))),
          desn ? h("div", { class: "chips-m" }, h("span", { text: "⛰️ " + fmt(Number(desn)) + " m de desnivel" })) : null,
          h("button", { type: "button", class: "ej-editar", text: "Editar", onclick: function () { detalleEjercicio(x); } })));
      });
    });
    raiz.appendChild(navegacion("entreno"));
  }

  // ---------- Mis ejercicios ----------
  // Un ejercicio se arma una sola vez (fotos, músculos, equipo, cómo hacerlo) en la pestaña «ejercicios» de tu hoja.
  // Lo que no cambies sale de la biblioteca (ejercicios.js). La rutina solo dice qué ejercicio va y con qué peso.
  var FILTROS_MUSCULO = [["", "Todos"], ["pecho", "Pecho", ["pecho"]], ["espalda", "Espalda", ["espalda"]], ["hombros", "Hombros", ["hombros"]], ["biceps", "Bíceps", ["biceps", "antebrazo"]],
    ["triceps", "Tríceps", ["triceps"]], ["pierna", "Pierna", ["cuadriceps", "femorales", "aductores", "pantorrillas"]], ["gluteos", "Glúteos", ["gluteos"]], ["abdomen", "Abdomen", ["abdomen"]]];
  var FILTROS_EQUIPO = [["", "Todo"], ["maquina", "Máquina"], ["polea", "Polea"], ["mancuernas", "Mancuernas"], ["barra", "Barra"], ["smith", "Smith"], ["peso corporal", "Peso corporal"]];
  var NOMBRE_EQUIPO = { maquina: "Máquina", polea: "Polea", mancuernas: "Mancuernas", barra: "Barra", smith: "Smith", "peso corporal": "Peso corporal" };
  function seccionDe(p) {
    for (var i = 1; i < FILTROS_MUSCULO.length; i++) if (FILTROS_MUSCULO[i][2].indexOf(p[0]) >= 0) return FILTROS_MUSCULO[i];
    return ["otros", "Otros"];
  }
  function mejorSerie(x) {
    return x.series.filter(function (s) { return (Number(s.peso_kg) || 0) === x.max; }).sort(function (a, b) { return (Number(b.repeticiones) || 0) - (Number(a.repeticiones) || 0); })[0] || x.series[0];
  }
  function textoSerie(s) { return Number(s.peso_kg) ? fmt(s.peso_kg, 1) + " kg × " + fmt(s.repeticiones) : fmt(s.repeticiones) + " reps"; }
  function hayEjercicios() { return !!(estado.tablas && Array.isArray(estado.tablas.ejercicios)); }
  function claveEj(n) { return sinTildes(n).trim(); }
  function filaEjercicio(nombre) {
    if (!hayEjercicios()) return null;
    var k = claveEj(nombre);
    return estado.tablas.ejercicios.filter(function (e) { return claveEj(e.nombre) === k; })[0] || null;
  }

  /** Todo lo que se sabe de un ejercicio: lo tuyo primero y, lo que falte, de la biblioteca. */
  function datosEjercicio(nombre, fichaForzada) {
    var k = claveEj(nombre), fila = filaEjercicio(nombre), ficha = fichaForzada || fichaDe(nombre);
    var d = { nombre: fila ? fila.nombre : nombre, fila: fila, ficha: ficha, propias: null, foto: null };
    // Fotos: las tuyas → (de versiones anteriores: una tarjeta de rutina con fotos, o la foto elegida en este celular) → biblioteca
    var tarjeta = hayRutinas() ? estado.tablas.rutinas.filter(function (t) { return claveEj(t.ejercicio) === k && (t.foto_a || t.foto_b); })[0] : null;
    var personal = leerPersonal()[k];
    if (fila && /^bd:/.test(fila.foto_a || "")) d.foto = fila.foto_a.slice(3);
    else if (fila && (fila.foto_a || fila.foto_b)) d.propias = [fila.foto_a, fila.foto_b].filter(Boolean);
    else if (tarjeta) d.propias = [tarjeta.foto_a, tarjeta.foto_b].filter(Boolean);
    else if (personal && personal.foto) d.foto = personal.foto;
    else if (ficha) d.foto = ficha.f;
    // Músculos
    var elegidosTarjeta = hayRutinas() ? estado.tablas.rutinas.map(musculosElegidos).filter(function (m, i) { return m && claveEj(estado.tablas.rutinas[i].ejercicio) === k; })[0] : null;
    if (fila && (fila.principales || fila.secundarios)) { d.p = listaGrupos(fila.principales); d.s = listaGrupos(fila.secundarios); d.musculosPropios = true; }
    else if (elegidosTarjeta) { d.p = elegidosTarjeta.p; d.s = elegidosTarjeta.s; d.musculosPropios = true; }
    else if (personal && personal.foto && (personal.principales || []).length) { d.p = personal.principales; d.s = personal.secundarios || []; d.musculosPropios = true; }
    else if (ficha) { d.p = ficha.p.slice(); d.s = ficha.s.slice(); }
    else {
      var t = sinTildes(nombre), g = PALABRAS_GRUPO.filter(function (p) { return p[0].test(t); }).map(function (p) { return p[1]; });
      d.p = g.filter(function (x, i) { return g.indexOf(x) === i; }); d.s = [];
    }
    d.s = d.s.filter(function (g) { return d.p.indexOf(g) < 0; });
    d.equipo = (fila && fila.equipo) || (ficha ? ficha.eq : null);
    d.nivel = ficha ? ficha.niv : null;
    d.garmin = ficha && ficha.g ? ficha.g : null;
    var propios = fila && fila.pasos ? String(fila.pasos).split(/\n+/).map(function (x) { return x.replace(/^\s*\d+[.)-]?\s*/, "").trim(); }).filter(Boolean) : null;
    d.pasos = propios || (ficha ? ficha.pasos : []);
    d.pasosPropios = !!propios;
    d.tip = propios ? null : ficha ? ficha.tip : null;
    d.nota = fila && fila.nota ? fila.nota : null;
    d.textoP = d.musculosPropios || !ficha ? nombresGrupos(d.p) : ficha.t;
    d.textoS = d.musculosPropios || !ficha ? nombresGrupos(d.s) : ficha.tb;
    return d;
  }
  function infoEjercicio(nombre) {
    var d = datosEjercicio(nombre);
    return { foto: d.foto, propias: d.propias, principales: d.p, secundarios: d.s, ref: d.ficha };
  }
  /** Tus ejercicios: los que tienes guardados, los que has registrado y los que están en una rutina. */
  function misEjercicios() {
    var m = {};
    var poner = function (n) { var k = claveEj(n); if (!k) return null; return (m[k] = m[k] || { nombre: String(n).trim(), series: 0, rutinas: {} }); };
    if (estado.tablas) estado.tablas.series_gym.forEach(function (s) { var e = poner(s.ejercicio); if (e) e.series++; });
    if (hayRutinas()) estado.tablas.rutinas.forEach(function (t) { var e = poner(t.ejercicio); if (e) e.rutinas[claveEj(t.rutina)] = true; });
    if (hayEjercicios()) estado.tablas.ejercicios.forEach(function (f) { var e = poner(f.nombre); if (e) { e.nombre = String(f.nombre).trim(); e.fila = f; } });
    return Object.keys(m).map(function (k) { var e = m[k]; e.nRutinas = Object.keys(e.rutinas).length; return e; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
  }
  function ultimoRegistro(nombre) {
    var e = historialEjercicios()[sinTildes(String(nombre).trim())];
    return e && e.sesiones.length ? e.sesiones[e.sesiones.length - 1] : null;
  }

  /** Miniatura (posición A) de un ejercicio. */
  function miniEjercicio(info, clase) {
    var caja = h("span", { class: clase });
    if (info.propias) caja.appendChild(imgSubida(info.propias[0], ""));
    else if (info.foto) {
      var img = h("img", { src: FOTOS_EJ + info.foto + "/0.jpg", alt: "", loading: "lazy" });
      img.addEventListener("error", function () { caja.textContent = "🏋️"; });
      caja.appendChild(img);
    } else caja.textContent = "🏋️";
    return caja;
  }
  /** Fotos A y B de un ejercicio (tuyas o de la biblioteca); al tocarlas se ven en grande. */
  function fotosAB(info, titulo, claseCaja, claseFoto) {
    var caja = h("div", { class: claseCaja });
    if (info.propias) {
      if (info.propias.length === 1) caja.classList.add("una");
      info.propias.forEach(function (id, k) {
        caja.appendChild(h("button", { type: "button", class: claseFoto + " propia", "aria-label": "Ver en grande la foto " + (k ? "B" : "A") + " de " + titulo, onclick: function () {
          traerFotos(info.propias).then(function (m) { abrirVisorFoto({ srcs: info.propias.map(function (x) { return m[x]; }).filter(Boolean) }, titulo, k); }, manejarError);
        } }, imgSubida(id, ""), h("span", { class: "ab", text: info.propias.length === 1 ? "A · B" : k ? "B · final" : "A · inicio" })));
      });
    } else if (info.foto) {
      [0, 1].forEach(function (k) {
        var b = h("button", { type: "button", class: claseFoto + " biblio", "aria-label": "Ver en grande la foto " + (k ? "B" : "A") + " de " + titulo, onclick: function () { abrirVisorFoto(info, titulo, k); } });
        var img = h("img", { src: FOTOS_EJ + info.foto + "/" + k + ".jpg", alt: "", loading: "lazy" });
        img.addEventListener("error", function () { b.textContent = "🏋️"; b.disabled = true; });
        b.appendChild(img); b.appendChild(h("span", { class: "ab", text: k ? "B · final" : "A · inicio" }));
        caja.appendChild(b);
      });
    } else return null;
    return caja;
  }

  /** Pestaña «Ejercicios» de Entreno: buscar, filtrar, abrir y crear. */
  function pintarTabEjercicios() {
    var f = estado.biblio = estado.biblio || { q: "", musculo: "", equipo: "", todos: false };
    var buscar = h("input", { id: "f-buscar-ej", type: "search", value: f.q, placeholder: "Busca: remo, polea, glúteo, jalón…", "aria-label": "Buscar ejercicio", autocomplete: "off" });
    var alcance = h("div", { class: "seg dos", role: "group", "aria-label": "Qué ejercicios ver" });
    var chipsM = h("div", { class: "chips chips-scroll", role: "group", "aria-label": "Filtrar por músculo" });
    var chipsE = h("div", { class: "chips chips-scroll", role: "group", "aria-label": "Filtrar por equipo" });
    var cuenta = h("div", { class: "nota", "aria-live": "polite" });
    var lista = h("div", { class: "biblio" });
    var mios = misEjercicios(), hist = historialEjercicios();
    function chips() {
      alcance.textContent = ""; chipsM.textContent = ""; chipsE.textContent = "";
      [[false, "⭐ Los míos"], [true, "📚 Todos"]].forEach(function (a) {
        alcance.appendChild(h("button", { type: "button", class: "pill" + (f.todos === a[0] ? " on" : ""), "aria-pressed": f.todos === a[0] ? "true" : "false", text: a[1], onclick: function () { f.todos = a[0]; chips(); mostrar(); } }));
      });
      FILTROS_MUSCULO.forEach(function (m) {
        chipsM.appendChild(h("button", { type: "button", class: f.musculo === m[0] ? "on" : "", "aria-pressed": f.musculo === m[0] ? "true" : "false", text: m[1], onclick: function () { f.musculo = m[0]; chips(); mostrar(); } }));
      });
      FILTROS_EQUIPO.forEach(function (q) {
        chipsE.appendChild(h("button", { type: "button", class: f.equipo === q[0] ? "on" : "", "aria-pressed": f.equipo === q[0] ? "true" : "false", text: q[1], onclick: function () { f.equipo = q[0]; chips(); mostrar(); } }));
      });
    }
    function mostrar() {
      lista.textContent = "";
      var palabras = sinTildes(f.q).split(/[^a-z0-9ñ]+/).filter(Boolean);
      var musc = FILTROS_MUSCULO.filter(function (m) { return m[0] === f.musculo; })[0];
      // Elementos: tus ejercicios y, con «Todos», los de la biblioteca que aún no son tuyos
      var items = mios.map(function (e) { return { mio: e, d: datosEjercicio(e.nombre) }; });
      if (f.todos) {
        var usadas = items.map(function (x) { return x.d.ficha; });
        BIBLIOTECA.forEach(function (fi) { if (!fi.oculto && usadas.indexOf(fi) < 0) items.push({ d: datosEjercicio(fi.n, fi) }); });
      }
      var hallados = items.filter(function (x) {
        var d = x.d;
        if (f.equipo && d.equipo !== f.equipo) return false;
        if (musc && musc[2] && !d.p.some(function (g) { return musc[2].indexOf(g) >= 0; })) return false;
        var texto = sinTildes([d.nombre, d.textoP, d.textoS, NOMBRE_EQUIPO[d.equipo] || "", nombresGrupos(d.p.concat(d.s)), d.ficha ? d.ficha.n + " " + d.ficha.re.source.replace(/[^a-z ]+/g, " ") : ""].join(" "));
        return palabras.every(function (w) { return texto.indexOf(w) >= 0; });
      });
      var secciones = {}, orden = FILTROS_MUSCULO.slice(1).map(function (m) { return m[0]; }).concat(["otros"]);
      hallados.forEach(function (x) { var sc = seccionDe(x.d.p); (secciones[sc[0]] = secciones[sc[0]] || { nombre: sc[1], items: [] }).items.push(x); });
      orden.forEach(function (k) {
        var sc = secciones[k];
        if (!sc) return;
        sc.items.sort(function (a, b) { return (b.mio ? 1 : 0) - (a.mio ? 1 : 0) || a.d.nombre.localeCompare(b.d.nombre, "es"); });
        lista.appendChild(h("div", { class: "grupo-t", text: sc.nombre + " · " + sc.items.length }));
        lista.appendChild(h("div", { class: "bib-lista" }, sc.items.map(function (x) {
          var d = x.d, e = hist[claveEj(d.nombre)], ult = e && e.sesiones.length ? e.sesiones[e.sesiones.length - 1] : null;
          var info = { foto: d.foto, propias: d.propias };
          var tagFoto = d.propias ? h("span", { class: "tag", text: "📷 Foto tuya" }) : d.foto ? null : h("span", { class: "tag aviso", text: "⚠ Sin foto" });
          return h("button", { type: "button", class: "bib-card", "aria-label": d.nombre + (x.mio ? " (tuyo)" : ""), onclick: function () { abrirEjercicio(d.nombre, x.mio ? null : d.ficha); } },
            miniEjercicio(info, "bib-foto"),
            h("span", { class: "bib-t" },
              h("b", { text: d.nombre }),
              h("span", { class: "ej-m", text: nombresGrupos(d.p) + (d.s.length ? " · " + nombresGrupos(d.s) : "") || "Sin músculos" }),
              h("span", { class: "bib-tags" }, d.equipo ? h("span", { class: "tag", text: NOMBRE_EQUIPO[d.equipo] || d.equipo }) : null,
                x.mio && x.mio.nRutinas ? h("span", { class: "tag lo-haces", text: x.mio.nRutinas === 1 ? "EN 1 RUTINA" : "EN " + x.mio.nRutinas + " RUTINAS" }) : null,
                x.mio && !x.mio.nRutinas && x.mio.series ? h("span", { class: "tag lo-haces", text: "LO HACES" }) : null, tagFoto),
              ult ? h("span", { class: "nota", text: "Último: " + textoSerie(mejorSerie(ult)) + " · " + corta(ult.fecha) }) : null));
        })));
      });
      cuenta.textContent = plural(hallados.length, "ejercicio", "ejercicios");
      if (!hallados.length) lista.appendChild(h("div", { class: "vacio", text: !f.todos && !mios.length ? "Aún no tienes ejercicios. Toca «📚 Todos» para ver la biblioteca o crea uno." : "No encontré ejercicios. Prueba con otra palabra, quita un filtro o mira en «📚 Todos»." }));
    }
    buscar.addEventListener("input", function () { f.q = buscar.value; mostrar(); });
    chips();
    raiz.appendChild(h("div", { class: "graf bib-filtros" }, buscar, alcance, chipsM, chipsE, h("div", { class: "bib-fila" }, cuenta)));
    raiz.appendChild(lista);
    raiz.appendChild(h("button", { type: "button", class: "nueva-rutina crear-ej", text: "＋ Crear ejercicio", onclick: function () { abrirEditarEjercicio(null); } }));
    mostrar();
  }

  /** Ficha de un ejercicio: fotos (A y B), músculos, cómo hacerlo, tu nota, tus registros y «Editar ejercicio». */
  function abrirEjercicio(nombre, fichaForzada) {
    var d = datosEjercicio(nombre, fichaForzada);
    var info = { foto: d.foto, propias: d.propias, principales: d.p, secundarios: d.s };
    var mio = misEjercicios().filter(function (e) { return claveEj(e.nombre) === claveEj(d.nombre); })[0];
    var e = historialEjercicios()[claveEj(d.nombre)];
    var nivel = {};
    d.s.forEach(function (g) { nivel[g] = 2; });
    d.p.forEach(function (g) { nivel[g] = 12; });
    var tuyos;
    if (e && e.sesiones.length) {
      var ult = e.sesiones[e.sesiones.length - 1];
      var mejor = e.sesiones.reduce(function (a, x) { return !a || x.max > a.max ? x : a; }, null);
      tuyos = h("div", { class: "graf" }, h("h3", { text: "Tus registros" }),
        h("div", { class: "kp-ficha" },
          h("div", {}, h("b", { text: textoSerie(mejorSerie(ult)) }), h("small", { text: "Último · " + corta(ult.fecha) })),
          h("div", {}, h("b", { text: "🏆 " + (mejor.max ? fmt(mejor.max, 1) + " kg" : textoSerie(mejorSerie(mejor))) }), h("small", { text: "Mejor · " + corta(mejor.fecha) })),
          h("div", {}, h("b", { text: String(e.sesiones.length) }), h("small", { text: e.sesiones.length === 1 ? "sesión" : "sesiones" }))),
        h("button", { type: "button", class: "btn sec", text: "Ver historial", onclick: function () { abrirHistorialEjercicio(e); } }));
    } else {
      tuyos = h("div", { class: "graf" }, h("h3", { text: "Tus registros" }),
        h("p", { class: "ayuda", text: "Aún no lo has registrado. Cuando lo hagas, dile a Claude el nombre tal como está aquí y verás tu último peso, tu récord y el historial." }));
    }
    abrirHoja(d.nombre, h("div", { class: "ficha" },
      h("button", { type: "button", class: "btn lima editar-ej", text: "✎ Editar ejercicio", onclick: function () { abrirEditarEjercicio(d.nombre, null, fichaForzada); } }),
      fotosAB(info, d.nombre, "ficha-fotos", "ficha-foto") || h("p", { class: "ayuda", text: "Sin fotos. Toca «Editar ejercicio» para subir las tuyas." }),
      h("div", { class: "chips-m" }, d.equipo ? h("span", { text: "🏋️ " + (NOMBRE_EQUIPO[d.equipo] || d.equipo) }) : null,
        d.nivel ? h("span", { text: d.nivel === "intermedio" ? "📈 Intermedio" : "🌱 Principiante" }) : null,
        mio && mio.nRutinas ? h("span", { class: "lo-haces", text: "⭐ En " + plural(mio.nRutinas, "rutina", "rutinas") }) : mio && mio.series ? h("span", { class: "lo-haces", text: "⭐ Lo haces" }) : null),
      h("div", { class: "graf" }, h("h3", { text: "Qué trabaja" }),
        h("div", { class: "ficha-musc" },
          h("div", { class: "cuerpo-fig" }, figuraCuerpo("frente", nivel), figuraCuerpo("espalda", nivel)),
          h("div", { class: "ficha-txt" },
            h("div", {}, h("small", { text: "Principal" }), h("b", { text: d.textoP || "—" })),
            d.textoS ? h("div", {}, h("small", { text: "También" }), h("b", { text: d.textoS })) : null)),
        leyenda([["#0E6B47", "Principal"], ["#B8E68F", "También"]])),
      d.pasos.length ? h("div", { class: "graf" }, h("h3", { text: "Cómo hacerlo" }),
        h("ol", { class: "pasos" }, d.pasos.map(function (p) { return h("li", { text: p }); })),
        d.tip ? h("div", { class: "tip" }, h("span", { "aria-hidden": "true", text: "💡" }), h("span", { text: d.tip })) : null) : null,
      d.nota ? h("div", { class: "graf" }, h("h3", { text: "Tu nota" }), h("p", { class: "ficha-nota", text: d.nota })) : null,
      tuyos));
  }
  /** Compatibilidad: abrir la ficha desde una ficha de la biblioteca. */
  function abrirFicha(fi) { abrirEjercicio(fi.n, fi); }

  /** Crear o editar un ejercicio (una sola vez): nombre, fotos A y B, músculos, equipo, cómo hacerlo y nota. */
  function abrirEditarEjercicio(nombre, alGuardar, fichaForzada) {
    if (!hayEjercicios()) {
      abrirHoja("Editar ejercicio", avisoServicio("Para guardar tus ejercicios con sus fotos hay que actualizar tu servicio de Google (versión 5). Toma 2 minutos."));
      return;
    }
    var d = nombre ? datosEjercicio(nombre, fichaForzada) : null, fila = d ? d.fila : null;
    var nombreViejo = d ? d.nombre : null;
    var campo = h("input", { id: "f-ej-nombre", type: "text", maxlength: 80, value: d ? d.nombre : "", list: "lista-biblio", autocomplete: "off", "aria-label": "Nombre del ejercicio" });
    var opciones = h("datalist", { id: "lista-biblio" }, BIBLIOTECA.filter(function (x) { return !x.oculto; }).map(function (x) { return h("option", { value: x.n }); }));
    var sugerencia = h("div", { class: "sug", "aria-live": "polite" });
    // Fotos: modo «auto» (biblioteca), «bd» (una de las ~800 fotos de la biblioteca) o «propias» (subidas por ti)
    var fotos = { modo: "auto", a: null, b: null, bd: null };
    if (d && d.propias) { fotos.modo = "propias"; fotos.a = d.propias[0] ? { id: d.propias[0] } : null; fotos.b = d.propias[1] ? { id: d.propias[1] } : null; }
    else if (fila && /^bd:/.test(fila.foto_a || "")) { fotos.modo = "bd"; fotos.bd = fila.foto_a.slice(3); }
    else if (d && d.foto && (!d.ficha || d.foto !== d.ficha.f)) { fotos.modo = "bd"; fotos.bd = d.foto; }
    var ranuras = h("div", { class: "subir" }), notaFotos = h("p", { class: "ayuda" });
    var musc = {}, tocoMusculos = !!(d && d.musculosPropios);
    if (d) { d.s.forEach(function (g) { musc[g] = 1; }); d.p.forEach(function (g) { musc[g] = 2; }); }
    var chipsMusc = h("div", { class: "chips chips-musc", role: "group", "aria-label": "Músculos que trabaja" });
    var equipo = fila && fila.equipo ? fila.equipo : d && d.equipo ? d.equipo : "";
    var tocoEquipo = !!(fila && fila.equipo);
    var chipsEq = h("div", { class: "chips chips-musc", role: "group", "aria-label": "Equipo" });
    var pasos = h("textarea", { id: "f-ej-pasos", rows: 4, maxlength: 3000, "aria-label": "Cómo hacerlo", placeholder: "Un paso por línea. Si lo dejas vacío, se usa el de la biblioteca." });
    if (fila && fila.pasos) pasos.value = fila.pasos;
    var nota = h("input", { id: "f-ej-nota", type: "text", maxlength: 300, value: fila && fila.nota ? fila.nota : "", placeholder: "Por ejemplo: asiento en el 4", "aria-label": "Nota" });

    function fichaActual() { return fichaForzada && claveEj(campo.value) === claveEj(fichaForzada.n) ? fichaForzada : fichaDe(campo.value); }
    function pintarRanuras() {
      ranuras.textContent = "";
      var fi = fichaActual();
      ["a", "b"].forEach(function (lado, k) {
        var f = fotos[lado], caja = h("div", { class: "slot" });
        if (fotos.modo === "propias" && f) { caja.classList.add("lleno"); caja.appendChild(f.datos ? h("img", { src: f.datos, alt: "Foto " + lado.toUpperCase() }) : imgSubida(f.id, "Foto " + lado.toUpperCase())); }
        else if (fotos.modo === "bd" && fotos.bd) { caja.classList.add("biblio"); caja.appendChild(h("img", { src: FOTOS_EJ + fotos.bd + "/" + k + ".jpg", alt: "Foto " + lado.toUpperCase() })); }
        else if (fotos.modo === "auto" && fi) { caja.classList.add("biblio"); caja.appendChild(h("img", { src: FOTOS_EJ + fi.f + "/" + k + ".jpg", alt: "Foto de la biblioteca " + lado.toUpperCase() })); }
        else caja.appendChild(h("span", { text: "Sin foto " + lado.toUpperCase() }));
        caja.appendChild(h("span", { class: "ab", text: lado.toUpperCase() }));
        ranuras.appendChild(caja);
      });
      notaFotos.textContent = fotos.modo === "propias" ? "Fotos tuyas." : fotos.modo === "bd" ? "Foto elegida de la biblioteca." : fi ? "Fotos automáticas de la biblioteca. Sube las tuyas si quieres otras." : "Sin fotos: sube las tuyas o elige una de la biblioteca.";
    }
    function selector(etiqueta, partes, destino) {
      var input = h("input", { type: "file", accept: "image/*", class: "oculto-archivo", "aria-label": etiqueta });
      input.addEventListener("change", function () {
        var f = input.files && input.files[0]; if (!f) return;
        prepararImagen(f, partes).then(function (res) {
          if (fotos.modo !== "propias") { fotos.a = null; fotos.b = null; }
          fotos.modo = "propias";
          if (partes === 2) { fotos.a = { datos: res[0] }; fotos.b = { datos: res[1] }; } else fotos[destino] = { datos: res[0] };
          input.value = ""; pintarRanuras();
        }, function (e) { input.value = ""; aviso(e.message, true); });
      });
      return h("label", { class: "chip-subir" }, input, etiqueta);
    }
    var buscadorBD = elegirFotoBD(function (x) { fotos.modo = "bd"; fotos.bd = x.id; fotos.a = null; fotos.b = null; pintarRanuras(); buscadorBD.hidden = true; aviso("Foto elegida: " + x.name); });
    buscadorBD.hidden = true;
    function pintarMusculos() {
      chipsMusc.textContent = "";
      Object.keys(GRUPOS).forEach(function (g) {
        var n = musc[g] || 0;
        chipsMusc.appendChild(h("button", { type: "button", class: n === 2 ? "p" : n === 1 ? "s" : "", "aria-pressed": n ? "true" : "false",
          "aria-label": GRUPOS[g] + (n === 2 ? " (principal)" : n === 1 ? " (también)" : ""), text: GRUPOS[g],
          onclick: function () { musc[g] = n === 0 ? 2 : n === 2 ? 1 : 0; tocoMusculos = true; pintarMusculos(); } }));
      });
    }
    function pintarEquipo() {
      chipsEq.textContent = "";
      FILTROS_EQUIPO.slice(1).forEach(function (q) {
        chipsEq.appendChild(h("button", { type: "button", class: equipo === q[0] ? "p" : "", "aria-pressed": equipo === q[0] ? "true" : "false", text: q[1],
          onclick: function () { equipo = equipo === q[0] ? "" : q[0]; tocoEquipo = true; pintarEquipo(); } }));
      });
    }
    function alCambiarNombre() {
      var fi = fichaActual(), n = campo.value.trim();
      var otro = n && claveEj(n) !== claveEj(nombreViejo || "") ? misEjercicios().filter(function (e) { return claveEj(e.nombre) === claveEj(n) && (nombreViejo || e.fila); })[0] : null;
      if (!n) sugerencia.textContent = "";
      else if (otro) sugerencia.textContent = "⚠ Ya tienes un ejercicio que se llama «" + otro.nombre + "».";
      else if (fi) sugerencia.textContent = "✓ Está en la biblioteca (" + fi.n + "): fotos, músculos y «Cómo hacerlo» listos. Cambia solo lo que quieras.";
      else sugerencia.textContent = "No está en la biblioteca: sube tus fotos y marca los músculos.";
      if (!tocoMusculos) { musc = {}; if (fi) { fi.s.forEach(function (g) { musc[g] = 1; }); fi.p.forEach(function (g) { musc[g] = 2; }); } pintarMusculos(); }
      if (!tocoEquipo) { equipo = fi ? fi.eq : ""; pintarEquipo(); }
      pasos.placeholder = fi ? "Si lo dejas vacío se usa el de la biblioteca: «" + fi.pasos[0] + "»…" : "Un paso por línea.";
      pintarRanuras();
    }
    campo.addEventListener("input", alCambiarNombre);

    var guardar = h("button", { class: "btn lima", type: "button", text: "Guardar ejercicio", onclick: function () {
      var n = campo.value.trim();
      if (!n) return aviso("Escribe el nombre del ejercicio.", true);
      var renombra = nombreViejo && n !== nombreViejo;
      var cambiaClave = nombreViejo && claveEj(n) !== claveEj(nombreViejo);
      var otro = misEjercicios().filter(function (e) { return claveEj(e.nombre) === claveEj(n); })[0];
      if (otro && (nombreViejo ? cambiaClave : !!otro.fila)) return aviso("Ya tienes un ejercicio que se llama «" + otro.nombre + "». " + (nombreViejo ? "Para juntarlos, usa «🔗 Unir con otro ejercicio» (abajo)." : "Usa otro nombre."), true);
      var cuantas = renombra ? estado.tablas.series_gym.filter(function (s) { return claveEj(s.ejercicio) === claveEj(nombreViejo); }).length : 0;
      var enRutinas = renombra ? estado.tablas.rutinas.filter(function (t) { return claveEj(t.ejercicio) === claveEj(nombreViejo); }).length : 0;
      if (renombra && (cuantas || enRutinas) && !confirm("¿Cambiar «" + nombreViejo + "» por «" + n + "»? También se cambia en " + plural(cuantas, "serie registrada", "series registradas") + " y en " + plural(enRutinas, "tarjeta de rutina", "tarjetas de rutinas") + ".")) return;
      var fi = fichaActual();
      var pr = Object.keys(musc).filter(function (g) { return musc[g] === 2; }).sort(), se = Object.keys(musc).filter(function (g) { return musc[g] === 1; }).sort();
      var igualFicha = fi && pr.join() === fi.p.slice().sort().join() && se.join() === fi.s.filter(function (g) { return fi.p.indexOf(g) < 0; }).sort().join();
      var datos = { nombre: n, principales: igualFicha ? null : pr.join(",") || null, secundarios: igualFicha ? null : se.join(",") || null,
        equipo: equipo && !(fi && fi.eq === equipo) ? equipo : null, pasos: pasos.value.trim() || null, nota: nota.value.trim() || null };
      var viejas = fila ? [fila.foto_a, fila.foto_b].filter(function (x) { return x && !/^bd:/.test(x); }) : (d && d.propias ? d.propias.slice() : []);
      guardar.disabled = true; guardar.textContent = "Subiendo fotos…";
      var subir = function (lado) {
        var f = fotos[lado];
        if (fotos.modo !== "propias" || !f) return Promise.resolve(null);
        if (f.id) return Promise.resolve(f.id);
        return api("subirFoto", { imagen: f.datos }).then(function (r) { guardarFotoLocal(r.id, f.datos); f.id = r.id; delete f.datos; return r.id; });
      };
      subir("a").then(function (a) { datos.foto_a = fotos.modo === "bd" ? "bd:" + fotos.bd : a; return subir("b"); }).then(function (b) {
        datos.foto_b = fotos.modo === "propias" ? b : null;
        guardar.textContent = "Guardando…";
        if (fila) return api("actualizar", { tabla: "ejercicios", id: fila.id, fila: datos }).then(function () { Object.assign(fila, datos); });
        return api("agregar", { tabla: "ejercicios", fila: datos }).then(function (r) { estado.tablas.ejercicios.push(Object.assign({ id: r.id, creado_en: new Date().toISOString() }, datos)); });
      }).then(function () {
        if (!renombra || !(cuantas || enRutinas)) return;
        guardar.textContent = "Cambiando el nombre…";
        return renombrarEnServicio(nombreViejo, n);
      }).then(function () {
        guardarCache();
        var sueltas = viejas.filter(function (id) { return id !== datos.foto_a && id !== datos.foto_b; });
        cerrarHoja(); aviso("Ejercicio guardado: «" + n + "»"); pintar();
        if (alGuardar) alGuardar(n);
        return borrarFotosSueltas(sueltas);
      }, function (e) { guardarCache(); guardar.disabled = false; guardar.textContent = "Guardar ejercicio"; manejarError(e); });
    } });
    var unir = d && misEjercicios().some(function (e) { return claveEj(e.nombre) === claveEj(d.nombre); }) ? h("button", { class: "btn sec", type: "button", text: "🔗 Unir con otro ejercicio", onclick: function () { abrirUnir(d.nombre); } }) : null;
    var quitar = fila ? h("button", { class: "btn peligro", type: "button", text: d.ficha ? "Quitar mis cambios (volver a la biblioteca)" : "Borrar este ejercicio", onclick: function () {
      if (!confirm(d.ficha ? "¿Volver a las fotos, músculos y pasos de la biblioteca? Tus fotos de este ejercicio se borran." : "¿Borrar «" + fila.nombre + "»? Tus series registradas y tus rutinas no se borran, pero quedará sin fotos.")) return;
      quitar.disabled = true;
      api("borrar", { tabla: "ejercicios", id: fila.id }).then(function () {
        estado.tablas.ejercicios = estado.tablas.ejercicios.filter(function (x) { return x !== fila; }); guardarCache();
        cerrarHoja(); aviso(d.ficha ? "Listo: vuelve a la biblioteca" : "Ejercicio borrado"); pintar();
        return borrarFotosSueltas([fila.foto_a, fila.foto_b].filter(function (x) { return x && !/^bd:/.test(x); }));
      }, function (e) { quitar.disabled = false; manejarError(e); });
    } }) : null;

    abrirHoja(nombre ? "Editar ejercicio" : "Crear ejercicio", h("div", { class: "editor-tar" },
      h("label", { for: "f-ej-nombre", text: "Nombre (como en Smart Fit)" }), campo, opciones, sugerencia,
      h("label", { text: "Fotos" }), ranuras,
      h("div", { class: "chips-subir" },
        selector("📷 Subir A y B juntas", 2), selector("📷 Subir A", 1, "a"), selector("📷 Subir B", 1, "b"),
        h("button", { type: "button", class: "chip-subir", text: "📚 Elegir de la biblioteca", onclick: function () { buscadorBD.hidden = !buscadorBD.hidden; if (!buscadorBD.hidden) buscadorBD.abrir(); } }),
        h("button", { type: "button", class: "chip-subir", text: "↺ Automática", onclick: function () { fotos.modo = "auto"; fotos.a = null; fotos.b = null; fotos.bd = null; pintarRanuras(); } })),
      notaFotos, buscadorBD,
      h("p", { class: "ayuda", text: "Sirve una captura de pantalla o una foto de tu galería. Si subes una sola con las dos posiciones lado a lado, la app la parte en A y B. Si trae más cosas, recórtala antes en tu galería." }),
      h("label", { text: "Qué trabaja · toca una vez = principal, otra vez = también, otra = quitar" }), chipsMusc,
      h("label", { text: "Equipo" }), chipsEq,
      h("label", { for: "f-ej-pasos", text: "Cómo hacerlo (opcional)" }), pasos,
      h("label", { for: "f-ej-nota", text: "Nota (opcional)" }), nota,
      guardar,
      h("p", { class: "ayuda centro", text: "Los cambios se ven en todas tus rutinas. Si cambias el nombre, también se corrige en tu historial de series." }),
      unir, quitar));
    alCambiarNombre();
    if (nombre) sugerencia.textContent = "";
  }

  /** Elegir con qué ejercicio unir este (queda el nombre del que elijas). */
  function abrirUnir(origen) {
    var buscar = h("input", { id: "f-buscar-unir", type: "search", placeholder: "Busca el ejercicio…", "aria-label": "Buscar ejercicio", autocomplete: "off" });
    var cont = h("div", { class: "lista" });
    var palabrasO = sinTildes(origen).split(/[^a-z0-9ñ]+/).filter(function (w) { return w.length > 2; });
    var parecido = function (n) { var t = sinTildes(n); return palabrasO.filter(function (w) { return t.indexOf(w) >= 0; }).length; };
    var otros = misEjercicios().filter(function (e) { return claveEj(e.nombre) !== claveEj(origen); })
      .sort(function (a, b) { return parecido(b.nombre) - parecido(a.nombre) || a.nombre.localeCompare(b.nombre, "es"); });
    function mostrar() {
      var q = sinTildes(buscar.value).trim();
      cont.textContent = "";
      otros.filter(function (e) { return !q || sinTildes(e.nombre).indexOf(q) >= 0; }).slice(0, 40).forEach(function (e) {
        var info = infoEjercicio(e.nombre), partes = [];
        if (e.series) partes.push(plural(e.series, "serie", "series"));
        if (e.nRutinas) partes.push("en " + plural(e.nRutinas, "rutina", "rutinas"));
        if (info.propias) partes.push("📷 fotos tuyas");
        cont.appendChild(h("button", { type: "button", class: "item con-emo", "aria-label": "Unir con " + e.nombre, onclick: function () { unirEjercicios(origen, e.nombre); } },
          miniEjercicio(info, "emo mini-foto"), h("div", { class: "t" }, h("b", { text: e.nombre }), h("span", { text: partes.join(" · ") || "sin registros" }))));
      });
      if (!cont.childNodes.length) cont.appendChild(h("p", { class: "ayuda", text: "No encontré ese ejercicio." }));
    }
    buscar.addEventListener("input", mostrar);
    abrirHoja("Unir «" + origen + "» con…", h("div", { style: "display:flex;flex-direction:column;gap:10px" },
      h("p", { class: "ayuda", text: "Elige el ejercicio con el que es el mismo. Su historial se junta en uno solo y queda el nombre del que elijas. Se conservan las fotos que subiste." }),
      buscar, cont));
    mostrar();
  }
  /** Une dos ejercicios: el historial de «origen» pasa a «destino»; quedan las fotos de destino (o las de origen si destino no tiene). */
  function unirEjercicios(origen, destino) {
    var kO = claveEj(origen);
    var nSeries = estado.tablas.series_gym.filter(function (x) { return claveEj(x.ejercicio) === kO; }).length;
    var nRut = hayRutinas() ? estado.tablas.rutinas.filter(function (t) { return claveEj(t.ejercicio) === kO; }).length : 0;
    var fO = filaEjercicio(origen), fD = filaEjercicio(destino);
    var propiasO = fO ? [fO.foto_a, fO.foto_b].filter(Boolean) : [], propiasD = fD ? [fD.foto_a, fD.foto_b].filter(Boolean) : [];
    var mueveFotos = fO && fD && !propiasD.length && propiasO.length;
    var queda = propiasD.length ? "las fotos de «" + destino + "»" : propiasO.length ? "las fotos de «" + origen + "»" : "las fotos de la biblioteca";
    if (!confirm("¿Unir «" + origen + "» con «" + destino + "»?\n\n• Sus " + plural(nSeries, "serie", "series") + (nRut ? " y " + plural(nRut, "tarjeta de rutina", "tarjetas de rutinas") : "") + " pasan a «" + destino + "».\n• Quedan " + queda + ".\n• «" + origen + "» deja de existir.")) return;
    aviso("Uniendo…");
    var paso = Promise.resolve();
    if (mueveFotos) paso = api("actualizar", { tabla: "ejercicios", id: fD.id, fila: Object.assign({}, fD, { foto_a: fO.foto_a || null, foto_b: fO.foto_b || null }) })
      .then(function () { fD.foto_a = fO.foto_a || null; fD.foto_b = fO.foto_b || null; });
    paso.then(function () { return renombrarEnServicio(origen, destino); })
      .then(function () {
        if (fO && fD) return api("borrar", { tabla: "ejercicios", id: fO.id }).then(function () { estado.tablas.ejercicios = estado.tablas.ejercicios.filter(function (x) { return x !== fO; }); });
      })
      .then(function () {
        if (estado.sesion) { estado.sesion.ejercicios.forEach(function (e) { if (claveEj(e.nombre) === kO) e.nombre = destino; }); guardarSesion(); }
        guardarCache(); cerrarHoja();
        aviso("Listo: «" + origen + "» quedó unido a «" + destino + "» (" + plural(nSeries, "serie", "series") + ")");
        pintar();
        if (fO && fD && !mueveFotos) return borrarFotosSueltas(propiasO.filter(function (x) { return !/^bd:/.test(x); }));
      }, function (e) { guardarCache(); manejarError(e); pintar(); });
  }
  /** Cambia el nombre en tus series, rutinas y ejercicios (en tu hoja y en el teléfono). */
  function renombrarEnServicio(viejo, nuevo) {
    return api("renombrar", { viejo: viejo, nuevo: nuevo }).then(function () {
      var k = claveEj(viejo);
      estado.tablas.series_gym.forEach(function (s) { if (claveEj(s.ejercicio) === k) s.ejercicio = nuevo; });
      if (hayRutinas()) estado.tablas.rutinas.forEach(function (t) { if (claveEj(t.ejercicio) === k) t.ejercicio = nuevo; });
      if (hayEjercicios()) estado.tablas.ejercicios.forEach(function (f) { if (claveEj(f.nombre) === k) f.nombre = nuevo; });
      var pers = leerPersonal();
      if (pers[k]) { pers[claveEj(nuevo)] = pers[k]; delete pers[k]; guardarPersonal(pers); }
    });
  }

  /**
   * Una sola vez: lo que estaba en las tarjetas de rutina (fotos y músculos, servicio v4) y la foto elegida en este
   * celular (Ajustes, antes) pasa a «Mis ejercicios». Las tarjetas quedan solo con peso, series y repeticiones.
   */
  var migrando = false;
  function migrarEjercicios() {
    if (migrando || !hayEjercicios() || !hayRutinas()) return Promise.resolve(false);
    var tarjetas = estado.tablas.rutinas.filter(function (t) { return t.foto_a || t.foto_b || t.principales || t.secundarios; });
    var personal = leerPersonal(), nombres = {};
    misEjercicios().forEach(function (e) { nombres[claveEj(e.nombre)] = e.nombre; });
    var claves = Object.keys(personal).filter(function (k) { return personal[k] && personal[k].foto && nombres[k] && !filaEjercicio(nombres[k]); });
    if (!tarjetas.length && !claves.length) { if (Object.keys(personal).length && !claves.length) borrarLocal("ejercicios_personal"); return Promise.resolve(false); }
    migrando = true;
    var paso = Promise.resolve();
    tarjetas.forEach(function (t) {
      paso = paso.then(function () {
        var crear = filaEjercicio(t.ejercicio) ? Promise.resolve() : (function () {
          var m = musculosElegidos(t), fi = fichaDe(t.ejercicio);
          var igual = m && fi && m.p.slice().sort().join() === fi.p.slice().sort().join() && m.s.slice().sort().join() === fi.s.filter(function (g) { return fi.p.indexOf(g) < 0; }).sort().join();
          var datos = { nombre: String(t.ejercicio).trim(), foto_a: t.foto_a || null, foto_b: t.foto_b || null,
            principales: m && !igual ? m.p.join(",") || null : null, secundarios: m && !igual ? m.s.join(",") || null : null };
          return api("agregar", { tabla: "ejercicios", fila: datos }).then(function (r) { estado.tablas.ejercicios.push(Object.assign({ id: r.id }, datos)); });
        })();
        var viejas = [t.foto_a, t.foto_b];
        return crear.then(function () { return actualizarTarjeta(t, { foto_a: null, foto_b: null, principales: null, secundarios: null }); })
          .then(function () { return borrarFotosSueltas(viejas); });
      });
    });
    claves.forEach(function (k) {
      paso = paso.then(function () {
        var p = personal[k];
        var datos = { nombre: nombres[k], foto_a: "bd:" + p.foto, principales: (p.principales || []).join(",") || null, secundarios: (p.secundarios || []).join(",") || null };
        return api("agregar", { tabla: "ejercicios", fila: datos }).then(function (r) { estado.tablas.ejercicios.push(Object.assign({ id: r.id }, datos)); });
      });
    });
    return paso.then(function () {
      borrarLocal("ejercicios_personal"); migrando = false; guardarCache(); return true;
    }, function () { migrando = false; guardarCache(); return false; });
  }

  // ---------- Mis rutinas: tarjetas armadas a tu gusto, con tus fotos ----------
  // Las fotos que subes se guardan en tu hoja de Google (pestaña «fotos») y una copia en el teléfono para abrir rápido.
  var fotosMem = {};
  var bdFotos = null;
  function abrirBDFotos() {
    if (bdFotos) return bdFotos;
    bdFotos = new Promise(function (ok, mal) {
      try {
        var r = indexedDB.open("seguimiento-fotos", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("fotos"); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { mal(r.error); };
      } catch (e) { mal(e); }
    });
    bdFotos.catch(function () { /* sin almacenamiento: solo memoria */ });
    return bdFotos;
  }
  function fotoLocal(id) {
    return abrirBDFotos().then(function (db) {
      return new Promise(function (ok) {
        var q = db.transaction("fotos").objectStore("fotos").get(id);
        q.onsuccess = function () { ok(q.result || null); };
        q.onerror = function () { ok(null); };
      });
    }).catch(function () { return null; });
  }
  function guardarFotoLocal(id, datos) {
    fotosMem[id] = datos;
    return abrirBDFotos().then(function (db) { db.transaction("fotos", "readwrite").objectStore("fotos").put(datos, id); }).catch(function () { /* nada */ });
  }
  var pidiendoFotos = {};
  /** Trae las fotos (teléfono primero; si no están, de tu hoja de Google, de a 15). */
  function traerFotos(ids) {
    ids = ids.filter(function (x, i) { return x && ids.indexOf(x) === i; });
    var out = {};
    return Promise.all(ids.map(function (id) {
      if (fotosMem[id]) { out[id] = fotosMem[id]; return null; }
      return fotoLocal(id).then(function (d) { if (d) { fotosMem[id] = d; out[id] = d; } });
    })).then(function () {
      var faltan = ids.filter(function (id) { return !out[id]; });
      var lotes = [];
      for (var i = 0; i < faltan.length; i += 15) lotes.push(faltan.slice(i, i + 15));
      return Promise.all(lotes.map(function (lote) {
        var k = lote.join(",");
        pidiendoFotos[k] = pidiendoFotos[k] || api("fotos", { ids: lote }).then(function (r) {
          Object.keys(r.fotos || {}).forEach(function (id) { guardarFotoLocal(id, r.fotos[id]); });
          return r.fotos || {};
        }).then(function (f) { delete pidiendoFotos[k]; return f; }, function (e) { delete pidiendoFotos[k]; throw e; });
        return pidiendoFotos[k].then(function (f) { Object.keys(f).forEach(function (id) { out[id] = f[id]; }); });
      }));
    }).then(function () { return out; });
  }
  /** Una foto subida por ti: se muestra en cuanto llega. */
  function imgSubida(id, alt) {
    var img = h("img", { alt: alt || "", class: "cargando-foto" });
    if (fotosMem[id]) { img.src = fotosMem[id]; img.classList.remove("cargando-foto"); return img; }
    traerFotos([id]).then(function (f) { if (f[id]) { img.src = f[id]; img.classList.remove("cargando-foto"); } else img.classList.add("sin-foto"); },
      function () { img.classList.add("sin-foto"); });
    return img;
  }

  /** Achica una imagen del teléfono para guardarla (JPEG, máx. 640 px). partes: 1 = entera, 2 = mitad izquierda (A) y derecha (B). */
  function prepararImagen(archivo, partes) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var ancho = img.naturalWidth / partes, alto = img.naturalHeight;
        var res = [];
        for (var p = 0; p < partes; p++) {
          var escala = Math.min(1, 640 / Math.max(ancho, alto));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(ancho * escala)); c.height = Math.max(1, Math.round(alto * escala));
          var x = c.getContext("2d");
          x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, p * ancho, 0, ancho, alto, 0, 0, c.width, c.height);
          var calidad = 0.8, datos = c.toDataURL("image/jpeg", calidad);
          while (datos.length > 250000 && calidad > 0.35) { calidad -= 0.15; datos = c.toDataURL("image/jpeg", calidad); }
          res.push(datos);
        }
        ok(res);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("No pude abrir esa imagen. Prueba con una captura de pantalla (JPG o PNG).")); };
      img.src = url;
    });
  }

  function listaGrupos(t) { return String(t || "").split(",").map(function (x) { return x.trim(); }).filter(function (g) { return GRUPOS[g]; }); }
  function hayRutinas() { return !!(estado.tablas && Array.isArray(estado.tablas.rutinas)); }
  /** Las rutinas con sus tarjetas en orden. */
  function rutinasAgrupadas() {
    var por = {}, orden = [];
    (hayRutinas() ? estado.tablas.rutinas : []).forEach(function (t) {
      var n = String(t.rutina || "").trim(); if (!n) return;
      var k = sinTildes(n);
      if (!por[k]) { por[k] = { nombre: n, tarjetas: [] }; orden.push(k); }
      por[k].tarjetas.push(t);
    });
    var lista2 = orden.map(function (k) { return por[k]; });
    lista2.forEach(function (r) {
      r.tarjetas.sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0) || String(a.creado_en || "").localeCompare(String(b.creado_en || "")); });
      r.creado = r.tarjetas.reduce(function (m, t) { var c = String(t.creado_en || ""); return !m || (c && c < m) ? c : m; }, "");
    });
    var orden2 = ordenRutinas();
    return lista2.sort(function (a, b) {
      var ia = orden2.indexOf(sinTildes(a.nombre)), ib = orden2.indexOf(sinTildes(b.nombre));
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1; // las que ordenaste van primero; las nuevas, al final
      if (ib >= 0) return 1;
      return a.creado < b.creado ? -1 : a.creado > b.creado ? 1 : 0;
    });
  }
  /** Orden elegido para las rutinas (se guarda en este celular). */
  function ordenRutinas() { try { var o = JSON.parse(leerLocal("orden_rutinas") || "[]"); return Array.isArray(o) ? o : []; } catch (e) { return []; } }
  function moverRutina(nombre, dir) {
    var nombres = rutinasAgrupadas().map(function (r) { return sinTildes(r.nombre); }), i = nombres.indexOf(sinTildes(nombre)), j = i + dir;
    if (i < 0 || j < 0 || j >= nombres.length) return;
    nombres.splice(j, 0, nombres.splice(i, 1)[0]);
    guardarLocal("orden_rutinas", JSON.stringify(nombres));
  }
  function rutinaPorNombre(n) {
    var k = sinTildes(n).trim();
    return rutinasAgrupadas().filter(function (r) { return sinTildes(r.nombre) === k; })[0] || { nombre: n, tarjetas: [] };
  }
  /** Músculos que elegiste tú para la tarjeta (null = los de la biblioteca, que se actualizan solos). */
  function musculosElegidos(t) {
    if (!t || (!t.principales && !t.secundarios)) return null;
    // Arreglo: hasta el 15 nov la biblioteca confundía «abdominales … banco declinado» con el press declinado
    // y llenaba Pecho / Tríceps solos. Esa combinación en un ejercicio de abdominales se ignora.
    if (t.principales === "pecho" && t.secundarios === "triceps" && /abdomin|crunch/.test(sinTildes(t.ejercicio))) return null;
    return { p: listaGrupos(t.principales), s: listaGrupos(t.secundarios) };
  }
  function filaTarjeta(t, cambios) {
    var f = {};
    ["rutina", "orden", "ejercicio", "peso_kg", "series", "repeticiones", "nota"].forEach(function (c) { f[c] = vacio(t[c]) ? null : t[c]; });
    // Las fotos y los músculos van en el ejercicio, no en la tarjeta (se conservan si aún no se pasaron)
    ["principales", "secundarios", "foto_a", "foto_b"].forEach(function (c) { f[c] = vacio(t[c]) ? null : t[c]; });
    return Object.assign(f, cambios || {});
  }
  /** Guarda en tu hoja y en el teléfono sin volver a cargar todo. */
  function actualizarTarjeta(t, cambios) {
    var fila = filaTarjeta(t, cambios);
    return api("actualizar", { tabla: "rutinas", id: t.id, fila: fila }).then(function () {
      Object.assign(t, fila); guardarCache();
    });
  }
  function fotoEnUso(id) {
    var usa = function (x) { return x.foto_a === id || x.foto_b === id; };
    return (hayRutinas() && estado.tablas.rutinas.some(usa)) || (hayEjercicios() && estado.tablas.ejercicios.some(usa));
  }
  function borrarFotosSueltas(ids) {
    return ids.filter(Boolean).reduce(function (p, id) {
      return p.then(function () { if (!fotoEnUso(id)) return api("borrarFoto", { id: id }).catch(function () { /* queda una foto sin usar: no molesta */ }); });
    }, Promise.resolve());
  }
  function avisoServicio(texto) {
    return h("div", { class: "vacio" },
      h("p", { style: "margin:0 0 4px", text: texto }),
      h("button", { class: "btn lima", text: "Ver cómo", onclick: abrirAjustes }));
  }
  function irTab(tab) { return function () { estado.pantalla = "entreno"; estado.tabEntreno = tab; pintar(); window.scrollTo(0, 0); }; }

  /** Pestaña «Rutinas» de Entreno. */
  function pintarTabRutinas() {
    if (!hayRutinas()) { raiz.appendChild(avisoServicio("Para guardar tus rutinas hay que actualizar tu servicio de Google. Toma 2 minutos.")); return; }
    var rs = rutinasAgrupadas();
    if (!rs.length) raiz.appendChild(h("p", { class: "ayuda", text: "Aún no tienes rutinas. Crea la primera: ponle nombre (por ejemplo «Pecho - Hombro - Tríceps») y elige tus ejercicios." }));
    rs.forEach(function (r) {
      var grupos = [];
      r.tarjetas.forEach(function (t) { infoEjercicio(t.ejercicio).principales.forEach(function (g) { if (grupos.indexOf(g) < 0) grupos.push(g); }); });
      var ultima = r.tarjetas.map(function (t) { var u = ultimoRegistro(t.ejercicio); return u ? u.fecha : ""; }).sort().pop();
      var pos = rs.indexOf(r);
      raiz.appendChild(h("div", { class: "rut-fila" }, h("button", { type: "button", class: "rut-card", onclick: function () { estado.rutinaActual = r.nombre; estado.pantalla = "rutina"; pintar(); window.scrollTo(0, 0); } },
        r.tarjetas.length ? miniEjercicio(infoEjercicio(r.tarjetas[0].ejercicio), "rut-mini") : h("span", { class: "rut-mini", text: "🏋️" }),
        h("span", { class: "rut-t" }, h("b", { text: r.nombre }),
          h("small", { text: plural(r.tarjetas.length, "ejercicio", "ejercicios") + (ultima ? " · última vez: " + fechaLarga(ultima).toLowerCase() : "") }),
          h("span", { class: "bib-tags" }, grupos.slice(0, 5).map(function (g) { return h("span", { class: "tag verde", text: GRUPOS[g] }); }))),
        icono("sig", 16)),
        rs.length > 1 ? h("div", { class: "rut-mover" },
          h("button", { type: "button", "aria-label": "Subir la rutina " + r.nombre, disabled: pos === 0, onclick: function () { moverRutina(r.nombre, -1); pintar(); } }, "↑"),
          h("button", { type: "button", "aria-label": "Bajar la rutina " + r.nombre, disabled: pos === rs.length - 1, onclick: function () { moverRutina(r.nombre, 1); pintar(); } }, "↓")) : null));
    });
    raiz.appendChild(h("button", { type: "button", class: "nueva-rutina", text: "＋ Nueva rutina", onclick: abrirNuevaRutina }));
  }

  function abrirNuevaRutina() {
    var campo = h("input", { id: "f-rutina-nombre", type: "text", maxlength: 80, placeholder: "Pecho - Hombro - Tríceps - Abdomen", "aria-label": "Nombre de la rutina" });
    abrirHoja("Nueva rutina", h("form", { style: "display:flex;flex-direction:column;gap:6px", onsubmit: function (e) {
      e.preventDefault();
      var n = campo.value.trim();
      if (!n) return aviso("Escribe el nombre de la rutina.", true);
      if (rutinaPorNombre(n).tarjetas.length) return aviso("Ya tienes una rutina con ese nombre.", true);
      cerrarHoja(); estado.rutinaActual = n; estado.pantalla = "rutina"; pintar(); window.scrollTo(0, 0);
      abrirAgregarARutina(n);
    } }, h("label", { for: "f-rutina-nombre", text: "Nombre (como la llamas en Smart Fit)" }), campo,
      h("button", { class: "btn lima", type: "submit", text: "Crear y elegir el primer ejercicio" })));
    setTimeout(function () { campo.focus(); }, 50);
  }

  function pintarRutina() {
    raiz.textContent = "";
    bandas();
    var r = rutinaPorNombre(estado.rutinaActual || "");
    raiz.appendChild(h("div", { class: "top" },
      h("button", { class: "icono-btn", "aria-label": "Volver a Rutinas", onclick: irTab("rutinas") }, icono("atras", 20)),
      h("div", { class: "top-centro" }, h("div", { class: "sub", text: "Rutinas" }), h("div", { class: "titulo", text: r.nombre })),
      r.tarjetas.length ? h("button", { class: "icono-btn", "aria-label": "Editar rutina", onclick: function () { abrirEditarRutina(r); } }, h("span", { "aria-hidden": "true", text: "✎" })) : null));
    if (!hayRutinas()) { raiz.appendChild(avisoServicio("Para guardar tus rutinas hay que actualizar tu servicio de Google. Toma 2 minutos.")); raiz.appendChild(navegacion("entreno")); return; }
    if (!r.tarjetas.length) raiz.appendChild(h("p", { class: "ayuda", text: "Esta rutina aún no tiene ejercicios. Elige el primero." }));
    else if (estado.sesion && estado.sesion.rutina === r.nombre) raiz.appendChild(h("button", { type: "button", class: "btn lima btn-empezar", text: "▶ Seguir el entreno (" + minutosSesion(estado.sesion) + " min)", onclick: function () { estado.pantalla = "sesion"; pintar(); window.scrollTo(0, 0); } }));
    else raiz.appendChild(h("button", { type: "button", class: "btn lima btn-empezar", text: "▶ Empezar entreno", onclick: function () {
      if (estado.sesion && !confirm("Tienes otro entreno en curso (" + estado.sesion.rutina + "). ¿Terminarlo y empezar este? Las series que ya guardaste no se borran.")) return;
      empezarEntreno(r);
    } }));
    if (r.tarjetas.length) raiz.appendChild(h("button", { type: "button", class: "btn sec btn-garmin", text: "⌚ Pasar al Garmin", onclick: function () { abrirGarmin(r); } }));
    r.tarjetas.forEach(function (t, i) {
      var info = infoEjercicio(t.ejercicio), u = ultimoRegistro(t.ejercicio);
      var meta = [];
      if (t.series || t.repeticiones) meta.push((t.series ? fmt(t.series) : "?") + " × " + (t.repeticiones ? fmt(t.repeticiones) : "?"));
      if (u) meta.push("último: " + textoSerie(mejorSerie(u)) + " (" + corta(u.fecha) + ")");
      var mover = function (dir) {
        return function () {
          var l = r.tarjetas.slice(), j = i + dir;
          l.splice(j, 0, l.splice(i, 1)[0]);
          var cambia = l.map(function (x, k) { return [x, k + 1]; }).filter(function (p) { return Number(p[0].orden) !== p[1]; });
          var boton = this; boton.disabled = true;
          cambia.reduce(function (p, c) { return p.then(function () { return actualizarTarjeta(c[0], { orden: c[1] }); }); }, Promise.resolve())
            .then(function () { pintar(); }, function (e) { boton.disabled = false; manejarError(e); });
        };
      };
      raiz.appendChild(h("div", { class: "tarjeta-ej" },
        h("div", { class: "tar-cab" }, h("b", { text: t.ejercicio }), vacio(t.peso_kg) ? null : h("span", { class: "tar-kg", text: fmt(t.peso_kg, 1) + " kg" })),
        meta.length ? h("div", { class: "tar-meta", text: meta.join(" · ") }) : null,
        fotosAB(info, t.ejercicio, "tar-fotos", "tar-foto"),
        info.principales.length || info.secundarios.length ? h("div", { class: "tar-trab" }, h("span", { class: "l", text: "Trabaja" }),
          info.principales.map(function (g) { return h("span", { class: "ch p", text: GRUPOS[g] }); }),
          info.secundarios.map(function (g) { return h("span", { class: "ch", text: GRUPOS[g] }); })) : null,
        t.nota ? h("div", { class: "tar-nota", text: "📝 " + t.nota }) : null,
        h("div", { class: "tar-pie" },
          h("button", { type: "button", class: "mini-nav", "aria-label": "Subir " + t.ejercicio, disabled: i === 0, onclick: mover(-1) }, "↑"),
          h("button", { type: "button", class: "mini-nav", "aria-label": "Bajar " + t.ejercicio, disabled: i === r.tarjetas.length - 1, onclick: mover(1) }, "↓"),
          h("button", { type: "button", class: "ej-editar ej-como", text: "📖 Ejercicio", "aria-label": "Ver el ejercicio " + t.ejercicio, onclick: function () { abrirEjercicio(t.ejercicio); } }),
          h("button", { type: "button", class: "ej-editar", text: "✎ Editar", "aria-label": "Editar la tarjeta de " + t.ejercicio, onclick: function () { abrirTarjetaRutina(t); } }))));
    });
    raiz.appendChild(h("button", { type: "button", class: "btn sec agregar-ej", text: "＋ Agregar ejercicio", onclick: function () { abrirAgregarARutina(r.nombre); } }));
    raiz.appendChild(navegacion("entreno"));
  }

  // ---------- Pasar una rutina al reloj Garmin ----------
  // Garmin no deja enviar la rutina a su app desde fuera: se crea una vez en Garmin Connect y de ahí pasa al reloj.
  // Cada ejercicio se traduce al ejercicio equivalente del catálogo oficial de Garmin (FIT SDK).
  var CATEGORIA_GARMIN = { benchPress: "Press de banca", calfRaise: "Pantorrillas", core: "Core", crunch: "Abdominales (crunch)", curl: "Curl de bíceps", deadlift: "Peso muerto", flye: "Aperturas", hipRaise: "Elevación de cadera",
    hipStability: "Estabilidad de cadera", hyperextension: "Hiperextensión", lateralRaise: "Elevación lateral", legCurl: "Curl femoral", legRaise: "Elevación de piernas", lunge: "Zancada", plank: "Plancha", pullUp: "Dominadas y jalones",
    pushUp: "Flexiones", row: "Remo", shoulderPress: "Press de hombro", shrug: "Encogimientos", sitUp: "Abdominales (sit-up)", squat: "Sentadilla y prensa", tricepsExtension: "Tríceps" };
  /** Nombre como lo escribe Garmin Connect (con guiones: Pull-down, Pull-up, Ez Bar → EZ Bar). */
  function nombreGarmin(clave) {
    return clave.replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, function (c) { return c.toUpperCase(); })
      .replace(/Pulldown/g, "Pull-down").replace(/Pull Up/g, "Pull-up").replace(/Pressdown/g, "Press-down").replace(/\bEz Bar\b/g, "EZ Bar").replace(/\bV Grip\b/g, "V-grip");
  }
  function equivalenteGarmin(nombre) {
    var d = datosEjercicio(nombre), g = d.garmin;
    if (!g) return { cat: null, ej: null, calidad: "ninguno", sinFicha: true };
    return { cat: g[0], ej: g[1], calidad: g[2], catEs: CATEGORIA_GARMIN[g[0]] || nombreGarmin(g[0]), ejEn: nombreGarmin(g[1]), catEn: nombreGarmin(g[0]) };
  }
  var CALIDAD_GARMIN = { ok: ["✓ Igual en Garmin", "ok"], cerca: ["≈ Parecido en Garmin", "cerca"], ninguno: ["⚠ Sin equivalente exacto", "ninguno"] };
  /** Series, repeticiones y peso de una tarjeta; lo que falte, de la última vez que lo hiciste. */
  function objetivoTarjeta(t) {
    var u = ultimoRegistro(t.ejercicio), mejor = u ? mejorSerie(u) : null;
    return { series: Number(t.series) || (u ? u.series.length : 0) || null, reps: Number(t.repeticiones) || (mejor ? Number(mejor.repeticiones) : 0) || null,
      kg: !vacio(t.peso_kg) ? Number(t.peso_kg) : mejor && Number(mejor.peso_kg) ? Number(mejor.peso_kg) : null };
  }
  function textoObjetivo(o) { return (o.series || "?") + " series × " + (o.reps || "?") + " reps" + (o.kg ? " · " + fmt(o.kg, 1) + " kg" : ""); }
  function textoGarmin(r) {
    var lineas = ["Rutina: " + r.nombre, ""];
    r.tarjetas.forEach(function (t, i) {
      var q = equivalenteGarmin(t.ejercicio), o = objetivoTarjeta(t), serie = (o.series || "?") + " × " + (o.reps || "?") + (o.kg ? " · " + fmt(o.kg, 1) + " kg" : "");
      lineas.push((i + 1) + ". " + t.ejercicio + " → " + (q.cat ? q.catEn + " › " + q.ejEn + (q.calidad === "cerca" ? " (parecido)" : q.calidad === "ninguno" ? " (el más cercano; Garmin no tiene este)" : "") : "elige el más parecido") + " · " + serie);
    });
    return lineas.join("\n");
  }
  /** Archivo .fit de la rutina, listo para copiar al reloj. */
  function archivoGarmin(r) {
    var ejercicios = r.tarjetas.map(function (t) {
      var q = equivalenteGarmin(t.ejercicio), o = objetivoTarjeta(t);
      return { nombre: t.ejercicio, categoria: q.cat, ejercicio: q.ej, series: o.series || 3, reps: o.reps || 10, kg: o.kg || 0 };
    });
    var bytes = window.GarminFit.construir({ nombre: r.nombre, ejercicios: ejercicios }, { descansoSerie: DESCANSO_SERIE, descansoEjercicio: DESCANSO_EJERCICIO });
    var nombre = sinTildes(r.nombre).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "rutina";
    return new File([bytes], nombre + ".fit", { type: "application/octet-stream" });
  }
  function descargarArchivo(archivo) {
    var url = URL.createObjectURL(archivo), a = h("a", { href: url, download: archivo.name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }
  function abrirGarmin(r) {
    var items = r.tarjetas.map(function (t) { return { t: t, q: equivalenteGarmin(t.ejercicio) }; });
    var cuenta = { ok: 0, cerca: 0, ninguno: 0 };
    items.forEach(function (x) { cuenta[x.q.calidad]++; });
    var copiar = h("button", { class: "btn lima", type: "button", text: "Copiar la lista", onclick: function () { copiarTexto(textoGarmin(r), h("textarea", { hidden: true }), "Lista copiada. Pégala en las notas de tu celular."); } });
    abrirHoja("⌚ " + r.nombre + " en Garmin", h("div", { class: "garmin" },
      h("p", { class: "ayuda", text: "Garmin no deja mandar la rutina desde otra app. Se crea una sola vez en Garmin Connect y de ahí se sincroniza con tu Fénix 7. Cada ejercicio de abajo ya está traducido al del catálogo oficial de Garmin." }),
      h("div", { class: "garmin-res" },
        h("span", { class: "g-ok", text: "✓ " + cuenta.ok + " igual" + (cuenta.ok === 1 ? "" : "es") }),
        h("span", { class: "g-cerca", text: "≈ " + cuenta.cerca + " parecido" + (cuenta.cerca === 1 ? "" : "s") }),
        cuenta.ninguno ? h("span", { class: "g-ninguno", text: "⚠ " + cuenta.ninguno + " sin equivalente" }) : null),
      h("div", { class: "lista" }, items.map(function (x, i) {
        var t = x.t, q = x.q, cal = CALIDAD_GARMIN[q.calidad];
        return h("div", { class: "g-fila" },
          h("span", { class: "g-n", text: String(i + 1) }),
          h("div", { class: "g-t" },
            h("b", { text: t.ejercicio }),
            q.cat ? h("span", { class: "g-gar" }, "En Garmin: ", h("b", { text: q.catEn + " › " + q.ejEn })) : h("span", { class: "g-gar", text: "No lo reconocí: en Garmin elige el más parecido." }),
            q.cat ? h("small", { text: "Categoría en español: " + q.catEs }) : null,
            h("span", { class: "g-meta num", text: textoObjetivo(objetivoTarjeta(t)) + " · descanso 1:30" }),
            h("span", { class: "g-cal g-" + cal[1], text: cal[0] + (q.calidad === "cerca" ? " (otra máquina o variante)" : q.calidad === "ninguno" ? ": usa el más cercano y apunta el peso aquí" : "") })));
      })),
      copiar,
      h("details", { class: "avanzado", open: true }, h("summary", { text: "⚡ Lo más rápido: archivo para el reloj" }),
        h("div", { style: "display:flex;flex-direction:column;gap:8px;margin-top:8px" },
          h("p", { class: "ayuda", text: "Trae todos los ejercicios de esta rutina ya elegidos, con series, repeticiones, peso y descanso. Lo copias al reloj con el cable y no hay que buscar ni crear nada en Garmin Connect." }),
          h("button", { class: "btn lima", type: "button", id: "g-descargar", text: "⬇ Descargar el archivo del reloj (.fit)", onclick: function () {
            try { descargarArchivo(archivoGarmin(r)); aviso("Archivo descargado"); } catch (e) { aviso("No pude crear el archivo: " + e.message, true); }
          } }),
          navigator.canShare ? h("button", { class: "btn sec", type: "button", text: "📤 Compartir (correo, Drive, AirDrop…)", onclick: function () {
            var f = archivoGarmin(r);
            if (navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: r.nombre }).catch(function () { /* cancelado */ });
            else { descargarArchivo(f); aviso("Tu celular no permite compartirlo: se descargó"); }
          } }) : null,
          h("ol", { class: "pasos" },
            h("li", { text: "Llévalo a tu computador: abre esta app en el navegador de la computadora y descárgalo ahí, o compártelo desde el celular a tu correo, Drive o WhatsApp y descárgalo en la computadora." }),
            h("li", { text: "Conecta el Fénix 7 a la computadora con su cable USB. Aparece como una unidad (como una memoria USB)." }),
            h("li", { text: "Abre la unidad → carpeta GARMIN → carpeta NewFiles, y pega el archivo .fit." }),
            h("li", { text: "Expulsa el reloj y desconéctalo. En el reloj, entra a Entrenamientos y busca «" + r.nombre + "»." }),
            h("li", { text: "Pruébalo con una sola rutina. Si no aparece o algún ejercicio sale raro, dime y lo ajusto." })))),
      h("details", { class: "avanzado" }, h("summary", { text: "Alternativa: crearla a mano en Garmin Connect" }),
        h("ol", { class: "pasos" },
          h("li", { text: "Abre Garmin Connect en el celular → Más (☰) → Entrenamiento y planificación → Entrenamientos." }),
          h("li", { text: "Crear un entrenamiento → elige Fuerza y ponle el nombre «" + r.nombre + "»." }),
          h("li", { text: "Agrega cada ejercicio en el orden de la lista: busca la categoría y el ejercicio en inglés tal como aparece arriba." }),
          h("li", { text: "En cada uno pon las series y las repeticiones. El peso es opcional: puedes dejarlo para anotarlo en el reloj." }),
          h("li", { text: "Guarda y toca «Enviar al dispositivo» (Fénix 7). Sincroniza el reloj y la encuentras en Entrenamientos → Fuerza." }),
          h("li", { text: "Al terminar en el reloj, vuelves aquí y registras lo que levantaste en ▶ Empezar entreno." })),
        h("p", { class: "ayuda", text: "Los nombres de los menús de Garmin pueden cambiar un poco según tu versión de la app." }))));
  }
  /** Hoja para elegir un ejercicio: los tuyos y, al buscar, los de la biblioteca; o crear uno nuevo. */
  function elegirEjercicio(titulo, alElegir, excluir) {
    var buscar = h("input", { id: "f-buscar-elegir", type: "search", placeholder: "Busca entre tus ejercicios…", "aria-label": "Buscar ejercicio", autocomplete: "off" });
    var lista = h("div", { class: "elegir-lista", role: "listbox", "aria-label": "Ejercicios" });
    var mios = misEjercicios(), fuera = (excluir || []).map(claveEj);
    function mostrar() {
      lista.textContent = "";
      var palabras = sinTildes(buscar.value).split(/[^a-z0-9ñ]+/).filter(Boolean);
      var pasa = function (t) { t = sinTildes(t); return palabras.every(function (w) { return t.indexOf(w) >= 0; }); };
      var items = mios.filter(function (e) { return fuera.indexOf(claveEj(e.nombre)) < 0 && pasa(e.nombre); }).map(function (e) { return { n: e.nombre }; });
      if (palabras.length) {
        var usadas = mios.map(function (e) { return fichaDe(e.nombre); });
        BIBLIOTECA.forEach(function (fi) { if (!fi.oculto && usadas.indexOf(fi) < 0 && pasa(fi.n + " " + fi.t)) items.push({ n: fi.n, fi: fi, biblio: true }); });
      }
      items.slice(0, 40).forEach(function (x) {
        var d = datosEjercicio(x.n, x.fi);
        lista.appendChild(h("button", { type: "button", class: "elegir-op", role: "option", "aria-label": x.n, onclick: function () { cerrarHoja(); alElegir(x.n); } },
          miniEjercicio({ foto: d.foto, propias: d.propias }, "elegir-foto"),
          h("span", { class: "bib-t" }, h("b", { text: x.n }), h("span", { class: "ej-m", text: nombresGrupos(d.p) || "Sin músculos" }), x.biblio ? h("span", { class: "nota", text: "De la biblioteca" }) : null),
          h("span", { class: "elegir-ok", "aria-hidden": "true", text: "›" })));
      });
      if (!items.length) lista.appendChild(h("p", { class: "ayuda", text: palabras.length ? "No está. Créalo con «＋ Crear ejercicio»." : "Escribe para buscar, o crea uno." }));
    }
    buscar.addEventListener("input", mostrar);
    abrirHoja(titulo, h("div", { class: "editor-tar" }, buscar, lista,
      h("button", { type: "button", class: "chip-subir crear-ej", text: "＋ Crear ejercicio", onclick: function () { abrirEditarEjercicio(null, function (n) { alElegir(n); }); } })));
    mostrar();
  }
  function camposPeso(valores) {
    var peso = h("input", { id: "f-tar-peso", type: "number", inputmode: "decimal", min: 0, max: 1000, step: "0.5", value: vacio(valores.peso_kg) ? "" : valores.peso_kg, "aria-label": "Peso en kg" });
    var series = h("input", { id: "f-tar-series", type: "number", inputmode: "numeric", min: 1, max: 50, value: valores.series || "", "aria-label": "Series" });
    var reps = h("input", { id: "f-tar-reps", type: "number", inputmode: "numeric", min: 1, max: 1000, value: valores.repeticiones || "", "aria-label": "Repeticiones" });
    var caja = h("div", { class: "fila3" },
      h("div", {}, h("label", { for: "f-tar-peso", text: "Peso (kg)" }), peso),
      h("div", {}, h("label", { for: "f-tar-series", text: "Series" }), series),
      h("div", {}, h("label", { for: "f-tar-reps", text: "Reps" }), reps));
    return {
      caja: caja, peso: peso, series: series, reps: reps,
      llenar: function (u) { peso.value = u && u.max ? u.max : ""; series.value = u ? u.series.length : ""; reps.value = u ? mejorSerie(u).repeticiones || "" : ""; },
      leer: function () {
        var num = function (el, min, max, ent, txt) {
          if (el.value === "") return null;
          var v = Number(String(el.value).replace(",", "."));
          if (!isFinite(v) || v < min || v > max || (ent && Math.floor(v) !== v)) throw new Error(txt);
          return v;
        };
        return { peso_kg: num(peso, 0, 1000, false, "Revisa el peso (0 a 1000 kg)."), series: num(series, 1, 50, true, "Revisa las series (1 a 50)."), repeticiones: num(reps, 1, 1000, true, "Revisa las repeticiones.") };
      }
    };
  }

  /** Agregar a la rutina: elegir un ejercicio ya listo y ponerle peso, series y repeticiones. */
  function abrirAgregarARutina(rutina, preelegido) {
    var buscar = h("input", { id: "f-buscar-rutina", type: "search", placeholder: "Busca entre tus ejercicios…", "aria-label": "Buscar ejercicio", autocomplete: "off" });
    var lista = h("div", { class: "elegir-lista", role: "listbox", "aria-label": "Ejercicios" });
    var c = camposPeso({});
    var nota = h("input", { id: "f-tar-nota", type: "text", maxlength: 200, placeholder: "Nota para esta rutina (opcional)", "aria-label": "Nota" });
    var elegido = null, elegidoFicha = null;
    var boton = h("button", { class: "btn lima", type: "button", text: "Elige un ejercicio", disabled: true });
    var mios = misEjercicios(), yaEn = rutinaPorNombre(rutina).tarjetas.map(function (t) { return claveEj(t.ejercicio); });
    function elegir(n, fi) {
      elegido = n; elegidoFicha = fi || null;
      c.llenar(ultimoRegistro(n));
      boton.disabled = false; boton.textContent = "Agregar «" + n + "»";
      mostrar();
    }
    function mostrar() {
      lista.textContent = "";
      var palabras = sinTildes(buscar.value).split(/[^a-z0-9ñ]+/).filter(Boolean);
      var pasa = function (texto) { texto = sinTildes(texto); return palabras.every(function (w) { return texto.indexOf(w) >= 0; }); };
      var items = mios.filter(function (e) { var d = datosEjercicio(e.nombre); return pasa(e.nombre + " " + nombresGrupos(d.p.concat(d.s))); }).map(function (e) { return { n: e.nombre }; });
      // Al buscar, también los de la biblioteca que aún no son tuyos
      if (palabras.length) {
        var usadas = mios.map(function (e) { return fichaDe(e.nombre); });
        BIBLIOTECA.forEach(function (fi) { if (!fi.oculto && usadas.indexOf(fi) < 0 && pasa(fi.n + " " + fi.t + " " + nombresGrupos(fi.p))) items.push({ n: fi.n, fi: fi, biblio: true }); });
      }
      if (elegido && !items.some(function (x) { return claveEj(x.n) === claveEj(elegido); })) items.unshift({ n: elegido, fi: elegidoFicha });
      items.slice(0, 40).forEach(function (x) {
        var d = datosEjercicio(x.n, x.fi), sel = elegido && claveEj(x.n) === claveEj(elegido);
        lista.appendChild(h("button", { type: "button", class: "elegir-op" + (sel ? " sel" : ""), role: "option", "aria-selected": sel ? "true" : "false", "aria-label": x.n, onclick: function () { elegir(x.n, x.fi); } },
          miniEjercicio({ foto: d.foto, propias: d.propias }, "elegir-foto"),
          h("span", { class: "bib-t" }, h("b", { text: x.n }), h("span", { class: "ej-m", text: nombresGrupos(d.p) || "Sin músculos" }),
            yaEn.indexOf(claveEj(x.n)) >= 0 ? h("span", { class: "nota", text: "Ya está en esta rutina" }) : x.biblio ? h("span", { class: "nota", text: "De la biblioteca" }) : null),
          h("span", { class: "elegir-ok", "aria-hidden": "true", text: sel ? "✓" : "" })));
      });
      if (!items.length) lista.appendChild(h("p", { class: "ayuda", text: palabras.length ? "No está. Créalo con «＋ Crear ejercicio»." : "Aún no tienes ejercicios: busca en la biblioteca escribiendo arriba, o crea uno." }));
    }
    buscar.addEventListener("input", mostrar);
    boton.addEventListener("click", function () {
      var datos;
      try { datos = c.leer(); } catch (e) { return aviso(e.message, true); }
      var orden = rutinaPorNombre(rutina).tarjetas.reduce(function (m, x) { return Math.max(m, Number(x.orden) || 0); }, 0) + 1;
      var fila = Object.assign(datos, { rutina: rutina, orden: orden, ejercicio: elegido, nota: nota.value.trim() || null });
      boton.disabled = true; boton.textContent = "Guardando…";
      api("agregar", { tabla: "rutinas", fila: fila }).then(function (r) {
        estado.tablas.rutinas.push(Object.assign({ id: r.id, creado_en: new Date().toISOString() }, fila)); guardarCache();
        cerrarHoja(); aviso("Ejercicio agregado a «" + rutina + "»"); pintar();
      }, function (e) { boton.disabled = false; boton.textContent = "Agregar «" + elegido + "»"; manejarError(e); });
    });
    abrirHoja("Agregar a «" + rutina + "»", h("div", { class: "editor-tar" },
      buscar, lista,
      h("button", { type: "button", class: "chip-subir crear-ej", text: "＋ Crear ejercicio", onclick: function () { abrirEditarEjercicio(null, function (n) { abrirAgregarARutina(rutina, n); }); } }),
      c.caja, h("label", { for: "f-tar-nota", text: "Nota (opcional)" }), nota, boton));
    if (preelegido) elegir(preelegido); else mostrar();
  }

  /** Peso, series, repeticiones y nota de un ejercicio dentro de la rutina. */
  function abrirTarjetaRutina(t) {
    var c = camposPeso(t), info = infoEjercicio(t.ejercicio);
    var nota = h("input", { id: "f-tar-nota", type: "text", maxlength: 200, value: t.nota || "", placeholder: "Nota para esta rutina (opcional)", "aria-label": "Nota" });
    var guardar = h("button", { class: "btn lima", type: "button", text: "Guardar", onclick: function () {
      var datos;
      try { datos = c.leer(); } catch (e) { return aviso(e.message, true); }
      datos.nota = nota.value.trim() || null;
      guardar.disabled = true;
      actualizarTarjeta(t, datos).then(function () { cerrarHoja(); aviso("Guardado"); pintar(); }, function (e) { guardar.disabled = false; manejarError(e); });
    } });
    var quitar = h("button", { class: "btn peligro", type: "button", text: "Quitar de la rutina", onclick: function () {
      if (!confirm("¿Quitar «" + t.ejercicio + "» de la rutina? El ejercicio y tus series registradas no se borran.")) return;
      quitar.disabled = true;
      api("borrar", { tabla: "rutinas", id: t.id }).then(function () {
        estado.tablas.rutinas = estado.tablas.rutinas.filter(function (x) { return x !== t; }); guardarCache();
        cerrarHoja(); aviso("Ejercicio quitado"); pintar();
        return borrarFotosSueltas([t.foto_a, t.foto_b]);
      }, function (e) { quitar.disabled = false; manejarError(e); });
    } });
    abrirHoja(t.ejercicio, h("div", { class: "editor-tar" },
      h("div", { class: "elegir-op sel" }, miniEjercicio(info, "elegir-foto"), h("span", { class: "bib-t" }, h("b", { text: t.ejercicio }), h("span", { class: "ej-m", text: nombresGrupos(info.principales) }))),
      c.caja, h("label", { for: "f-tar-nota", text: "Nota (opcional)" }), nota, guardar,
      h("button", { class: "btn sec", type: "button", text: "↔ Cambiar por otro ejercicio", onclick: function () {
        elegirEjercicio("Cambiar «" + t.ejercicio + "» por…", function (n) {
          actualizarTarjeta(t, { ejercicio: n }).then(function () { aviso("Cambiado por «" + n + "»"); pintar(); }, manejarError);
        }, [t.ejercicio]);
      } }),
      h("button", { class: "btn sec", type: "button", text: "✎ Editar el ejercicio (fotos, músculos…)", onclick: function () { abrirEditarEjercicio(t.ejercicio); } }),
      quitar));
  }

  function abrirEditarRutina(r) {
    var campo = h("input", { id: "f-rutina-renombrar", type: "text", maxlength: 80, value: r.nombre, "aria-label": "Nombre de la rutina" });
    var btn = h("button", { class: "btn lima", type: "button", text: "Guardar el nombre", onclick: function () {
      var n = campo.value.trim();
      if (!n || n === r.nombre) return aviso("Escribe un nombre distinto.", true);
      if (sinTildes(n) !== sinTildes(r.nombre) && rutinaPorNombre(n).tarjetas.length) return aviso("Ya tienes una rutina con ese nombre.", true);
      btn.disabled = true; btn.textContent = "Guardando…";
      r.tarjetas.reduce(function (p, t) { return p.then(function () { return actualizarTarjeta(t, { rutina: n }); }); }, Promise.resolve())
        .then(function () {
          var o = ordenRutinas(), k = o.indexOf(sinTildes(r.nombre)); if (k >= 0) { o[k] = sinTildes(n); guardarLocal("orden_rutinas", JSON.stringify(o)); }
          estado.rutinaActual = n; cerrarHoja(); aviso("Nombre cambiado"); pintar(); }, function (e) { btn.disabled = false; btn.textContent = "Guardar el nombre"; manejarError(e); });
    } });
    var borrarBtn = h("button", { class: "btn peligro", type: "button", text: "Borrar la rutina (" + plural(r.tarjetas.length, "ejercicio", "ejercicios") + ")", onclick: function () {
      if (!confirm("¿Borrar la rutina «" + r.nombre + "»? Tus ejercicios y tus series registradas no se borran.")) return;
      borrarBtn.disabled = true; borrarBtn.textContent = "Borrando…";
      r.tarjetas.reduce(function (p, t) {
        return p.then(function () {
          return api("borrar", { tabla: "rutinas", id: t.id }).then(function () {
            estado.tablas.rutinas = estado.tablas.rutinas.filter(function (x) { return x !== t; });
            return borrarFotosSueltas([t.foto_a, t.foto_b]);
          });
        });
      }, Promise.resolve()).then(function () { guardarCache(); cerrarHoja(); aviso("Rutina borrada"); estado.pantalla = "entreno"; estado.tabEntreno = "rutinas"; pintar(); },
        function (e) { guardarCache(); borrarBtn.disabled = false; manejarError(e); });
    } });
    abrirHoja("Editar rutina", h("div", { style: "display:flex;flex-direction:column;gap:6px" },
      h("label", { for: "f-rutina-renombrar", text: "Nombre de la rutina" }), campo, btn,
      h("p", { class: "ayuda", text: "Para cambiar el orden de los ejercicios, usa las flechas ↑ ↓ de cada tarjeta." }),
      borrarBtn));
  }

  // ---------- Modo entreno: registrar cada serie desde la app ----------
  // Cada serie se guarda en la hoja al tocar ✓ (así no se pierde nada si se cierra la app).
  // El entreno en curso vive en el teléfono («sesion_entreno») para seguir donde ibas si la app se recarga.
  var DESCANSO_SERIE = 90, DESCANSO_EJERCICIO = 120;
  var relojSesion = null, relojDescanso = null, bloqueoPantalla = null;
  function guardarSesion() { if (estado.sesion) guardarLocal("sesion_entreno", JSON.stringify(estado.sesion)); else borrarLocal("sesion_entreno"); }
  function leerSesion() {
    try { var s = JSON.parse(leerLocal("sesion_entreno") || "null"); if (s && s.rutina && Array.isArray(s.ejercicios)) return s; } catch (e) { /* dañada: se ignora */ }
    return null;
  }
  function mantenerPantalla(si) {
    try {
      if (si && navigator.wakeLock && !bloqueoPantalla) navigator.wakeLock.request("screen").then(function (b) { bloqueoPantalla = b; b.addEventListener("release", function () { bloqueoPantalla = null; }); }, function () { /* no disponible */ });
      if (!si && bloqueoPantalla) { bloqueoPantalla.release(); bloqueoPantalla = null; }
    } catch (e) { /* no disponible */ }
  }
  function recordAntes(nombre) {
    var e = historialEjercicios()[claveEj(nombre)];
    return e && e.sesiones.length ? Math.max.apply(null, e.sesiones.map(function (x) { return x.max; })) : 0;
  }
  /** Prepara un entreno a partir de la rutina: cada ejercicio con sus series y los valores de la rutina o de la última vez. */
  function empezarEntreno(r) {
    var ejercicios = r.tarjetas.map(function (t) {
      var u = ultimoRegistro(t.ejercicio), mejor = u ? mejorSerie(u) : null;
      var n = Number(t.series) || (u ? u.series.length : 0) || 3;
      var filas = [];
      for (var i = 0; i < n; i++) {
        var antes = u ? u.series.filter(function (s) { return Number(s.numero_serie) === i + 1; })[0] : null;
        filas.push({
          kg: !vacio(t.peso_kg) ? Number(t.peso_kg) : antes ? Number(antes.peso_kg) || 0 : mejor ? Number(mejor.peso_kg) || 0 : 0,
          reps: Number(t.repeticiones) || (antes ? Number(antes.repeticiones) : 0) || (mejor ? Number(mejor.repeticiones) : 0) || 10,
          estado: ""
        });
      }
      return { nombre: t.ejercicio, meta: { series: Number(t.series) || null, reps: Number(t.repeticiones) || null, kg: vacio(t.peso_kg) ? null : Number(t.peso_kg) }, record: recordAntes(t.ejercicio),
        ultima: u ? textoSerie(mejorSerie(u)) + " · " + corta(u.fecha) : null, filas: filas };
    });
    estado.sesion = { rutina: r.nombre, fecha: iso(new Date()), t0: Date.now(), actual: 0, ejercicios: ejercicios, records: 0 };
    guardarSesion();
    precargarFotosSesion(estado.sesion);
    estado.pantalla = "sesion"; pintar(); window.scrollTo(0, 0);
  }
  /** Trae de una vez las fotos de todos los ejercicios (para no esperar en el gym aunque haya poca señal). */
  var fotosPrecargadas = null;
  function precargarFotosSesion(s) {
    var clave = s.rutina + "|" + s.t0;
    if (fotosPrecargadas === clave) return;
    fotosPrecargadas = clave;
    var ids = [];
    s.ejercicios.forEach(function (e) { (infoEjercicio(e.nombre).propias || []).forEach(function (id) { ids.push(id); }); });
    if (ids.length) traerFotos(ids).catch(function () { fotosPrecargadas = null; });
  }
  function seriesHechas(s) { return s.ejercicios.reduce(function (a, e) { return a + e.filas.filter(function (f) { return f.estado === "ok"; }).length; }, 0); }
  function seriesTotal(s) { return s.ejercicios.reduce(function (a, e) { return a + e.filas.length; }, 0); }
  function minutosSesion(s) { return Math.max(0, Math.round((Date.now() - s.t0) / 60000)); }
  function tiempoSesion(s) { var seg = Math.max(0, Math.floor((Date.now() - s.t0) / 1000)), h0 = Math.floor(seg / 3600), m = Math.floor(seg / 60) % 60; return (h0 ? h0 + ":" + dos(m) : dos(m)) + ":" + dos(seg % 60); }

  function pintarSesion() {
    var s = estado.sesion;
    if (!s) { estado.pantalla = "entreno"; return pintar(); }
    raiz.textContent = "";
    mantenerPantalla(true);
    precargarFotosSesion(s);
    var e = s.ejercicios[s.actual], info = infoEjercicio(e.nombre);
    var hechas = seriesHechas(s), total = seriesTotal(s), C = 119.4;
    var reloj = h("span", { class: "ses-reloj num", text: tiempoSesion(s) });
    clearInterval(relojSesion);
    relojSesion = setInterval(function () { if (estado.pantalla !== "sesion" || !estado.sesion) { clearInterval(relojSesion); return; } reloj.textContent = tiempoSesion(estado.sesion); }, 1000);
    raiz.appendChild(h("div", { class: "ses-barra" },
      h("button", { class: "ses-min", type: "button", "aria-label": "Volver a la rutina (el entreno sigue)", onclick: function () { estado.pantalla = "rutina"; estado.rutinaActual = s.rutina; pintar(); } }, icono("atras", 18)),
      h("div", { class: "ses-tiempo" }, reloj, h("small", { text: s.rutina })),
      svg('<circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/><circle cx="23" cy="23" r="19" fill="none" stroke="#B8F05A" stroke-width="5" stroke-linecap="round" transform="rotate(-90 23 23)" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - hechas / Math.max(1, total))).toFixed(1) + '"/><text x="23" y="27" text-anchor="middle" fill="#fff" stroke="none" font-size="11" font-weight="800">' + hechas + "/" + total + "</text>", 46, 46),
      h("button", { class: "ses-terminar", type: "button", text: "Terminar", onclick: terminarEntreno })));
    // Fichas de los ejercicios con sus puntos de avance
    var fichas = h("div", { class: "ses-fichas", role: "tablist", "aria-label": "Ejercicios de la rutina" }, s.ejercicios.map(function (x, i) {
      return h("button", { type: "button", role: "tab", class: i === s.actual ? "on" : "", "aria-selected": i === s.actual ? "true" : "false", onclick: function () { s.actual = i; guardarSesion(); pintar(); } },
        x.nombre, h("span", { class: "puntos", "aria-hidden": "true" }, x.filas.map(function (f) { return h("i", { class: f.estado === "ok" ? "ok" : "" }); })));
    }));
    raiz.appendChild(fichas);
    var pistas = [];
    if (e.meta.series || e.meta.kg !== null) pistas.push("🎯 Meta " + (e.meta.series ? e.meta.series + " × " + (e.meta.reps || "?") : "") + (e.meta.kg !== null ? " · " + fmt(e.meta.kg, 1) + " kg" : ""));
    if (e.ultima) pistas.push("🕑 Última vez " + e.ultima);
    if (e.record) pistas.push("🏆 Récord " + fmt(e.record, 1) + " kg");
    var actual = e.filas.findIndex(function (f) { return f.estado !== "ok"; });
    var filas = e.filas.map(function (f, i) { return filaSerie(s, e, f, i, i === actual); });
    raiz.appendChild(h("div", { class: "card ses-ej" },
      fotosAB(info, e.nombre, "tar-fotos ses-fotos", "tar-foto"),
      h("div", { class: "ses-ej-cab" }, h("h2", { text: e.nombre }), h("button", { type: "button", class: "ej-editar", text: "📖 Ficha", onclick: function () { abrirEjercicio(e.nombre); } })),
      pistas.length ? h("div", { class: "ses-pistas" }, pistas.map(function (p) { return h("span", { text: p }); })) : null,
      h("div", { class: "ses-series" }, filas),
      h("div", { class: "ses-acciones" },
        h("button", { type: "button", class: "ses-mas", text: "＋ Agregar serie", onclick: function () {
          var ult = e.filas[e.filas.length - 1] || { kg: 0, reps: 10 };
          e.filas.push({ kg: ult.kg, reps: ult.reps, estado: "" }); guardarSesion(); pintar();
        } }),
        h("button", { type: "button", class: "ses-mas", text: "− Quitar serie", disabled: !e.filas.some(function (f) { return f.estado !== "ok" && f.estado !== "guardando"; }), onclick: function () {
          for (var k = e.filas.length - 1; k >= 0; k--) if (e.filas[k].estado !== "ok" && e.filas[k].estado !== "guardando") { e.filas.splice(k, 1); break; }
          guardarSesion(); pintar();
        } })),
      h("button", { type: "button", class: "btn sec", text: "✎ Cambiar o quitar este ejercicio", onclick: function () { abrirEditarEjercicioSesion(s, e); } }),
      h("button", { type: "button", class: "btn sec", text: "💾 Guardar en la rutina", onclick: function () { guardarEnRutina(s, e); } })));
    raiz.appendChild(h("button", { type: "button", class: "btn sec", text: "＋ Agregar otro ejercicio al entreno", onclick: function () {
      elegirEjercicio("Agregar al entreno", function (n) {
        s.ejercicios.push(ejercicioDeSesion(n)); s.actual = s.ejercicios.length - 1; guardarSesion(); precargarFotosSesion(s); pintar(); window.scrollTo(0, 0);
      }, s.ejercicios.map(function (x) { return x.nombre; }));
    } }));
    if (s.actual < s.ejercicios.length - 1) raiz.appendChild(h("button", { type: "button", class: "btn sec", text: "Siguiente: " + s.ejercicios[s.actual + 1].nombre + " ›", onclick: function () { s.actual++; guardarSesion(); pintar(); window.scrollTo(0, 0); } }));
    var on = fichas.querySelector(".on"); if (on) requestAnimationFrame(function () { fichas.scrollLeft = on.offsetLeft - 16; });
  }

  /** Peso o repeticiones: se pueden digitar (toca el número) o subir y bajar con − / +. */
  /** Pasa a la rutina lo que ajustaste en el entreno: series, y peso y repeticiones de tu serie más pesada. */
  function guardarEnRutina(s, e) {
    var r = rutinaPorNombre(s.rutina);
    if (!r.tarjetas.length) return aviso("La rutina «" + s.rutina + "» ya no existe. Créala de nuevo en Entreno → Rutinas.", true);
    if (!e.filas.length) return aviso("Este ejercicio no tiene series.", true);
    var ref = e.filas.reduce(function (m, f) { return f.kg >= m.kg ? f : m; }, e.filas[0]);
    var datos = { series: e.filas.length, repeticiones: ref.reps, peso_kg: ref.kg || null };
    var t = r.tarjetas.filter(function (x) { return claveEj(x.ejercicio) === claveEj(e.nombre); })[0];
    var resumen = datos.series + " × " + datos.repeticiones + (datos.peso_kg ? " · " + fmt(datos.peso_kg, 1) + " kg" : "");
    var pregunta = t
      ? "¿Guardar " + resumen + " en «" + e.nombre + "» de la rutina «" + r.nombre + "»? Reemplaza " + textoObjetivo({ series: Number(t.series) || null, reps: Number(t.repeticiones) || null, kg: vacio(t.peso_kg) ? null : Number(t.peso_kg) }) + "."
      : "«" + e.nombre + "» no está en la rutina «" + r.nombre + "». ¿Agregarlo con " + resumen + "?";
    if (!confirm(pregunta)) return;
    var trabajo = t ? actualizarTarjeta(t, datos) : api("agregar", { tabla: "rutinas", fila: Object.assign({ rutina: r.nombre, orden: r.tarjetas.reduce(function (m, x) { return Math.max(m, Number(x.orden) || 0); }, 0) + 1, ejercicio: e.nombre }, datos) })
      .then(function (res) { estado.tablas.rutinas.push(Object.assign({ id: res.id, creado_en: new Date().toISOString(), rutina: r.nombre, ejercicio: e.nombre }, datos)); guardarCache(); });
    trabajo.then(function () {
      e.meta = { series: datos.series, reps: datos.repeticiones, kg: datos.peso_kg }; guardarSesion();
      aviso(t ? "Rutina actualizada: " + e.nombre + " · " + resumen : "Agregado a la rutina: " + e.nombre + " · " + resumen);
      if (estado.pantalla === "sesion") pintar();
    }, manejarError);
  }
  /** Un ejercicio nuevo dentro del entreno (series, repeticiones y peso de la última vez). */
  function ejercicioDeSesion(nombre) {
    var o = objetivoTarjeta({ ejercicio: nombre }), u = ultimoRegistro(nombre), filas = [];
    for (var i = 0; i < (o.series || 3); i++) filas.push({ kg: o.kg || 0, reps: o.reps || 10, estado: "" });
    return { nombre: nombre, meta: { series: null, reps: null, kg: null }, record: recordAntes(nombre), ultima: u ? textoSerie(mejorSerie(u)) + " · " + corta(u.fecha) : null, filas: filas };
  }
  /** Cambiar este ejercicio por otro o quitarlo del entreno (la rutina no cambia). */
  function abrirEditarEjercicioSesion(s, e) {
    var hayGuardadas = e.filas.some(function (f) { return f.estado === "ok" || f.estado === "guardando"; });
    abrirHoja(e.nombre, h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Los cambios son solo de este entreno. Para cambiar la rutina, hazlo en Entreno → Rutinas." }),
      hayGuardadas ? h("p", { class: "ayuda ojo", text: "Ya guardaste series de este ejercicio. Para cambiarlo o quitarlo, borra primero esas series (toca su ✓ verde)." }) : null,
      h("button", { class: "btn lima", type: "button", text: "↔ Cambiar por otro ejercicio", disabled: hayGuardadas, onclick: function () {
        elegirEjercicio("Cambiar «" + e.nombre + "» por…", function (n) {
          var k = s.ejercicios.indexOf(e); if (k < 0) return;
          s.ejercicios[k] = ejercicioDeSesion(n); guardarSesion(); precargarFotosSesion(s); aviso("Cambiado por «" + n + "»"); pintar();
        }, s.ejercicios.map(function (x) { return x.nombre; }));
      } }),
      h("button", { class: "btn peligro", type: "button", text: "Quitar del entreno", disabled: hayGuardadas || s.ejercicios.length < 2, onclick: function () {
        if (!confirm("¿Quitar «" + e.nombre + "» de este entreno?")) return;
        var k = s.ejercicios.indexOf(e); if (k < 0) return;
        s.ejercicios.splice(k, 1); s.actual = Math.min(s.actual, s.ejercicios.length - 1); guardarSesion(); cerrarHoja(); pintar();
      } }),
      s.ejercicios.length < 2 ? h("p", { class: "ayuda", text: "Es el único ejercicio del entreno: para quitarlo, cancela el entreno." }) : null));
  }
  function paso(etiqueta, valor, unidad, menos, mas, apagado, alEscribir) {
    var campo = h("input", { type: "text", inputmode: unidad === "kg" ? "decimal" : "numeric", class: "ses-input num", value: valor, "aria-label": etiqueta, disabled: apagado, autocomplete: "off", enterkeyhint: "done" });
    campo.addEventListener("focus", function () { setTimeout(function () { try { campo.select(); } catch (e) { /* nada */ } }, 0); });
    campo.addEventListener("keydown", function (ev) { if (ev.key === "Enter") campo.blur(); });
    campo.addEventListener("change", function () {
      var v = Number(String(campo.value).replace(",", ".").trim());
      var ok = campo.value.trim() !== "" && isFinite(v) && v >= (unidad === "kg" ? 0 : 1) && v <= (unidad === "kg" ? 1000 : 1000) && (unidad === "kg" || Math.floor(v) === v);
      if (!ok) { campo.value = valor; return aviso(unidad === "kg" ? "Escribe un peso entre 0 y 1000 kg." : "Escribe las repeticiones (un número entero).", true); }
      valor = unidad === "kg" ? fmt(Math.round(v * 10) / 10, 1) : String(v);
      campo.value = valor; alEscribir(unidad === "kg" ? Math.round(v * 10) / 10 : v);
    });
    return h("div", { class: "ses-paso" },
      h("button", { type: "button", "aria-label": "Menos " + etiqueta, disabled: apagado, onclick: menos }, "−"),
      h("label", { class: "ses-valor" }, campo, h("small", { text: unidad })),
      h("button", { type: "button", "aria-label": "Más " + etiqueta, disabled: apagado, onclick: mas }, "+"));
  }
  function filaSerie(s, e, f, i, esActual) {
    var lista = f.estado === "ok", guardando = f.estado === "guardando", error = f.estado === "error";
    var cambia = function (campo, d) { return function () { f[campo] = campo === "kg" ? Math.max(0, Math.round((f.kg + d) * 10) / 10) : Math.max(1, f.reps + d); guardarSesion(); pintar(); }; };
    return h("div", { class: "ses-serie" + (lista ? " lista" : "") + (esActual ? " actual" : "") + (error ? " error" : "") },
      h("span", { class: "n", text: String(i + 1) }),
      paso("peso de la serie " + (i + 1), fmt(f.kg, 1), "kg", cambia("kg", -2.5), cambia("kg", 2.5), lista || guardando, function (v) { f.kg = v; guardarSesion(); }),
      paso("repeticiones de la serie " + (i + 1), String(f.reps), "reps", cambia("reps", -1), cambia("reps", 1), lista || guardando, function (v) { f.reps = v; guardarSesion(); }),
      h("button", { type: "button", class: "ses-ok", disabled: guardando, "aria-label": lista ? "Serie " + (i + 1) + " guardada (tocar para borrarla)" : error ? "Reintentar guardar la serie " + (i + 1) : "Guardar la serie " + (i + 1),
        onclick: function (ev) { if (lista) borrarSerie(s, e, f, i); else guardarSerie(s, e, f, i, ev); } },
        guardando ? h("span", { class: "girando-mini" }) : error ? "↻" : svg('<path d="M5 12.5 10 17l9-10" stroke-width="3"/>', 22)));
  }

  function guardarSerie(s, e, f, i, ev) {
    // Número siguiente al más alto del día (contar series repetía números si borrabas una y registrabas otra)
    var numero = estado.tablas.series_gym.filter(function (x) { return x.fecha === s.fecha && claveEj(x.ejercicio) === claveEj(e.nombre); })
      .reduce(function (m, x) { return Math.max(m, Number(x.numero_serie) || 0); }, 0) + 1;
    var fila = { fecha: s.fecha, rutina: s.rutina, ejercicio: e.nombre, numero_serie: numero, peso_kg: f.kg, repeticiones: f.reps };
    var record = f.kg > 0 && f.kg > e.record;
    f.estado = "guardando"; guardarSesion(); pintar();
    // El descanso empieza en seguida: no espera a Google
    var quedan = e.filas.filter(function (x) { return x.estado !== "ok" && x !== f; });
    var deshacer = { texto: "Serie " + (i + 1) + " · " + fmt(f.kg, 1) + " kg × " + f.reps, accion: function () { deshacerSerie(s, e, f, i); } };
    if (quedan.length) descanso(DESCANSO_SERIE, "Sigue: serie " + (e.filas.indexOf(quedan[0]) + 1) + " · " + fmt(quedan[0].kg, 1) + " kg × " + quedan[0].reps, null, deshacer);
    else {
      var sig = s.ejercicios.findIndex(function (x, k) { return k > s.actual && x.filas.some(function (y) { return y.estado !== "ok"; }); });
      if (sig >= 0) descanso(DESCANSO_EJERCICIO, "Sigue: " + s.ejercicios[sig].nombre, function () { if (estado.sesion === s) { s.actual = sig; guardarSesion(); if (estado.pantalla === "sesion") { pintar(); window.scrollTo(0, 0); } } }, deshacer);
    }
    api("agregar", { tabla: "series_gym", fila: fila }).then(function (r) {
      f.estado = "ok"; f.id = r.id;
      estado.tablas.series_gym.push(Object.assign({ id: r.id }, fila)); guardarCache();
      if (f.deshacer) { delete f.deshacer; return deshacerSerie(s, e, f, i); } // la deshizo mientras se guardaba
      if (record) { e.record = f.kg; s.records++; aviso("🏆 ¡Nuevo récord! " + fmt(f.kg, 1) + " kg en " + e.nombre); if (ev) confeti(ev); }
      else aviso("✓ Serie " + (i + 1) + " guardada");
      guardarSesion(); if (estado.pantalla === "sesion" && estado.sesion === s) pintar();
      if (seriesHechas(s) === seriesTotal(s)) setTimeout(function () { if (estado.sesion === s && !document.querySelector(".ses-descanso")) terminarEntreno(); }, 700);
    }, function (err) {
      f.estado = "error"; guardarSesion(); if (estado.pantalla === "sesion") pintar();
      aviso("No se guardó la serie " + (i + 1) + ": " + textoError(err) + " Toca ↻ para intentarlo otra vez.", true);
    });
  }
  /** Deshacer la serie que acabas de guardar (sin preguntar: lo pediste con el botón). */
  function deshacerSerie(s, e, f, i) {
    if (f.estado === "guardando") { f.deshacer = true; return; }
    if (!f.id) { f.estado = ""; guardarSesion(); return pintar(); }
    var id = f.id;
    f.estado = "guardando"; pintar();
    api("borrar", { tabla: "series_gym", id: id }).then(function () {
      estado.tablas.series_gym = estado.tablas.series_gym.filter(function (x) { return x.id !== id; }); guardarCache();
      if (f.kg === e.record && s.records) { s.records--; e.record = recordAntes(e.nombre); }
      f.estado = ""; delete f.id; guardarSesion();
      var k = s.ejercicios.indexOf(e); if (k >= 0) s.actual = k;
      if (estado.pantalla === "sesion") pintar();
      aviso("Serie " + (i + 1) + " deshecha: no quedó en tu hoja");
    }, function (err) { f.estado = "ok"; f.id = id; guardarSesion(); pintar(); manejarError(err); });
  }
  function borrarSerie(s, e, f, i) {
    if (!f.id || !confirm("¿Borrar la serie " + (i + 1) + " (" + fmt(f.kg, 1) + " kg × " + f.reps + ") de tu hoja?")) return;
    f.estado = "guardando"; pintar();
    api("borrar", { tabla: "series_gym", id: f.id }).then(function () {
      estado.tablas.series_gym = estado.tablas.series_gym.filter(function (x) { return x.id !== f.id; }); guardarCache();
      f.estado = ""; delete f.id; guardarSesion(); pintar(); aviso("Serie borrada");
    }, function (err) { f.estado = "ok"; pintar(); manejarError(err); });
  }

  /** Cuenta regresiva del descanso (abajo, sobre la pantalla). */
  function descanso(segundos, texto, alTerminar, deshacer) {
    clearInterval(relojDescanso);
    var viejo = document.querySelector(".ses-descanso"); if (viejo) viejo.remove();
    var total = segundos, fin = Date.now() + segundos * 1000, C = 263.9;
    var arco = null, txt = null;
    var caja = h("div", { class: "ses-descanso", role: "status", "aria-live": "polite" });
    var anillo = svg('<circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9"/><circle class="arco" cx="50" cy="50" r="42" fill="none" stroke="#B8F05A" stroke-width="9" stroke-linecap="round" transform="rotate(-90 50 50)" stroke-dasharray="' + C + '" stroke-dashoffset="0"/><text class="txt" x="50" y="57" text-anchor="middle" fill="#fff" stroke="none" font-size="22" font-weight="800"></text>', 88, 100);
    arco = anillo.querySelector(".arco"); txt = anillo.querySelector(".txt");
    function cerrar(aviso2) {
      clearInterval(relojDescanso); caja.classList.remove("ver"); setTimeout(function () { caja.remove(); }, 400);
      if (aviso2) { try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* nada */ } }
      if (alTerminar) alTerminar();
    }
    function pinta() {
      var q = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      txt.textContent = Math.floor(q / 60) + ":" + dos(q % 60);
      arco.setAttribute("stroke-dashoffset", (C * (1 - q / total)).toFixed(1));
      if (q <= 0) cerrar(true);
    }
    var ajustar = function (d) { return function () { fin = Math.max(Date.now() + 1000, fin + d * 1000); total = Math.max(total, Math.ceil((fin - Date.now()) / 1000)); pinta(); }; };
    caja.appendChild(anillo);
    caja.appendChild(h("div", {}, h("div", { class: "ses-desc-cab" }, h("b", { text: "Descansa" }),
        deshacer ? h("button", { type: "button", class: "ses-deshacer", "aria-label": "Deshacer la última serie: " + deshacer.texto, onclick: function () {
          alTerminar = null; cerrar(false); deshacer.accion();
        } }, "↶ Deshacer serie") : null),
      h("p", { text: texto }),
      h("div", { class: "ses-desc-acc" },
        h("button", { type: "button", text: "−15 s", onclick: ajustar(-15) }),
        h("button", { type: "button", text: "+15 s", onclick: ajustar(15) }),
        h("button", { type: "button", class: "lima", text: "Seguir", onclick: function () { cerrar(false); } }))));
    document.body.appendChild(caja);
    requestAnimationFrame(function () { caja.classList.add("ver"); });
    pinta();
    relojDescanso = setInterval(pinta, 250);
  }

  function confeti(ev) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cols = ["#B8F05A", "#2FA36B", "#0F2A1D", "#F0A43A", "#D8FF8A"];
    for (var i = 0; i < 26; i++) {
      var c = h("span", { class: "confeti" }), ang = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
      c.style.left = ev.clientX + "px"; c.style.top = ev.clientY + "px"; c.style.background = cols[i % cols.length];
      c.style.setProperty("--dx", Math.cos(ang) * d + "px"); c.style.setProperty("--dy", (Math.sin(ang) * d - 60 + Math.random() * 160) + "px"); c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      document.body.appendChild(c);
      setTimeout(function (el) { return function () { el.remove(); }; }(c), 1400);
    }
  }

  /** Resumen al terminar: guarda (si quieres) la sesión de gym con su duración y kcal estimadas. */
  function terminarEntreno() {
    var s = estado.sesion; if (!s) return;
    var pendientes = s.ejercicios.some(function (e) { return e.filas.some(function (f) { return f.estado === "guardando"; }); });
    if (pendientes) return aviso("Espera un momento: aún se está guardando una serie.", true);
    clearInterval(relojDescanso); var d = document.querySelector(".ses-descanso"); if (d) d.remove();
    var min = Math.max(1, Math.round((Date.now() - s.t0) / 60000)), hechas = seriesHechas(s);
    var kg = s.ejercicios.reduce(function (a, e) { return a + e.filas.filter(function (f) { return f.estado === "ok"; }).reduce(function (b, f) { return b + f.kg * f.reps; }, 0); }, 0);
    var med = medicion(), peso = med.peso ? Number(med.peso.peso_kg) : 75;
    var kcalEst = Math.round(5 * peso * min / 60); // pesas: unas 5 MET
    var ya = estado.tablas.ejercicio.filter(function (x) { return x.fecha === s.fecha && x.tipo === "gym"; })[0];
    var campoMin = h("input", { id: "f-ses-min", type: "number", inputmode: "numeric", min: 1, max: 600, value: min, "aria-label": "Duración en minutos" });
    var campoKcal = h("input", { id: "f-ses-kcal", type: "number", inputmode: "numeric", min: 0, max: 5000, value: kcalEst, "aria-label": "Calorías" });
    var cerrarSesion = function () { estado.sesion = null; guardarSesion(); mantenerPantalla(false); clearInterval(relojSesion); };
    var guardadas = seriesGuardadas(s);
    var botonCancelar = h("button", { class: "btn peligro", type: "button", text: !guardadas.length ? "Cancelar entreno" : guardadas.length === 1 ? "Cancelar entreno y borrar su serie" : "Cancelar entreno y borrar sus " + guardadas.length + " series", onclick: function () {
      if (!confirm(guardadas.length ? "¿Cancelar el entreno? Se " + (guardadas.length === 1 ? "borra de tu hoja la serie" : "borran de tu hoja las " + guardadas.length + " series") + " que guardaste en él." : "¿Cancelar el entreno?")) return;
      botonCancelar.disabled = true; botonCancelar.textContent = "Borrando…";
      var fallos = 0;
      guardadas.reduce(function (p, f) {
        return p.then(function () {
          return api("borrar", { tabla: "series_gym", id: f.id }).then(function () {
            var id = f.id; estado.tablas.series_gym = estado.tablas.series_gym.filter(function (x) { return x.id !== id; }); delete f.id; f.estado = "";
          }, function (err) { if (err && err.noAutorizado) throw err; fallos++; });
        });
      }, Promise.resolve()).then(function () {
        guardarCache();
        if (fallos) { guardarSesion(); botonCancelar.disabled = false; botonCancelar.textContent = "Cancelar entreno"; return aviso("No pude borrar " + plural(fallos, "serie", "series") + ". Revisa tu internet e inténtalo otra vez.", true); }
        cerrarSesion(); cerrarHoja(); aviso(guardadas.length ? "Entreno cancelado: se borraron sus series" : "Entreno cancelado");
        estado.pantalla = "rutina"; estado.rutinaActual = s.rutina; pintar(); window.scrollTo(0, 0);
      }, manejarError);
    } });
    var guardar = h("button", { class: "btn lima", type: "button", text: ya ? "Guardar otra sesión de gym" : "Guardar sesión de gym", onclick: function () {
      var m2 = Number(campoMin.value), k2 = campoKcal.value === "" ? null : Number(campoKcal.value);
      if (!(m2 >= 1 && m2 <= 600)) return aviso("Revisa los minutos.", true);
      guardar.disabled = true; guardar.textContent = "Guardando…";
      var fila = { fecha: s.fecha, tipo: "gym", duracion_min: Math.round(m2), kcal: k2, fuente: k2 === null ? "manual" : "estimado", notas: s.rutina };
      api("agregar", { tabla: "ejercicio", fila: fila }).then(function (r) {
        estado.tablas.ejercicio.push(Object.assign({ id: r.id }, fila)); guardarCache();
        cerrarSesion(); cerrarHoja(); aviso("¡Entreno guardado!"); estado.pantalla = "entreno"; estado.tabEntreno = "semana"; pintar(); window.scrollTo(0, 0);
      }, function (e) { guardar.disabled = false; guardar.textContent = "Guardar sesión de gym"; manejarError(e); });
    } });
    abrirHoja(hechas ? "¡Buen entreno!" : "Terminar entreno", h("div", { class: "ses-resumen" },
      hechas ? h("div", { class: "ses-kpis" },
        h("div", {}, h("b", { class: "num", text: min + " min" }), h("small", { text: "duración" })),
        h("div", {}, h("b", { class: "num", text: hechas + "/" + seriesTotal(s) }), h("small", { text: "series" })),
        h("div", {}, h("b", { class: "num", text: fmt(kg) + " kg" }), h("small", { text: "levantados" })),
        h("div", {}, h("b", { class: "num", text: String(s.records) }), h("small", { text: s.records === 1 ? "récord" : "récords" }))) :
        h("p", { class: "ayuda", text: "Aún no guardaste ninguna serie." }),
      hechas ? h("p", { class: "ayuda", text: "Tus series ya están en tu hoja. Si quieres, guarda también la sesión de gym de hoy con su duración y calorías (estimadas con tu peso; cámbialas si tu reloj dice otra cosa)." }) : null,
      ya ? h("p", { class: "ayuda ojo", text: "Ojo: hoy ya tienes una sesión de gym de " + fmt(ya.duracion_min) + " min (" + (ya.fuente || "manual") + "). Si es la misma, no la guardes otra vez." }) : null,
      hechas ? h("div", { class: "fila3", style: "grid-template-columns:1fr 1fr" },
        h("div", {}, h("label", { for: "f-ses-min", text: "Minutos" }), campoMin),
        h("div", {}, h("label", { for: "f-ses-kcal", text: "Calorías (opcional)" }), campoKcal)) : null,
      hechas ? guardar : null,
      h("button", { class: "btn sec", type: "button", text: hechas ? "Terminar sin guardar la sesión" : "Salir del entreno", onclick: function () {
        cerrarSesion(); cerrarHoja(); estado.pantalla = "rutina"; estado.rutinaActual = s.rutina; pintar();
      } }),
      h("button", { class: "btn sec", type: "button", text: "Seguir entrenando", onclick: function () { cerrarHoja(); } }),
      botonCancelar));
  }
  function seriesGuardadas(s) {
    var l = [];
    s.ejercicios.forEach(function (e) { e.filas.forEach(function (f) { if (f.id) l.push(f); }); });
    return l;
  }

  /** Última medición contra la anterior, dato por dato (cada dato contra su propia medición anterior). */
  function tarjetaComparacion(med) {
    var fechasGrupo = {}, masNueva = {};
    // La fecha más reciente de cada grupo: los datos de una fecha anterior se marcan con su fecha
    CAMPOS_MEDICION.forEach(function (c) {
      med.lista.forEach(function (x) { if (!vacio(x[c[0]]) && x.fecha > (masNueva[c[4]] || "")) masNueva[c[4]] = x.fecha; });
    });
    var filas = function (grupo) {
      return CAMPOS_MEDICION.filter(function (c) { return c[4] === grupo; }).map(function (c) {
        // El peso de la báscula se compara con la bioimpedancia anterior (no con un peso suelto anotado otro día)
        var con = med.lista.filter(function (x) { return !vacio(x[c[0]]) && (c[0] !== "peso_kg" || !vacio(x.grasa_pct) || med.lista.every(function (y) { return vacio(y.grasa_pct); })); });
        if (!con.length) return null;
        var u = con[con.length - 1], a = con.length > 1 ? con[con.length - 2] : null;
        var vu = Number(u[c[0]]), va = a ? Number(a[c[0]]) : null;
        var vieja = u.fecha < masNueva[grupo]; // este dato no se midió en la última medición del grupo
        var fg = fechasGrupo[grupo] = fechasGrupo[grupo] || { u: "", a: "" };
        if (!vieja) { if (u.fecha > fg.u) fg.u = u.fecha; if (a && a.fecha > fg.a) fg.a = a.fecha; }
        var unidad = c[2] ? " " + c[2] : "";
        var badge = null;
        if (vieja) badge = h("span", { class: "delta vieja", text: "de " + corta(u.fecha), title: "No se midió en la última medición" });
        else if (a) {
          var dl = vu - va, cero = Math.abs(dl) < Math.pow(10, -c[3]) / 2;
          var bueno = c[5] === "sube" ? dl > 0 : c[5] === "baja" ? dl < 0 : null;
          badge = h("span", { class: "delta" + (cero || bueno === null ? "" : bueno ? " up" : " dn"), text: cero ? "=" : (dl > 0 ? "▲ " : "▼ ") + fmt(Math.abs(dl), c[3]) });
        }
        return h("div", { class: "cmp-fila" + (vieja ? " cmp-vieja" : "") },
          h("span", { class: "cmp-n", text: c[1] }),
          h("span", { class: "cmp-a", text: !vieja && a ? fmt(va, c[3]) : "—", title: a ? corta(a.fecha) : "" }),
          h("span", { class: "cmp-u" }, h("b", { text: fmt(vu, c[3]) }), unidad),
          badge || h("span", { class: "delta", text: "nuevo" }));
      }).filter(Boolean);
    };
    var b = filas("bascula"), ci = filas("cinta"), z = filas("zona");
    if (!b.length && !ci.length) return tarjetaGraf("Última medición", "Aún no hay mediciones.", h("button", { class: "btn lima", text: "Medir ahora", onclick: function () { abrirAgregar("medidas", { enfocar: "peso_kg" }); } }));
    var conAnio = function (f) { return corta(f) + " " + String(deISO(f).getFullYear()).slice(2); };
    var titulo = function (nombre, g) { var fg = fechasGrupo[g]; return nombre + (fg ? " · " + conAnio(fg.u) + (fg.a ? " vs " + conAnio(fg.a) : "") : ""); };
    var cab = h("div", { class: "cmp-fila cmp-cab" }, h("span", { text: "" }), h("span", { text: "Anterior" }), h("span", { text: "Última" }), h("span", { text: "Cambio" }));
    return tarjetaGraf("Última medición vs la anterior", "Cada dato se compara con su medición anterior. Verde = va en la dirección buena; amarillo = en la contraria.", [
      b.length ? h("div", { class: "grupo-t", text: titulo("Báscula", "bascula") }) : null, b.length ? h("div", { class: "cmp" }, cab, b) : null,
      ci.length ? h("div", { class: "grupo-t", text: titulo("Cinta métrica", "cinta") }) : null, ci.length ? h("div", { class: "cmp" }, cab.cloneNode(true), ci) : null,
      z.length ? h("details", { class: "avanzado" }, h("summary", { text: titulo("Por zona (músculo y grasa)", "zona") }), h("div", { class: "cmp" }, cab.cloneNode(true), z)) : null]);
  }

  function graficaMedida(med, campo, titulo, unidad, color) {
    var conFecha = med.lista.filter(function (x) { return !vacio(x[campo]); });
    var desdeMed = conFecha.length ? conFecha[0].fecha : hoy, hastaMed = conFecha.length ? conFecha[conFecha.length - 1].fecha : hoy;
    var spanMed = Math.max(1, (deISO(hastaMed) - deISO(desdeMed)) / 86400000);
    var xMed = function (f) { return conFecha.length < 2 ? 0.5 : Math.min(1, (deISO(f) - deISO(desdeMed)) / 86400000 / spanMed); };
    var pts = conFecha.map(function (x) {
      return { x: xMed(x.fecha), v: Number(x[campo]), txt: corta(x.fecha) + " " + deISO(x.fecha).getFullYear() + ": " + fmt(x[campo], 1) + " " + unidad };
    });
    if (!pts.length) return tarjetaGraf(titulo, "Aún no hay mediciones.", h("button", { class: "btn lima", text: "Medir ahora", onclick: function () { abrirAgregar("medidas", { enfocar: "peso_kg" }); } }));
    var u = pts[pts.length - 1], ant = pts.length > 1 ? pts[pts.length - 2] : null;
    var vals = pts.map(function (q) { return q.v; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), pad = Math.max(0.5, (mx - mn) * 0.25);
    var marcas = marcasDe(mn - pad, mx + pad, 3);
    var def = CAMPOS_MEDICION.filter(function (c) { return c[0] === campo; })[0] || [];
    var dl = ant ? u.v - ant.v : 0, bueno = def[5] === "sube" ? dl > 0 : def[5] === "baja" ? dl < 0 : null;
    var cambio = ant ? h("div", { class: "grande" }, signo(dl, 1, unidad), " ", h("small", { class: bueno === null || Math.abs(dl) < 0.05 ? "" : bueno ? "bien" : "ojo", text: "desde " + corta(conFecha[conFecha.length - 2].fecha) }))
      : h("div", { class: "grande" }, fmt(u.v, 1) + " " + unidad, " ", h("small", { text: "primera medición" }));
    return tarjetaGraf(titulo, pts.length < 2 ? "Con tu próxima medición verás la línea." : null, [cambio,
      grafica({ tipo: "linea", puntos: pts, min: Math.min(marcas[0], mn - pad / 2), max: Math.max(marcas[marcas.length - 1], mx + pad / 2), marcas: marcas, unir: true, color: color, alto: 120,
        fmtEje: function (t) { return fmt(t, 1); }, etiquetaFinal: fmt(u.v, 1) + " " + unidad, resumen: titulo + ": última " + fmt(u.v, 1) + " " + unidad,
        fechas: pts.length > 1 ? [[0, corta(desdeMed)], [1, corta(hastaMed)]] : [] })]);
  }

  function tarjetaFuerza(R, diasF, ejeX) {
    var permitidos = {}; diasF.forEach(function (f) { permitidos[f] = true; });
    var enPeriodo = estado.tablas.series_gym.filter(function (s) { return s.fecha && permitidos[s.fecha] && !vacio(s.peso_kg); });
    var cuenta = {};
    enPeriodo.forEach(function (s) { var n = String(s.ejercicio || "").trim(); if (n) cuenta[n] = (cuenta[n] || 0) + 1; });
    var nombres = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; });
    if (!nombres.length) return pregunta(5, "Fuerza", "¿Estoy más fuerte?", true, "", h("div", { class: "vacio", text: "Sin series de gym con este filtro. Registra tus series para ver cómo subes de peso." }));
    var elegido = nombres.indexOf(estado.gymEjercicio) >= 0 ? estado.gymEjercicio : nombres[0];
    var porFecha = {};
    enPeriodo.filter(function (s) { return String(s.ejercicio).trim() === elegido; }).forEach(function (s) {
      var pk = Number(s.peso_kg), r = Number(s.repeticiones) || 0, a = porFecha[s.fecha];
      if (!a || pk > a.p || (pk === a.p && r > a.r)) porFecha[s.fecha] = { p: pk, r: r };
    });
    var fechasG = Object.keys(porFecha).sort();
    var N = R.dias.length;
    var ptsG = fechasG.map(function (f) { return { x: (R.dias.indexOf(f) + 0.5) / N, v: porFecha[f].p, txt: fechaLarga(f) + ": " + fmt(porFecha[f].p, 1) + " kg × " + fmt(porFecha[f].r) }; });
    var valsG = ptsG.map(function (q) { return q.v; });
    var mnG = Math.min.apply(null, valsG), mxG = Math.max.apply(null, valsG), padG = Math.max(2.5, (mxG - mnG) * 0.2);
    var marcasG = marcasDe(Math.max(0, mnG - padG), mxG + padG, 3);
    var primero = valsG[0], ultimo = valsG[valsG.length - 1];
    return pregunta(5, "Fuerza", "¿Estoy más fuerte?", ultimo >= primero,
      ptsG.length > 1 ? elegido + ": de " + fmt(primero, 1) + " a " + fmt(ultimo, 1) + " kg (peso máximo por sesión)." : elegido + ": " + fmt(ultimo, 1) + " kg. Con más sesiones verás la línea.", [
      h("div", { class: "chips" }, nombres.slice(0, 8).map(function (n) {
        return h("button", { type: "button", class: n === elegido ? "on" : "", text: n, onclick: function () { estado.gymEjercicio = n; pintar(); } });
      })),
      grafica({ tipo: "linea", puntos: ptsG, min: Math.min(marcasG[0], mnG - padG / 2), max: Math.max(marcasG[marcasG.length - 1], mxG + padG / 2), marcas: marcasG, unir: true, color: COLOR.tinta, relleno: COLOR.lima, borde: COLOR.tinta, alto: 130,
        fmtEje: function (t) { return fmt(t, 1); }, fechas: ejeX, etiquetaFinal: fmt(ultimo, 1) + " kg × " + fmt(porFecha[fechasG[fechasG.length - 1]].r), resumen: elegido + ": de " + fmt(primero, 1) + " a " + fmt(ultimo, 1) + " kg" })]);
  }

  // ---------- Hojas inferiores ----------
  var hojaActual = null;
  function abrirHoja(titulo, contenido) {
    cerrarHoja();
    var dlg = h("dialog", {});
    dlg.appendChild(h("div", { class: "hoja" },
      h("div", { class: "hoja-cab" }, h("h3", { text: titulo }),
        h("button", { class: "icono-btn", "aria-label": "Cerrar", onclick: cerrarHoja }, icono("cerrar"))),
      contenido));
    dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrarHoja(); });
    dlg.addEventListener("close", function () { if (dlg.parentNode) dlg.parentNode.removeChild(dlg); if (hojaActual === dlg) hojaActual = null; });
    document.body.appendChild(dlg);
    dlg.showModal();
    hojaActual = dlg;
  }
  function cerrarHoja() { if (hojaActual) { var d = hojaActual; hojaActual = null; d.close(); } }

  function campo(etiqueta, nombre, props) {
    var tag = props.tag || "input";
    var el = h(tag, Object.assign({ name: nombre, id: "f-" + nombre }, props.attrs || {}), props.hijos || null);
    if (props.valor !== undefined) el.value = props.valor;
    return h("div", {}, h("label", { for: "f-" + nombre, text: etiqueta }), el);
  }
  function opciones(lista) { return lista.map(function (o) { return h("option", { value: o[0], text: o[1] }); }); }

  function leerForm(form, numericos) {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { o[el.name] = el.checked; return; }
      var v = el.value.trim();
      o[el.name] = v === "" ? null : (numericos.indexOf(el.name) >= 0 ? Number(v.replace(",", ".")) : v);
    });
    return o;
  }

  function enviar(form, boton, llamada, mensaje) {
    boton.disabled = true;
    llamada().then(function () {
      var f = form.elements.fecha.value;
      cerrarHoja();
      aviso(mensaje);
      if (f && f <= hoy) estado.fecha = f;
      cargar();
    }).catch(function (e) { boton.disabled = false; manejarError(e); });
  }

  function formComida() {
    var hr = new Date().getHours();
    var tipo = hr < 11 ? "desayuno" : hr < 16 ? "almuerzo" : hr < 18 ? "snack" : "cena";
    var btn = h("button", { class: "btn lima", type: "submit", text: "Guardar comida" });
    var f = h("form", { novalidate: true },
      h("div", { class: "grid2" },
        campo("Fecha", "fecha", { attrs: { type: "date", required: true, max: hoy }, valor: estado.fecha }),
        campo("Hora", "hora", { attrs: { type: "time" }, valor: ahoraHHMM() })),
      campo("Tipo de comida", "tipo_comida", { tag: "select", attrs: { required: true } }),
      campo("Descripción", "descripcion", { tag: "textarea", attrs: { rows: 2, required: true, placeholder: "Ej: 200 g de pollo con arroz y ensalada" } }),
      h("div", { class: "grid2" },
        campo("Calorías (kcal)", "kcal", { attrs: { type: "number", min: 0, step: 1, inputmode: "numeric" } }),
        campo("Proteína (g)", "proteina_g", { attrs: { type: "number", min: 0, step: 0.1, inputmode: "decimal" } }),
        campo("Carbohidratos (g)", "carbos_g", { attrs: { type: "number", min: 0, step: 0.1, inputmode: "decimal" } }),
        campo("Grasa (g)", "grasa_g", { attrs: { type: "number", min: 0, step: 0.1, inputmode: "decimal" } })),
      h("label", { class: "check" }, h("input", { type: "checkbox", name: "estimado" }), "Los valores son estimados"),
      btn);
    var sel = f.elements.tipo_comida;
    opciones([["desayuno", "Desayuno"], ["almuerzo", "Almuerzo"], ["cena", "Cena"], ["snack", "Snack"]]).forEach(function (o) { sel.appendChild(o); });
    sel.value = tipo;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fila = leerForm(f, ["kcal", "proteina_g", "carbos_g", "grasa_g"]);
      if (!fila.descripcion) return aviso("Escribe qué comiste.", true);
      enviar(f, btn, function () { return api("agregar", { tabla: "comidas", fila: fila }); }, "Comida guardada");
    });
    return f;
  }

  function formMedidas(opc) {
    opc = opc || {};
    var ya = vistaDia().medida || {};
    var val = function (k) { return vacio(ya[k]) ? "" : String(ya[k]); };
    var btn = h("button", { class: "btn lima", type: "submit", text: "Guardar medidas" });
    var numero = function (c) {
      return campo(c[1] + (c[2] ? " (" + c[2] + ")" : ""), c[0], { attrs: { type: "number", min: c[6], max: c[7], step: c[3] === 2 ? 0.01 : c[3] === 1 ? 0.1 : 1, inputmode: "decimal" }, valor: val(c[0]) });
    };
    var grupo = function (g) { return h("div", { class: "grid2" }, CAMPOS_MEDICION.filter(function (c) { return c[4] === g; }).map(numero)); };
    var viejo = estado.version !== null && estado.version < 3;
    var f = h("form", { novalidate: true },
      campo("Fecha", "fecha", { attrs: { type: "date", required: true, max: hoy }, valor: estado.fecha }),
      h("h4", { class: "subtitulo", text: "Sueño (cada día)" }),
      campo("Horas de sueño", "horas_sueno", { attrs: { type: "number", min: 0, max: 24, step: 0.1, inputmode: "decimal" }, valor: val("horas_sueno") }),
      h("h4", { class: "subtitulo", text: "Medición trimestral (cada 3 meses)" }),
      h("p", { class: "ayuda", text: (function () { var md = medicion(); return md.fecha ? "Última: " + corta(md.fecha) + (md.toca ? ". Ya toca medir." : ". Próxima en " + md.faltan + " días.") : "Aún no tienes mediciones."; })() + " Llena solo lo que tengas." }),
      viejo ? h("p", { class: "ayuda ojo", text: "Para guardar algo más que peso y cintura, primero actualiza tu servicio de Google (Ajustes → Actualiza tu servicio)." }) : null,
      h("div", { class: "grupo-t", text: "Báscula (bioimpedancia)" }), grupo("bascula"),
      h("div", { class: "grupo-t", text: "Cinta métrica" }), grupo("cinta"),
      h("details", { class: "avanzado" }, h("summary", { text: "Por zona (músculo y grasa de cada brazo, pierna y tronco)" }), grupo("zona")),
      btn);
    if (opc.enfocar) setTimeout(function () { var el = f.querySelector('[name="' + opc.enfocar + '"]'); if (el) { el.focus(); if (el.select) el.select(); } }, 60);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var nums = ["horas_sueno"].concat(CAMPOS_MEDICION.map(function (c) { return c[0]; }));
      var fila = leerForm(f, nums);
      if (nums.every(function (k) { return fila[k] === null; })) return aviso("Escribe al menos un dato.", true);
      if (viejo && CAMPOS_V3.some(function (k) { return fila[k] !== null; })) return aviso("Primero actualiza tu servicio de Google: si no, esos datos no se guardan.", true);
      var mal = CAMPOS_MEDICION.filter(function (c) { return fila[c[0]] !== null && (fila[c[0]] < c[6] || fila[c[0]] > c[7]); })[0];
      if (mal) return aviso(mal[1] + ": revisa el número (entre " + c6(mal) + ").", true);
      enviar(f, btn, function () { return api("medidas", { fila: fila }); }, "Medidas guardadas");
    });
    function c6(c) { return fmt(c[6]) + " y " + fmt(c[7]); }
    return f;
  }


  function formEjercicio() {
    var btn = h("button", { class: "btn lima", type: "submit", text: "Guardar ejercicio" });
    var f = h("form", { novalidate: true },
      campo("Fecha", "fecha", { attrs: { type: "date", required: true, max: hoy }, valor: estado.fecha }),
      campo("Tipo", "tipo", { tag: "select", attrs: { required: true } }),
      h("div", { class: "grid2" },
        campo("Duración (min)", "duracion_min", { attrs: { type: "number", min: 1, step: 1, inputmode: "numeric" } }),
        campo("Calorías (kcal)", "kcal", { attrs: { type: "number", min: 0, step: 1, inputmode: "numeric" } })),
      campo("Fuente de los datos", "fuente", { tag: "select" }),
      campo("Notas", "notas", { tag: "textarea", attrs: { rows: 2 } }),
      btn);
    opciones([["gym", "Gym"], ["bici", "Bici"], ["caminata", "Caminata"]]).forEach(function (o) { f.elements.tipo.appendChild(o); });
    opciones([["manual", "Manual"], ["estimado", "Estimado"], ["strava", "Strava"]]).forEach(function (o) { f.elements.fuente.appendChild(o); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fila = leerForm(f, ["duracion_min", "kcal"]);
      enviar(f, btn, function () { return api("agregar", { tabla: "ejercicio", fila: fila }); }, "Ejercicio guardado");
    });
    return f;
  }

  // ---------- Chat con API (opcional) ----------
  function formChat() {
    var log = h("div", { class: "chat-log", "aria-live": "polite" });
    var texto = h("textarea", { rows: 2, maxlength: "1000", placeholder: "Ej: almuerzo, 200 g de pollo con arroz y ensalada", "aria-label": "Mensaje" });
    var btn = h("button", { class: "btn lima", type: "button", text: "Enviar" });

    function burbuja(e) {
      var b = h("div", { class: "burbuja " + (e.rol === "user" ? "yo" : "ia") + (e.error ? " error" : ""), text: e.texto });
      (e.guardados || []).forEach(function (g) {
        if (!g.id) return;
        var u = h("button", { class: "deshacer", type: "button", text: "Deshacer: " + g.texto.slice(0, 40), onclick: function () {
          u.disabled = true;
          api("borrar", { tabla: g.tabla, id: g.id }).then(function () { u.textContent = "Borrado"; cargar(); })
            .catch(function (er) { u.disabled = false; manejarError(er); });
        } });
        b.appendChild(u);
      });
      log.appendChild(b);
      log.scrollTop = log.scrollHeight;
      return b;
    }
    if (!estado.historial.length) {
      log.appendChild(h("div", { class: "burbuja ia", text: "Cuéntame qué comiste, tu peso, cintura, sueño o ejercicio y lo guardo. Por ejemplo: «desayuno 3 huevos y 2 tostadas» o «peso 72,4, dormí 7 horas»." }));
    }
    estado.historial.forEach(burbuja);

    btn.addEventListener("click", function () {
      var t = texto.value.trim();
      if (!t) return;
      var previo = estado.historial.filter(function (x) { return !x.error; }).slice(-8).map(function (x) { return { rol: x.rol, texto: x.texto }; });
      var mio = { rol: "user", texto: t };
      estado.historial.push(mio); burbuja(mio);
      texto.value = "";
      btn.disabled = true; btn.textContent = "Pensando…";
      var espera = h("div", { class: "burbuja ia", text: "…" });
      log.appendChild(espera); log.scrollTop = log.scrollHeight;
      api("chat", { texto: t, historial: previo, hoy: iso(new Date()), hora: ahoraHHMM() }).then(function (r) {
        espera.remove();
        var resp = { rol: "assistant", texto: r.respuesta, guardados: r.guardados || [] };
        estado.historial.push(resp); burbuja(resp);
        if (resp.guardados.length) cargar();
      }).catch(function (e) {
        espera.remove();
        if (e && e.noAutorizado) return manejarError(e);
        var msg = { rol: "assistant", texto: textoError(e), error: true };
        estado.historial.push(msg); burbuja(msg);
      }).then(function () { btn.disabled = false; btn.textContent = "Enviar"; });
    });

    return h("div", { class: "chat" }, log, texto, btn,
      h("p", { class: "ayuda", text: "Lo que escribas se envía a Claude para estimar los valores. Revisa lo guardado; puedes deshacerlo." }));
  }

  // ---------- Pegar desde Claude (sin costo de API) ----------
  // Las metas salen de la pestaña «metas» de tu hoja; el perfil lo escribes tú en el chat de Claude.
  function instruccionesClaude() {
    var m = estado.metas || {};
    var partes = [];
    if (!vacio(m.proteina_min_g) && !vacio(m.proteina_max_g)) partes.push("proteína de " + fmt(m.proteina_min_g) + " a " + fmt(m.proteina_max_g) + " g al día");
    if (!vacio(m.kcal_base)) partes.push("calorías cerca del mantenimiento (unas " + fmt(m.kcal_base) + " kcal más el ejercicio del día)" + (!vacio(m.deficit_min_kcal) && !vacio(m.deficit_max_kcal) ? ", con un déficit de " + fmt(m.deficit_min_kcal) + " a " + fmt(m.deficit_max_kcal) + " kcal en días normales" : ""));
    return [
      "Eres mi asistente de seguimiento personal.",
      "Mi perfil: [escribe aquí tu edad, estatura, peso y objetivo].",
      partes.length ? "Mis metas: " + partes.join("; ") + "." : "",
      "",
      "Cuando te cuente lo que comí, mi peso, cintura, sueño o ejercicio, haz esto:",
      "1. Estima kcal, proteína, carbos y grasa con porciones típicas. estimado=true salvo que te dé etiqueta o pesos exactos. Una comida con varios alimentos es UN registro con los totales.",
      "2. Si algo es ambiguo o las cantidades parecen raras, hazme UNA pregunta corta antes de dar los datos.",
      "3. Respóndeme en español, breve, con el total acumulado del día contra mis metas (llevas X kcal y Y g de proteína; te faltan Z).",
      "4. Termina SIEMPRE con UN solo bloque de código con una lista JSON de lo nuevo (solo lo de este mensaje), sin texto dentro del bloque.",
      "5. NO pongas el campo «fecha»: mi app usa el día que tengo abierto. Solo si te hablo de otro día (ayer, el lunes…) agrega \"fecha\":\"AAAA-MM-DD\".",
      "",
      "Formato de cada registro (usa solo los campos que corresponden; hora HH:MM opcional):",
      '{"tabla":"comidas","hora":"13:30","tipo_comida":"almuerzo","descripcion":"Pollo, arroz y ensalada","kcal":620,"proteina_g":46,"carbos_g":60,"grasa_g":12,"estimado":true}',
      '{"tabla":"medidas","peso_kg":72.4,"cintura_cm":85.5,"horas_sueno":7}',
      'Medición trimestral (en la misma "tabla":"medidas", con "fecha"; usa solo los campos que te dé): grasa_pct, masa_muscular_kg, masa_libre_grasa_kg, agua_l, grasa_visceral, metabolismo_basal_kcal, imc, abdomen_bajo_cm, pecho_cm, cadera_cm, brazo_izq_cm, brazo_der_cm, muslo_cm, y por zona magra_/grasa_ + brazo_izq_kg, brazo_der_kg, tronco_kg, pierna_izq_kg, pierna_der_kg (por ejemplo magra_tronco_kg).',
      '{"tabla":"ejercicio","tipo":"caminata","duracion_min":40,"kcal":210,"fuente":"estimado","notas":""}',
      '{"tabla":"series_gym","rutina":"Pecho","ejercicio":"Press banca","numero_serie":1,"peso_kg":60,"repeticiones":8}',
      "",
      "Valores permitidos: tipo_comida = desayuno | almuerzo | cena | snack. tipo (ejercicio) = gym | bici | caminata. fuente = manual | estimado | strava.",
      "El sueño lo registro cada día; el peso y la cintura solo cada 3 meses. En medidas incluye solo lo que te dé. En series_gym, 4 series de 8 con 60 kg son 4 registros (numero_serie 1 a 4).",
      "Gym: registra cada serie en series_gym (ejercicio con el nombre EXACTO que muestra la app de Smart Fit, sin traducirlo ni cambiarlo, por ejemplo «Cristos Invertidos En Maquina»; en «rutina» el nombre del día, por ejemplo «Espalda y bíceps») y además UN registro de ejercicio tipo gym con la duración y las kcal de la sesión.",
      "Ejemplo de bloque final: [ {registro}, {registro} ]. No inventes datos que no te dije."
    ].join("\n");
  }

  var ALIAS_TABLAS = { comidas: "comidas", comida: "comidas", medidas: "medidas", medida: "medidas", ejercicio: "ejercicio", ejercicios: "ejercicio",
    series_gym: "series_gym", serie_gym: "series_gym", series: "series_gym", serie: "series_gym", gym: "series_gym" };
  // Palabras que Claude a veces usa y que el servicio no acepta: se traducen a las que sí
  var ALIAS_COMIDA = { desayuno: "desayuno", almuerzo: "almuerzo", comida: "almuerzo", brunch: "almuerzo", lunch: "almuerzo", cena: "cena", dinner: "cena",
    snack: "snack", snacks: "snack", merienda: "snack", "media mañana": "snack", "media manana": "snack", "media tarde": "snack", onces: "snack", once: "snack",
    "colación": "snack", colacion: "snack", tentempié: "snack", "pre-entreno": "snack", preentreno: "snack", "pre entreno": "snack",
    "post-entreno": "snack", postentreno: "snack", "post entreno": "snack", batido: "snack", "suplemento": "snack", "refrigerio": "snack", "algo": "snack" };
  var ALIAS_EJERCICIO = { gym: "gym", gimnasio: "gym", pesas: "gym", fuerza: "gym", "entrenamiento de fuerza": "gym", crossfit: "gym", funcional: "gym",
    bici: "bici", bicicleta: "bici", ciclismo: "bici", spinning: "bici", "bici estática": "bici", "bici estatica": "bici", mtb: "bici", ruta: "bici",
    caminata: "caminata", caminar: "caminata", "caminata rápida": "caminata", senderismo: "caminata", trote: "caminata", trotar: "caminata", correr: "caminata", carrera: "caminata", running: "caminata" };
  var RANGOS = {
    comidas: { kcal: [0, 10000], proteina_g: [0, 1000], carbos_g: [0, 1500], grasa_g: [0, 1000] },
    ejercicio: { duracion_min: [1, 1440], kcal: [0, 10000] },
    series_gym: { numero_serie: [1, 100, true], peso_kg: [0, 1000], repeticiones: [1, 1000, true] },
    medidas: { horas_sueno: [0, 24] }
  };
  CAMPOS_MEDICION.forEach(function (c) { RANGOS.medidas[c[0]] = [c[6], c[7]]; });
  var NOMBRES = { kcal: "calorías", proteina_g: "proteína", carbos_g: "carbos", grasa_g: "grasa", duracion_min: "duración", numero_serie: "número de serie",
    peso_kg: "peso", repeticiones: "repeticiones", cintura_cm: "cintura", horas_sueno: "horas de sueño",
    tipo_comida: "tipo de comida", tipo: "tipo de ejercicio", fuente: "fuente", descripcion: "descripción", rutina: "rutina", ejercicio: "ejercicio", fecha: "fecha" };
  CAMPOS_MEDICION.forEach(function (c) { if (c[0] !== "peso_kg") NOMBRES[c[0]] = c[1].toLowerCase(); });
  function aNumero(v) { return typeof v === "number" ? v : Number(String(v).replace(",", ".").replace(/[^\d.\-]/g, "")); }
  /** Lo mismo que revisa el servicio de Google, para avisar antes de guardar. */
  function problemaDatos(r) {
    var rg = RANGOS[r.tabla] || {};
    for (var k in rg) {
      if (vacio(r[k])) continue;
      var v = aNumero(r[k]);
      if (!isFinite(v)) return NOMBRES[k] + " no es un número";
      if (v < rg[k][0]) return NOMBRES[k] + " menor que " + rg[k][0];
      if (v > rg[k][1]) return NOMBRES[k] + " mayor que " + fmt(rg[k][1]);
      if (rg[k][2] && Math.floor(v) !== v) return NOMBRES[k] + " debe ser un número entero";
    }
    if (r.tabla === "comidas" && ["desayuno", "almuerzo", "cena", "snack"].indexOf(r.tipo_comida) < 0) return "tipo de comida «" + r.tipo_comida + "» no válido";
    if (r.tabla === "ejercicio" && ["gym", "bici", "caminata"].indexOf(r.tipo) < 0) return "tipo de ejercicio «" + r.tipo + "» no válido";
    if (r.tabla === "series_gym" && vacio(r.repeticiones)) return "faltan las repeticiones";
    if (r.tabla === "series_gym" && vacio(r.peso_kg)) return "falta el peso";
    return "";
  }

  function leerRegistros(texto) {
    var t = String(texto || "").replace(/```[a-zA-Z]*/g, "").trim();
    var datos = null;
    try { datos = JSON.parse(t); } catch (e1) {
      var ini = t.indexOf("["), fin = t.lastIndexOf("]");
      if (ini >= 0 && fin > ini) { try { datos = JSON.parse(t.slice(ini, fin + 1)); } catch (e2) { datos = null; } }
      if (!datos) {
        var lineas = t.split("\n").map(function (x) { return x.trim().replace(/,$/, ""); }).filter(function (x) { return x.charAt(0) === "{"; });
        try { datos = lineas.map(function (x) { return JSON.parse(x); }); } catch (e3) { datos = null; }
      }
    }
    if (datos && !Array.isArray(datos)) datos = [datos];
    if (!datos || !datos.length) throw new Error("No encontré datos. Pega exactamente el bloque que te dio Claude.");
    if (datos.length > 150) throw new Error("Son demasiados registros de una vez (máximo 150). Pégalos en partes.");
    return datos;
  }

  /** Limpia un registro pegado: nombre de tabla, fecha (o el día abierto), mayúsculas. */
  function normalizarRegistro(r) {
    if (!r || typeof r !== "object") return null;
    var o = {};
    Object.keys(r).forEach(function (k) { o[String(k).trim()] = typeof r[k] === "string" ? r[k].trim() : r[k]; });
    o.tabla = ALIAS_TABLAS[String(o.tabla || "").toLowerCase()] || "";
    o.fecha = vacio(o.fecha) ? estado.fecha : normFecha(o.fecha);
    if (!vacio(o.hora)) { o.hora = normHora(o.hora); if (!/^\d{2}:\d{2}$/.test(o.hora)) delete o.hora; }
    if (o.tipo_comida) { var tc = String(o.tipo_comida).toLowerCase(); o.tipo_comida = ALIAS_COMIDA[tc] || tc; }
    if (o.tipo) {
      var te = String(o.tipo).toLowerCase();
      if (o.tabla === "ejercicio" && ALIAS_EJERCICIO[te] && ALIAS_EJERCICIO[te] !== te && vacio(o.notas)) o.notas = cap(te);
      o.tipo = ALIAS_EJERCICIO[te] || te;
    }
    if (o.fuente) { o.fuente = String(o.fuente).toLowerCase(); if (["strava", "manual", "estimado"].indexOf(o.fuente) < 0) delete o.fuente; }
    if (o.tabla === "series_gym" && vacio(o.rutina)) o.rutina = "Gym";
    // Números escritos como «620 kcal» o «72,4»
    Object.keys(RANGOS[o.tabla] || {}).forEach(function (k) { if (!vacio(o[k]) && typeof o[k] === "string" && isFinite(aNumero(o[k]))) o[k] = aNumero(o[k]); });
    return o;
  }

  function describirRegistro(r) {
    if (!r || !r.tabla) return { ok: false, texto: "Registro no reconocido" };
    var n = function (v) { return vacio(v) ? "?" : fmt(v, 1); };
    var problema = !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? "fecha no válida" : r.fecha > hoy ? "fecha futura" : problemaDatos(r);
    var cuando = r.fecha !== estado.fecha && !problema ? " · " + corta(r.fecha) : "";
    var d, problemaServicio = "";
    if (r.tabla === "comidas") d = { ok: !!(r.tipo_comida && r.descripcion), texto: cap(r.tipo_comida || "?") + ": " + String(r.descripcion || "?") + " · " + n(r.kcal) + " kcal · " + n(r.proteina_g) + " g proteína" + (r.estimado === true || r.estimado === "true" ? " (estimado)" : "") };
    else if (r.tabla === "medidas") {
      var p = [];
      if (!vacio(r.peso_kg)) p.push(n(r.peso_kg) + " kg");
      if (!vacio(r.cintura_cm)) p.push("cintura " + n(r.cintura_cm) + " cm");
      if (!vacio(r.grasa_pct)) p.push("grasa " + n(r.grasa_pct) + " %");
      if (!vacio(r.masa_muscular_kg)) p.push("músculo " + n(r.masa_muscular_kg) + " kg");
      if (!vacio(r.horas_sueno)) p.push(n(r.horas_sueno) + " h de sueño");
      var otros = CAMPOS_V3.filter(function (c) { return c !== "grasa_pct" && c !== "masa_muscular_kg" && !vacio(r[c]); }).length;
      if (otros) p.push("+" + otros + (otros === 1 ? " dato más" : " datos más"));
      d = { ok: p.length > 0, texto: "Medidas: " + (p.join(" · ") || "sin datos") };
      if (estado.version !== null && estado.version < 3 && CAMPOS_V3.some(function (c) { return !vacio(r[c]); })) problemaServicio = "primero actualiza tu servicio de Google (Ajustes)";
    } else if (r.tabla === "ejercicio") d = { ok: !!r.tipo, texto: "Ejercicio: " + cap(r.tipo || "?") + (r.duracion_min ? " · " + n(r.duracion_min) + " min" : "") + (vacio(r.kcal) ? "" : " · " + n(r.kcal) + " kcal") };
    else d = { ok: !!(r.ejercicio && r.numero_serie), texto: "Gym: " + String(r.ejercicio || "?") + " · serie " + n(r.numero_serie) + ": " + n(r.peso_kg) + " kg × " + n(r.repeticiones) };
    problema = problema || problemaServicio;
    if (problema) { d.ok = false; d.texto += " (" + problema + ")"; }
    d.texto += cuando;
    return d;
  }

  // Para no guardar dos veces lo mismo (por ejemplo, si pegas el mismo bloque otra vez)
  function huellaRegistro(r) {
    var t = function (v) { return vacio(v) ? "" : String(v).trim().toLowerCase(); };
    var num = function (v) { return vacio(v) || isNaN(Number(v)) ? "" : String(Number(v)); };
    if (r.tabla === "comidas") return ["comidas", r.fecha, t(r.tipo_comida), t(r.descripcion), num(r.kcal)].join("|");
    if (r.tabla === "ejercicio") return ["ejercicio", r.fecha, t(r.tipo), num(r.duracion_min), num(r.kcal)].join("|");
    if (r.tabla === "series_gym") return ["series_gym", r.fecha, t(r.ejercicio), num(r.numero_serie), num(r.peso_kg), num(r.repeticiones)].join("|");
    return ""; // medidas: una por día, guardar otra vez solo actualiza
  }
  function yaGuardado(r, clave) {
    var T = estado.tablas;
    if (!T || !T[r.tabla] || !estado.desde || r.fecha < estado.desde) return false;
    return T[r.tabla].some(function (x) { return huellaRegistro(Object.assign({ tabla: r.tabla }, x, { fecha: normFecha(x.fecha) })) === clave; });
  }
  function explicarFallo(e) {
    var m = e && e.message ? e.message : "error desconocido";
    var t = m.replace(/^(\w+) no es válido/, function (x, c) { return (NOMBRES[c] || c) + " no es válido"; })
      .replace(/^(\w+) es (mayor|menor) que/, function (x, c, mm) { return (NOMBRES[c] || c) + " es " + mm + " que"; })
      .replace(/^Falta (\w+)/, function (x, c) { return "Falta " + (NOMBRES[c] || c); });
    return t;
  }
  function enviarRegistro(r) {
    var fila = {};
    Object.keys(r).forEach(function (k) { if (k !== "tabla") fila[k] = r[k]; });
    return r.tabla === "medidas" ? api("medidas", { fila: fila }) : api("agregar", { tabla: r.tabla, fila: fila });
  }

  function formPegar() {
    var area = h("textarea", { rows: 6, "aria-label": "Datos de Claude", placeholder: "Pega aquí el bloque con corchetes [ … ] que te dio Claude" });
    var vista = h("div", { class: "lista" });
    var revisar = h("button", { class: "btn lima", type: "button", text: "Revisar" });
    var guardar = h("button", { class: "btn lima", type: "button", text: "Guardar", hidden: true });
    var resumen = h("p", { class: "ayuda resumen-pegar", hidden: true });
    var copiar = h("button", { class: "btn sec", type: "button", text: "Copiar instrucciones para Claude" });
    var respaldo = h("textarea", { rows: 6, readonly: true, hidden: true, "aria-label": "Instrucciones para Claude" });
    var validos = [];

    copiar.addEventListener("click", function () {
      copiarTexto(instruccionesClaude(), respaldo, "Instrucciones copiadas. Pégalas en un chat de Claude.");
    });

    function listo(hayValidos) {
      guardar.hidden = !hayValidos;
      revisar.className = hayValidos ? "btn sec" : "btn lima";
    }

    revisar.addEventListener("click", function () {
      vista.textContent = ""; validos = []; listo(false); resumen.hidden = true;
      var lista;
      try { lista = leerRegistros(area.value); } catch (e) { return aviso(e.message, true); }
      var repetidos = 0, malos = 0, vistos = {};
      lista.map(normalizarRegistro).forEach(function (r) {
        var d = describirRegistro(r);
        var texto = d.texto;
        if (d.ok) {
          var clave = huellaRegistro(r);
          if (clave && (vistos[clave] || yaGuardado(r, clave))) { d.ok = false; repetidos++; texto = "Ya está guardado: " + d.texto; }
          else { if (clave) vistos[clave] = true; validos.push(r); }
        } else { malos++; texto = "No se guardará: " + d.texto; }
        vista.appendChild(h("div", { class: "item" + (d.ok ? "" : " apagado") }, h("div", { class: "t" }, h("b", { text: texto }))));
      });
      var partes = [validos.length + (validos.length === 1 ? " listo para guardar" : " listos para guardar")];
      if (repetidos) partes.push(repetidos + (repetidos === 1 ? " ya estaba guardado" : " ya estaban guardados"));
      if (malos) partes.push(malos + " con problemas");
      resumen.textContent = partes.join(" · ") + ".";
      resumen.hidden = false;
      if (validos.length) { guardar.textContent = "Guardar " + validos.length + (validos.length === 1 ? " registro" : " registros"); listo(true); }
      else aviso(repetidos ? "Todo eso ya estaba guardado." : "Ningún registro es válido.", true);
    });

    guardar.addEventListener("click", function () {
      guardar.disabled = true; revisar.disabled = true;
      var res = { ok: 0, fallos: [], fechas: [] }, hechos = 0, total = validos.length;
      var pendientes = validos.slice(), parar = null;
      guardar.textContent = "Guardando 0 de " + total + "…";
      // Varios a la vez (3) para que una lista larga no tarde tanto
      function trabajador() {
        if (parar || !pendientes.length) return Promise.resolve();
        var r = pendientes.shift();
        var intento = function () { return enviarRegistro(r); };
        return intento().catch(function (e) {
          // Un tropiezo de conexión o de Google ocupado: se intenta otra vez
          if (e && (e.noAutorizado || e.datos)) throw e;
          return new Promise(function (ok) { setTimeout(ok, 1500); }).then(intento);
        }).then(function () { res.ok++; res.fechas.push(r.fecha); }, function (e) {
          if (e && e.noAutorizado) { parar = e; return; }
          res.fallos.push({ r: r, texto: describirRegistro(r).texto + " → " + explicarFallo(e) });
        }).then(function () { hechos++; guardar.textContent = "Guardando " + hechos + " de " + total + "…"; return trabajador(); });
      }
      Promise.all([trabajador(), trabajador(), trabajador()]).then(function () {
        if (parar) throw parar;
        guardar.disabled = false; revisar.disabled = false;
        if (res.ok) {
          // Muestra el día de lo que se guardó
          var ultima = res.fechas.filter(function (f) { return f <= hoy; }).sort().pop();
          if (ultima) estado.fecha = ultima;
          cargar();
        }
        if (!res.fallos.length) { cerrarHoja(); aviso(res.ok + (res.ok === 1 ? " registro guardado" : " registros guardados")); return; }
        aviso("Guardé " + res.ok + " y fallaron " + res.fallos.length + ".", true);
        vista.textContent = ""; resumen.hidden = true;
        res.fallos.forEach(function (f) { vista.appendChild(h("div", { class: "item" }, h("div", { class: "t" }, h("b", { text: "No se guardó: " + f.texto })))); });
        // Los que fallaron quedan en el cuadro para corregirlos o reintentar
        area.value = JSON.stringify(res.fallos.map(function (f) { return f.r; }), null, 1);
        vista.insertBefore(h("p", { class: "ayuda", text: "Dejé en el cuadro de arriba solo los que no se guardaron. Puedes tocar Revisar para intentarlo otra vez, o pedirle a Claude que los corrija." }), vista.firstChild);
        listo(false);
      }).catch(function (e) { guardar.disabled = false; revisar.disabled = false; manejarError(e); });
    });

    return h("div", { class: "chat" },
      h("p", { class: "ayuda", text: "1) Copia las instrucciones y pégalas una vez en un chat de Claude. 2) Cuéntale lo que comiste, tu peso, etc. 3) Copia el bloque de datos que te devuelva y pégalo aquí. Se guarda en el día que tienes abierto: " + corta(estado.fecha) + "." }),
      copiar, respaldo, area, revisar, resumen, guardar, vista,
      h("p", { class: "ayuda", text: "Usa tu plan de Claude, no la API. Revisa la lista antes de guardar." }));
  }

  /** Copia un texto; si el navegador no deja, lo muestra para copiarlo a mano. */
  function copiarTexto(texto, respaldo, mensaje) {
    var plan_b = function () { respaldo.value = texto; respaldo.hidden = false; respaldo.focus(); respaldo.select(); aviso("Copia el texto de abajo (Ctrl+C o mantén pulsado)."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { respaldo.hidden = true; aviso(mensaje); }, plan_b);
    else plan_b();
  }

  function abrirAgregar(tab, opc) {
    var cuerpo = h("div", {});
    var tabs = h("div", { class: "tabs", role: "tablist" });
    var defs = (estado.chat ? [["chat", "Chat", formChat]] : []).concat([["pegar", "Pegar", formPegar], ["comida", "Comida", formComida], ["medidas", "Medidas", formMedidas], ["ejercicio", "Ejercicio", formEjercicio]]);
    function mostrar(clave) {
      cuerpo.textContent = "";
      Array.prototype.forEach.call(tabs.children, function (b, i) { b.className = defs[i][0] === clave ? "on" : ""; b.setAttribute("aria-selected", defs[i][0] === clave); });
      cuerpo.appendChild(defs.filter(function (x) { return x[0] === clave; })[0][2](clave === tab ? opc : undefined));
    }
    defs.forEach(function (x) { tabs.appendChild(h("button", { type: "button", role: "tab", text: x[1], onclick: function () { mostrar(x[0]); } })); });
    abrirHoja("Agregar registro", h("div", { style: "display:flex;flex-direction:column;gap:6px" }, tabs, cuerpo));
    mostrar(defs.some(function (x) { return x[0] === tab; }) ? tab : "pegar");
  }

  // ---------- Detalles ----------
  function lineas(pares) {
    return h("div", { class: "lista" }, pares.filter(function (p) { return !vacio(p[1]); }).map(function (p) {
      return h("div", { class: "item", style: "justify-content:space-between" }, h("span", { class: "sub", text: p[0] }), h("b", { text: String(p[1]) }));
    }));
  }
  function botonBorrar(tabla, id, texto) {
    var b = h("button", { class: "btn peligro", text: texto || "Borrar este registro", onclick: function () {
      if (!confirm("¿Borrar este registro?")) return;
      b.disabled = true;
      api("borrar", { tabla: tabla, id: id }).then(function () { cerrarHoja(); aviso("Registro borrado"); cargar(); })
        .catch(function (e) { b.disabled = false; manejarError(e); });
    } });
    return b;
  }
  function detalleComida(c) {
    abrirHoja(cap(c.tipo_comida), h("div", { style: "display:flex;flex-direction:column;gap:6px" }, lineas([
      ["Descripción", c.descripcion], ["Hora", c.hora], ["Calorías", vacio(c.kcal) ? null : fmt(c.kcal) + " kcal"],
      ["Proteína", vacio(c.proteina_g) ? null : fmt(c.proteina_g, 1) + " g"], ["Carbohidratos", vacio(c.carbos_g) ? null : fmt(c.carbos_g, 1) + " g"],
      ["Grasa", vacio(c.grasa_g) ? null : fmt(c.grasa_g, 1) + " g"], ["Valores", c.estimado === true || c.estimado === "true" ? "estimados" : "exactos"]
    ]), botonBorrar("comidas", c.id)));
  }
  function detalleEjercicio(e) {
    abrirHoja(cap(e.tipo), h("div", { style: "display:flex;flex-direction:column;gap:6px" }, lineas([
      ["Duración", e.duracion_min ? fmt(e.duracion_min) + " min" : null], ["Calorías", vacio(e.kcal) ? null : fmt(e.kcal) + " kcal"],
      ["Fuente", e.fuente], ["Notas", e.notas]
    ]), botonBorrar("ejercicio", e.id)));
  }
  /** Cambia el nombre de un ejercicio en TODAS sus series guardadas (agrega la serie con el nombre nuevo y borra la vieja). */
  function renombrarEjercicio(viejo, nuevo, boton) {
    if (estado.version >= 5) {
      var n = estado.tablas.series_gym.filter(function (s) { return claveEj(s.ejercicio) === claveEj(viejo); }).length;
      boton.disabled = true; boton.textContent = "Cambiando…";
      return renombrarEnServicio(viejo, nuevo).then(function () {
        guardarCache(); cerrarHoja();
        aviso("Listo: " + plural(n, "serie cambiada", "series cambiadas") + " a «" + nuevo + "»");
        cargar();
      }).catch(function (e) { boton.disabled = false; manejarError(e); });
    }
    var k = sinTildes(viejo);
    var lista = estado.tablas.series_gym.filter(function (s) { return sinTildes(s.ejercicio) === k && s.id; });
    var total = lista.length, hechos = 0, fallos = 0, parar = null;
    boton.disabled = true; boton.textContent = "Cambiando 0 de " + total + "…";
    function trabajador() {
      if (parar || !lista.length) return Promise.resolve();
      var s = lista.shift();
      var fila = { fecha: s.fecha, rutina: s.rutina, ejercicio: nuevo, numero_serie: s.numero_serie, peso_kg: s.peso_kg, repeticiones: s.repeticiones };
      return api("agregar", { tabla: "series_gym", fila: fila })
        .then(function () { return api("borrar", { tabla: "series_gym", id: s.id }); })
        .catch(function (e) { if (e && e.noAutorizado) parar = e; else fallos++; })
        .then(function () { hechos++; boton.textContent = "Cambiando " + hechos + " de " + total + "…"; return trabajador(); });
    }
    return Promise.all([trabajador(), trabajador()]).then(function () {
      if (parar) throw parar;
      var pers = leerPersonal(), kv = sinTildes(viejo).trim();
      if (pers[kv] && !fallos) { pers[sinTildes(nuevo).trim()] = pers[kv]; delete pers[kv]; guardarPersonal(pers); }
      cerrarHoja();
      aviso(fallos ? "Cambié " + (total - fallos) + " y fallaron " + fallos + ". Revisa y vuelve a intentar." : "Listo: " + plural(total, "serie cambiada", "series cambiadas") + " a «" + nuevo + "»", !!fallos);
      cargar();
    }).catch(function (e) { boton.disabled = false; manejarError(e); });
  }

  function detalleGym(g) {
    var cuantas = estado.tablas ? estado.tablas.series_gym.filter(function (s) { return sinTildes(s.ejercicio) === sinTildes(g.ejercicio); }).length : 0;
    var nombre = h("input", { id: "f-nuevo-nombre", type: "text", value: g.ejercicio, "aria-label": "Nombre nuevo del ejercicio", maxlength: 80 });
    var btnNombre = h("button", { class: "btn lima", type: "button", text: "Cambiar el nombre en " + plural(cuantas, "serie", "series"), onclick: function () {
      var nuevo = nombre.value.trim();
      if (!nuevo || sinTildes(nuevo) === sinTildes(g.ejercicio) && nuevo === g.ejercicio) return aviso("Escribe el nombre nuevo.", true);
      if (!confirm("¿Cambiar «" + g.ejercicio + "» por «" + nuevo + "» en " + plural(cuantas, "serie", "series") + " de todas las fechas?")) return;
      renombrarEjercicio(g.ejercicio, nuevo, btnNombre);
    } });
    abrirHoja(g.ejercicio, h("div", { style: "display:flex;flex-direction:column;gap:6px" },
      g.rutina ? h("p", { class: "ayuda", text: "Rutina: " + g.rutina }) : null,
      estado.tablas ? h("details", { class: "avanzado" }, h("summary", { text: "La foto no es la correcta: cambiar el nombre del ejercicio" }),
        h("p", { class: "ayuda", text: "La foto se busca por el nombre. Escribe el nombre exacto de Smart Fit (por ejemplo «Cristos Invertidos En Maquina»). Se cambia en todas las fechas." }),
        nombre, btnNombre) : null,
      h("div", { class: "lista" }, g.series.map(function (s) {
        return h("div", { class: "item" },
          h("div", { class: "t" }, h("b", { text: "Serie " + fmt(s.numero_serie) }), h("span", { text: fmt(s.peso_kg, 1) + " kg × " + fmt(s.repeticiones) + " repeticiones" })),
          h("button", { class: "mini-btn", "aria-label": "Borrar serie " + fmt(s.numero_serie), text: "Borrar", onclick: function (ev) {
            var b = ev.currentTarget;
            if (!confirm("¿Borrar esta serie?")) return;
            b.disabled = true;
            api("borrar", { tabla: "series_gym", id: s.id }).then(function () { cerrarHoja(); aviso("Serie borrada"); cargar(); })
              .catch(function (e) { b.disabled = false; manejarError(e); });
          } }));
      }))));
  }

  // ---------- Registros repetidos ----------
  /** Registros iguales (mismo día, tipo, descripción y cifras). De cada grupo se deja el primero que se guardó. */
  function buscarRepetidos() {
    var res = { grupos: [], sobran: [], kcal: 0 };
    if (!estado.tablas) return res;
    // Las series de gym no se revisan: varias series con el mismo peso y repeticiones son lo normal
    ["comidas", "ejercicio"].forEach(function (tabla) {
      var porClave = {};
      estado.tablas[tabla].forEach(function (x) {
        if (!x.id || !x.fecha) return;
        var k = huellaRegistro(Object.assign({}, x, { tabla: tabla }));
        (porClave[k] = porClave[k] || []).push(x);
      });
      Object.keys(porClave).forEach(function (k) {
        var l = porClave[k];
        if (l.length < 2) return;
        l.sort(function (x, y) { return String(x.creado_en || "") < String(y.creado_en || "") ? -1 : 1; });
        res.grupos.push({ tabla: tabla, registro: l[0], veces: l.length });
        l.slice(1).forEach(function (x) { res.sobran.push({ tabla: tabla, id: x.id }); if (tabla === "comidas") res.kcal += Number(x.kcal) || 0; });
      });
    });
    res.grupos.sort(function (x, y) { return x.registro.fecha < y.registro.fecha ? -1 : 1; });
    return res;
  }
  function textoRepetido(g) {
    var x = g.registro;
    if (g.tabla === "comidas") return corta(x.fecha) + " · " + cap(x.tipo_comida || "") + ": " + x.descripcion + " · " + fmt(x.kcal) + " kcal";
    if (g.tabla === "ejercicio") return corta(x.fecha) + " · Ejercicio: " + cap(x.tipo || "") + (x.duracion_min ? " · " + fmt(x.duracion_min) + " min" : "") + (vacio(x.kcal) ? "" : " · " + fmt(x.kcal) + " kcal");
    return corta(x.fecha) + " · Gym: " + x.ejercicio + " · serie " + fmt(x.numero_serie) + ": " + fmt(x.peso_kg, 1) + " kg × " + fmt(x.repeticiones);
  }
  /** Aviso amarillo cuando hay repetidos (en Hoy y en Progreso). */
  function bandaRepetidos() {
    var r = buscarRepetidos();
    if (!r.sobran.length) return null;
    return h("div", { class: "banda banda-rep" },
      h("span", { class: "banda-ico", "aria-hidden": "true" }, icono("alerta", 18)),
      h("div", { class: "banda-t" }, h("b", { text: "Hay " + plural(r.sobran.length, "registro repetido", "registros repetidos") }),
        h("span", { text: r.kcal ? "Suman " + fmt(r.kcal) + " kcal de más en tus totales." : "Hacen que tus totales salgan más altos." })),
      h("button", { class: "btn lima", text: "Revisar", onclick: abrirRepetidos }));
  }
  function abrirRepetidos() {
    var r = buscarRepetidos();
    var dias = estado.desde ? Math.round((deISO(hoy) - deISO(estado.desde)) / 86400000) : DIAS_CARGADOS;
    if (!r.sobran.length) {
      abrirHoja("Registros repetidos", h("div", {}, h("p", { class: "ayuda", text: "✓ No encontré registros repetidos en los últimos " + dias + " días." })));
      return;
    }
    var btn = h("button", { class: "btn peligro", text: "Borrar " + plural(r.sobran.length, "repetido", "repetidos") });
    btn.addEventListener("click", function () {
      if (!confirm("¿Borrar " + plural(r.sobran.length, "registro repetido", "registros repetidos") + "? Se deja uno de cada uno.")) return;
      btn.disabled = true;
      var pendientes = r.sobran.slice(), hechos = 0, fallos = 0, parar = null, total = pendientes.length;
      btn.textContent = "Borrando 0 de " + total + "…";
      function trabajador() {
        if (parar || !pendientes.length) return Promise.resolve();
        var x = pendientes.shift();
        return api("borrar", { tabla: x.tabla, id: x.id }).catch(function (e) { if (e && e.noAutorizado) parar = e; else fallos++; })
          .then(function () { hechos++; btn.textContent = "Borrando " + hechos + " de " + total + "…"; return trabajador(); });
      }
      Promise.all([trabajador(), trabajador(), trabajador()]).then(function () {
        if (parar) throw parar;
        cerrarHoja();
        aviso(fallos ? "Borré " + (total - fallos) + "; " + fallos + " no se pudieron borrar. Inténtalo otra vez." : plural(total, "repetido borrado", "repetidos borrados"), !!fallos);
        cargar();
      }).catch(function (e) { btn.disabled = false; manejarError(e); });
    });
    abrirHoja("Registros repetidos", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Encontré " + plural(r.sobran.length, "registro", "registros") + " de más" + (r.kcal ? " (" + fmt(r.kcal) + " kcal)" : "") +
        ": la misma comida, ejercicio o serie guardada varias veces el mismo día. Al borrar se deja uno de cada uno; no se toca nada más." }),
      btn,
      h("div", { class: "lista" }, r.grupos.map(function (g) {
        return h("div", { class: "item" }, h("div", { class: "t" }, h("b", { text: textoRepetido(g) }), h("span", { text: "Guardado " + g.veces + " veces · se borran " + (g.veces - 1) })));
      }))));
  }

  // ---------- Fotos de la biblioteca (Free Exercise DB) ----------
  var BD_EJ = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
  var MUSC_EN = { chest: "pecho", lats: "espalda", "middle back": "espalda", "lower back": "espalda", traps: "espalda", shoulders: "hombros", biceps: "biceps", triceps: "triceps",
    forearms: "antebrazo", abdominals: "abdomen", quadriceps: "cuadriceps", hamstrings: "femorales", glutes: "gluteos", adductors: "aductores", abductors: "gluteos", calves: "pantorrillas", neck: "hombros" };
  var EQUIPOS = [["", "Todos"], ["machine", "Máquina"], ["cable", "Polea"], ["dumbbell", "Mancuernas"], ["barbell", "Barra"], ["body only", "Peso corporal"]];
  var PALABRAS_BUSQUEDA = { maquina: "machine", selectorizada: "machine", polea: "cable", mancuerna: "dumbbell", mancuernas: "dumbbell", barra: "barbell", abdominal: "crunch", abdominales: "crunch",
    jalon: "pulldown", remo: "row", sentadilla: "squat", prensa: "leg press", pierna: "leg", curl: "curl", biceps: "biceps", triceps: "triceps", hombro: "shoulder", pecho: "chest", espalda: "back",
    cristos: "fly", invertidos: "reverse", apertura: "fly", elevacion: "raise", lateral: "lateral", frontal: "front", martillo: "hammer", fondos: "dips", plancha: "plank", gluteo: "glute", pantorrilla: "calf" };
  var bdEjercicios = null;
  function cargarBD() {
    if (bdEjercicios) return Promise.resolve(bdEjercicios);
    return fetch(BD_EJ).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function (l) { bdEjercicios = l; return l; });
  }

  function leerPersonal() { try { return JSON.parse(leerLocal("ejercicios_personal") || "{}") || {}; } catch (e) { return {}; } }
  function guardarPersonal(o) { guardarLocal("ejercicios_personal", JSON.stringify(o)); }

  function nombresEjercicios() {
    var cuenta = {};
    (estado.tablas ? estado.tablas.series_gym : []).forEach(function (s) {
      var n = String(s.ejercicio || "").trim(); if (!n) return;
      var k = sinTildes(n); (cuenta[k] = cuenta[k] || { nombre: n, n: 0 }).n++;
    });
    return Object.keys(cuenta).map(function (k) { return cuenta[k]; }).sort(function (a, b) { return a.nombre < b.nombre ? -1 : 1; });
  }

  /** Buscador de las ~800 fotos de la biblioteca (Free Exercise DB), dentro del editor del ejercicio. */
  function elegirFotoBD(alElegir) {
    var resultados = h("div", { class: "grid-fotos", "aria-live": "polite" });
    var buscar = h("input", { id: "f-buscar-foto", type: "search", placeholder: "Busca (por ejemplo: crunch, fly, press, machine)", "aria-label": "Buscar foto" });
    var estadoBD = h("p", { class: "ayuda", text: "" });
    var filtro = { grupo: "", equipo: "" };
    var chipsGrupo = h("div", { class: "chips" }), chipsEquipo = h("div", { class: "chips" });
    function pintarChips() {
      chipsGrupo.textContent = ""; chipsEquipo.textContent = "";
      [["", "Todos"]].concat(Object.keys(GRUPOS).map(function (g) { return [g, GRUPOS[g]]; })).forEach(function (g) {
        chipsGrupo.appendChild(h("button", { type: "button", class: g[0] === filtro.grupo ? "on" : "", text: g[1], onclick: function () { filtro.grupo = g[0]; pintarChips(); mostrar(); } }));
      });
      EQUIPOS.forEach(function (q) {
        chipsEquipo.appendChild(h("button", { type: "button", class: q[0] === filtro.equipo ? "on" : "", text: q[1], onclick: function () { filtro.equipo = q[0]; pintarChips(); mostrar(); } }));
      });
    }
    function mostrar() {
      resultados.textContent = "";
      if (!bdEjercicios) return;
      var q = sinTildes(buscar.value).split(/\s+/).filter(Boolean).map(function (w) { return PALABRAS_BUSQUEDA[w] || w; }).join(" ").split(/\s+/);
      var hallados = bdEjercicios.filter(function (e) {
        if (filtro.equipo && e.equipment !== filtro.equipo) return false;
        if (filtro.grupo && !(e.primaryMuscles || []).some(function (m) { return MUSC_EN[m] === filtro.grupo; })) return false;
        var nom = e.name.toLowerCase();
        return q.every(function (w) { return !w || nom.indexOf(w) >= 0; });
      });
      if (!hallados.length) { resultados.appendChild(h("p", { class: "ayuda", text: "No encontré nada. Prueba con otra palabra o quita un filtro." })); return; }
      hallados.slice(0, 60).forEach(function (e) {
        resultados.appendChild(h("button", { type: "button", class: "foto-op", "aria-label": "Usar la foto de " + e.name, onclick: function () { alElegir(e); } },
          h("img", { src: FOTOS_EJ + e.images[0], alt: "", loading: "lazy" }), h("span", { text: e.name })));
      });
      if (hallados.length > 60) resultados.appendChild(h("p", { class: "ayuda", text: "Hay " + hallados.length + " resultados; se muestran 60. Afina la búsqueda." }));
    }
    buscar.addEventListener("input", mostrar);
    var caja = h("div", { class: "graf buscador-bd" }, h("p", { class: "ayuda", text: "Las fotos de la biblioteca tienen nombres en inglés; puedes buscar en español (remo, polea, máquina…)." }), buscar, chipsGrupo, chipsEquipo, estadoBD, resultados);
    var cargada = false;
    caja.abrir = function () {
      if (cargada) return;
      cargada = true; pintarChips(); estadoBD.textContent = "Cargando fotos…";
      cargarBD().then(function () { estadoBD.textContent = "Toca la foto que sí es:"; mostrar(); }, function () { cargada = false; estadoBD.textContent = "No pude cargar las fotos. Revisa tu internet e inténtalo otra vez."; });
      setTimeout(function () { buscar.focus(); }, 50);
    };
    return caja;
  }

  // ---------- Ajustes ----------
  function abrirDireccion() {
    var actual = urlServicio();
    var entrada = h("input", { type: "url", id: "f-servicio", placeholder: "https://script.google.com/macros/s/…/exec", value: actual.indexOf("TU-ID") >= 0 ? "" : actual });
    var err = h("p", { class: "error" });
    abrirHoja("Dirección del servicio", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Pega la «URL de la aplicación web» de tu implementación (Apps Script → Implementar → Administrar implementaciones). Se guarda en este dispositivo; no hace falta tocar GitHub." }),
      h("label", { for: "f-servicio", text: "Dirección" }), entrada, err,
      h("button", { class: "btn lima", text: "Guardar dirección", onclick: function () {
        var u = entrada.value.trim();
        if (!URL_VALIDA.test(u)) { err.textContent = "La dirección debe empezar con https://script.google.com/macros/s/ y terminar en /exec."; return; }
        guardarLocal("servicio", u);
        olvidarDatos();
        cerrarHoja(); aviso("Dirección guardada");
        if (leerLocal("token")) cargar(); else pantallaEntrada("");
      } }),
      leerLocal("servicio") ? h("button", { class: "btn sec", text: "Volver a la dirección de config.js", onclick: function () {
        borrarLocal("servicio"); olvidarDatos(); cerrarHoja(); inicio();
      } }) : null));
  }

  function abrirAjustes() {
    var m = estado.metas || {};
    var nombres = { proteina_min_g: "Proteína mínima (g)", proteina_max_g: "Proteína máxima (g)", kcal_base: "Calorías base (kcal)", deficit_min_kcal: "Déficit mínimo (kcal)", deficit_max_kcal: "Déficit máximo (kcal)" };
    var pares = Object.keys(nombres).filter(function (k) { return !vacio(m[k]); }).map(function (k) { return [nombres[k], fmt(m[k])]; });
    var viejo = estado.version !== null && estado.version < SERVICIO_REQUERIDO;
    var respaldo = h("textarea", { rows: 6, readonly: true, hidden: true, "aria-label": "Código del servicio" });
    var u = urlServicio();
    var T = estado.tablas;

    var copiarCodigo = h("button", { class: "btn " + (viejo ? "lima" : "sec"), text: "Copiar código del servicio", onclick: function () {
      fetch("apps-script/Code.gs", { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }).then(function (codigo) {
        copiarTexto(codigo, respaldo, "Código copiado. Pégalo en Apps Script (sigue los pasos de abajo).");
      }).catch(function () { aviso("No pude descargar el código. Ábrelo en GitHub: apps-script/Code.gs", true); });
    } });

    // Lo técnico va plegado: solo hace falta si cambia la dirección o hay que actualizar el servicio.
    var avanzado = h("details", { class: "avanzado", open: viejo },
      h("summary", { text: viejo ? "Actualiza tu servicio de Google" : "Opciones avanzadas" }),
      h("div", { style: "display:flex;flex-direction:column;gap:8px;margin-top:8px" },
        lineas([
          ["Servicio de Google", estado.version === null ? "sin conectar" : "versión " + estado.version + (viejo ? " (desactualizado)" : " (al día)")],
          ["Dirección", u ? "…" + u.slice(-18) : "sin configurar"],
          ["Datos en el teléfono", T ? [plural(T.comidas.length, "comida", "comidas"), plural(T.ejercicio.length, "ejercicio", "ejercicios"), plural(T.series_gym.length, "serie", "series"), plural(T.medidas.length, "medida", "medidas")].join(", ") : null]
        ]),
        viejo ? h("p", { class: "ayuda", text: "Copia el código y sigue los pasos. Toma 2 minutos." }) : null,
        copiarCodigo, respaldo,
        h("ol", { class: "pasos" },
          h("li", { text: "Abre tu hoja de Google → menú Extensiones → Apps Script." }),
          h("li", { text: "Haz clic en el código, pulsa Ctrl+A, bórralo y pega el código copiado. Guarda con Ctrl+S." }),
          h("li", { text: "Implementar → Administrar implementaciones → lápiz → en Versión elige «Nueva versión» → Implementar." }),
          h("li", { text: "Vuelve aquí y pulsa «Actualizar datos»." })),
        h("button", { class: "btn sec", text: "Cambiar la dirección del servicio", onclick: abrirDireccion })));

    abrirHoja("Ajustes", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("h4", { text: "Mis metas" }),
      lineas(pares),
      h("p", { class: "ayuda", text: "Se cambian en la pestaña «metas» de tu hoja de Google." }),
      h("button", { class: "btn sec", text: "Actualizar datos", onclick: function () { if (estado.version < 2) estado.version = null; cerrarHoja(); cargar(); } }),
      estado.tablas ? h("button", { class: "btn sec", text: "Buscar registros repetidos", onclick: function () { cerrarHoja(); abrirRepetidos(); } }) : null,
      h("button", { class: "btn peligro", text: "Olvidar contraseña en este dispositivo", onclick: function () { borrarLocal("token"); olvidarDatos(); tokenMemoria = ""; cerrarHoja(); pantallaEntrada(""); } }),
      avanzado
    ));
  }

  // ---------- Inicio ----------
  // Al volver a la app: si cambió el día o pasó un rato, trae los datos nuevos solo.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !tokenMemoria || hojaActual) return;
    var ahora = iso(new Date());
    if (ahora !== hoy) { if (estado.fecha === hoy) estado.fecha = ahora; hoy = ahora; pintar(); cargar({ silencioso: true }); return; }
    if (!estado.cargadoEn || Date.now() - estado.cargadoEn.getTime() > 2 * 60 * 1000) cargar({ silencioso: true });
  });

  function inicio() {
    raiz.textContent = "";
    if (!urlConfigurada()) {
      raiz.appendChild(h("div", { class: "entrada" }, h("h1", { text: "Falta la dirección del servicio" }),
        h("p", { class: "ayuda", text: "Pega la dirección de tu servicio de Google (termina en /exec)." }),
        h("button", { class: "btn lima", text: "Poner la dirección", onclick: abrirDireccion })));
      return;
    }
    tokenMemoria = leerLocal("token");
    if (!tokenMemoria) { pantallaEntrada(""); return; }
    if (!estado.sesion) {
      estado.sesion = leerSesion();
      if (estado.sesion) estado.sesion.ejercicios.forEach(function (e) { e.filas.forEach(function (f) { if (f.estado === "guardando") f.estado = "error"; }); });
    }
    var c = leerCache();
    if (c) { usarCache(c); pintar(); cargar({ silencioso: true }); }
    else { pantallaCargando(); cargar(); }
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* la app funciona igual */ });
    // Cuando llega una versión nueva, se usa enseguida (sin esperar a la próxima vez que abras la app)
    var habiaVersion = !!navigator.serviceWorker.controller, recargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!habiaVersion || recargando) return;
      recargando = true;
      if (hojaActual) {
        aviso("Hay una versión nueva de la app: se usará al cerrar esta ventana.");
        hojaActual.addEventListener("close", function () { location.reload(); });
      } else location.reload();
    });
  }
  inicio();
})();
