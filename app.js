(function () {
  "use strict";

  var VERSION_APP = 2;
  var SERVICIO_REQUERIDO = 3; // versión de apps-script/Code.gs que espera esta app (3: medición trimestral completa)
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
    grafica: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
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
      medidas: (r.medidas || []).map(filaNormal)
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
    raiz.appendChild(h("div", { class: "cargando-inicio", role: "status" }, h("div", { class: "girando" }), h("p", { text: "Cargando tus datos…" })));
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
      return h("button", { class: "tab" + (activa === clave ? " on" : ""), "aria-label": nombre, onclick: accion }, h("span", { class: "tab-ico", "aria-hidden": "true", text: ico }), nombre);
    };
    var ir = function (p) { return function () { estado.pantalla = p; if (p === "hoy") estado.fecha = estado.fecha > hoy ? hoy : estado.fecha; pintar(); window.scrollTo(0, 0); }; };
    return h("nav", { class: "nav nav5", "aria-label": "Principal" },
      tab("hoy", "Hoy", "🏠", function () { estado.pantalla = "hoy"; irA(iso(new Date())); window.scrollTo(0, 0); }),
      tab("entreno", "Entreno", "🏋️", ir("entreno")),
      h("button", { class: "fab", "aria-label": "Agregar registro", onclick: function () { abrirAgregar(estado.chat ? "chat" : "pegar"); } }, icono("plus", 28)),
      tab("progreso", "Progreso", "📊", ir("progreso")),
      tab("cuerpo", "Cuerpo", "🧍", ir("cuerpo")));
  }

  function pintar() {
    if (estado.pantalla === "progreso") return pintarProgreso();
    if (estado.pantalla === "cuerpo") return pintarCuerpo();
    if (estado.pantalla === "entreno") return pintarEntreno();
    return pintarHoy();
  }

  function bandas() {
    if (estado.version !== null && estado.version < SERVICIO_REQUERIDO) {
      raiz.appendChild(h("div", { class: "banda" },
        h("b", { text: "Actualiza tu servicio de Google" }),
        h("span", { text: "Tiene una versión anterior: para guardar tu medición completa (grasa, músculo, cinta métrica) hay que actualizarlo. Toma 2 minutos." }),
        h("button", { class: "btn lima", text: "Ver cómo", onclick: abrirAjustes })));
    }
    var rep = bandaRepetidos();
    if (rep) raiz.appendChild(rep);
  }

  var EMOJI_COMIDA = { desayuno: ["🍳", "#FFF4D6"], almuerzo: ["🍛", "#E9F7E1"], cena: ["🍲", "#ECEBFD"], snack: ["🍌", "#FDEBE6"] };
  var EMOJI_EJERCICIO = { gym: ["🏋️", "#FFF1E2"], bici: ["🚴", "#E7F0FE"], caminata: ["🚶", "#E9F7E1"] };
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
    raiz.appendChild(h("div", { class: "hero" },
      h("div", { class: "hero-t", text: esHoy ? "Energía de hoy" : "Energía del día" }),
      h("div", { class: "duo" },
        h("div", {}, h("small", { text: "🍽️ Consumido" }), h("b", {}, fmt(consumido), h("span", { text: " kcal" })),
          h("em", { text: plural(d.comidas.length, "comida", "comidas") })),
        h("div", {}, h("small", { text: "🔥 Gastado" }), h("b", {}, fmt(gastado), h("span", { text: " kcal" })),
          h("em", { text: fmt(base) + " base" + (ejercicio ? " + " + fmt(ejercicio) + " ejercicio" : "") }))),
      h("div", { class: "barras-e" },
        h("div", { class: "fila-e" }, h("span", { text: "Consumido" }), h("div", { class: "pista" }, h("div", { style: "width:" + (consumido / maxE * 100).toFixed(1) + "%;background:#0F2A1D" }))),
        h("div", { class: "fila-e" }, h("span", { text: "Gastado" }), h("div", { class: "pista" }, h("div", { style: "width:" + (gastado / maxE * 100).toFixed(1) + "%;background:#2E7D32" })))),
      h("div", { class: "res" },
        h("div", {}, h("b", { text: (balance < 0 ? "−" : balance > 0 ? "+" : "") + fmt(Math.abs(balance)) + " kcal" }),
          h("span", { class: "res-k", text: !d.comidas.length ? "Aún sin comidas" : balance <= 0 ? "Déficit " + (esHoy ? "de hoy" : "del día") : "Superávit " + (esHoy ? "de hoy" : "del día") })),
        h("span", { class: "res-m", text: d.comidas.length && enMeta ? "✓ En tu meta" : "Meta −" + fmt(defMin) + " a −" + fmt(defMax) }))));

    // Macros
    var kT = prot * 4 + carb * 4 + gra * 9 || 1;
    raiz.appendChild(h("div", { class: "macros" },
      h("div", { class: "macro" }, anilloMacro(prot / protMin, "#0F2A1D", Math.round(prot / protMin * 100) + "%"), h("b", { text: fmt(prot) + " g" }), h("small", { text: "Proteína · meta " + fmt(protMin) })),
      h("div", { class: "macro" }, anilloMacro(carb * 4 / kT, "#2FA36B", Math.round(carb * 4 / kT * 100) + "%"), h("b", { text: fmt(carb) + " g" }), h("small", { text: "Carbos · de kcal" })),
      h("div", { class: "macro" }, anilloMacro(gra * 9 / kT, "#F0A43A", Math.round(gra * 9 / kT * 100) + "%"), h("b", { text: fmt(gra) + " g" }), h("small", { text: "Grasa · de kcal" }))));

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
        onclick: function () { if (d.ejercicio.length || grupos.length) { estado.pantalla = "entreno"; estado.semanaEntreno = Math.round((lunesDe(estado.fecha) - lunesDe(hoy)) / 604800000); estado.diaEntreno = estado.fecha; pintar(); window.scrollTo(0, 0); } else abrirAgregar("ejercicio"); } },
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
    function kpi(k, d, valor, unidad, nota) {
      return h("div", { class: "kpi" }, h("span", { class: "k" }, h("span", { text: k }), d),
        h("span", { class: "v" }, valor, unidad ? h("small", { text: " " + unidad }) : null), h("span", { class: "n", text: nota }));
    }
    var tiposTxt = Object.keys(C.tipos).sort(function (x, y) { return C.tipos[y].n - C.tipos[x].n; }).map(function (t) { return C.tipos[t].n + " " + t; }).join(" · ");
    raiz.appendChild(h("div", { class: "kpis" },
      kpi("Proteína", delta(C.registrados ? C.protDia : null, P && P.registrados ? P.protDia : null, 0, "g", true),
        C.registrados ? fmt(C.protDia) : "—", "g/día", C.registrados ? C.diasProt + " de " + C.registrados + " días en meta" : "Sin comidas"),
      kpi("Sueño", delta(C.suenoProm, P ? P.suenoProm : null, 1, "", true),
        C.suenoProm === null ? "—" : fmt(C.suenoProm, 1), C.suenoProm === null ? "" : "h", C.noches ? plural(C.noches8, "noche", "noches") + " de 8 h" : "Sin registrar"),
      kpi("Entrenos", delta(C.sesiones, P ? P.sesiones : null, 0, "", true), String(C.sesiones), "", tiposTxt || "Ninguno"),
      kpi("Quemado", delta(C.quemado, P ? P.quemado : null, 0, "kcal", true), fmt(C.quemado), "kcal", "en ejercicio")));
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
    raiz.appendChild(h("div", { class: "hero-bal hero-cuerpo" },
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
  // [palabras (expresión), foto, músculos principales, secundarios]. Lo más específico va primero.
  var CATALOGO_EJ = [
    [/(crunch|abdomin).*(maquina|selectorizada)|(maquina|selectorizada).*abdomin/, "Ab_Crunch_Machine", ["abdomen"], []],
    [/cristo.*invertid|invertid.*cristo|pajaro.*maquina|maquina.*pajaro|deltoide.*posterior.*maquina|posterior.*maquina|reverse.*fly|apertura.*invertid|peck.*invertid/, "Reverse_Machine_Flyes", ["hombros"], ["espalda"]],
    [/cristo/, "Butterfly", ["pecho"], ["hombros"]],
    [/press.*inclinad|inclinad.*press/, "Barbell_Incline_Bench_Press_-_Medium_Grip", ["pecho"], ["hombros", "triceps"]],
    [/press.*declinad/, "Decline_Barbell_Bench_Press", ["pecho"], ["triceps"]],
    [/press.*(banca|plano).*(mancuerna)|press.*mancuerna.*(pecho|banca)/, "Dumbbell_Bench_Press", ["pecho"], ["triceps", "hombros"]],
    [/press.*(banca|plano)|bench/, "Barbell_Bench_Press_-_Medium_Grip", ["pecho"], ["triceps", "hombros"]],
    [/chest press|press de pecho|press pecho|pecho articulado|press.*maquina.*pecho/, "Leverage_Chest_Press", ["pecho"], ["triceps", "hombros"]],
    [/apertura|peck|pec deck|mariposa|\bfly\b|contractor/, "Butterfly", ["pecho"], []],
    [/cruce|crossover/, "Cable_Crossover", ["pecho"], ["hombros"]],
    [/fondo.*pecho|paralela/, "Dips_-_Chest_Version", ["pecho"], ["triceps"]],
    [/flexion|push ?up/, "Pushups", ["pecho"], ["triceps", "hombros"]],
    [/jalon.*tricep|tricep.*(polea|cuerda|jalon)|pushdown|extension.*tricep|tricep.*extension/, "Triceps_Pushdown", ["triceps"], []],
    [/jalon.*(cerrad|estrech)/, "Close-Grip_Front_Lat_Pulldown", ["espalda"], ["biceps"]],
    [/jalon|pulldown|polea al pecho/, "Wide-Grip_Lat_Pulldown", ["espalda"], ["biceps"]],
    [/remo.*(bajo|sentad|polea|cerrad)/, "Seated_Cable_Rows", ["espalda"], ["biceps"]],
    [/remo.*(pivote|\bt\b|landmine)/, "T-Bar_Row_with_Handle", ["espalda"], ["biceps"]],
    [/remo.*mancuerna|serrucho/, "One-Arm_Dumbbell_Row", ["espalda"], ["biceps"]],
    [/remo/, "Bent_Over_Barbell_Row", ["espalda"], ["biceps"]],
    [/dominada|pull ?up/, "Pullups", ["espalda"], ["biceps"]],
    [/pullover|brazos rectos/, "Straight-Arm_Pulldown", ["espalda"], []],
    [/peso muerto rumano|rumano/, "Romanian_Deadlift", ["femorales"], ["gluteos", "espalda"]],
    [/peso muerto/, "Barbell_Deadlift", ["espalda", "femorales"], ["gluteos"]],
    [/hiperextension|lumbar/, "Hyperextensions_Back_Extensions", ["espalda"], ["gluteos"]],
    [/press.*(militar|hombro)|hombro.*press/, "Dumbbell_Shoulder_Press", ["hombros"], ["triceps"]],
    [/lateral/, "Side_Lateral_Raise", ["hombros"], []],
    [/frontal/, "Front_Dumbbell_Raise", ["hombros"], []],
    [/pajaro|posterior|face pull|vuelo inverso/, "Reverse_Flyes", ["hombros"], ["espalda"]],
    [/encogimiento|trapecio/, "Barbell_Shrug", ["espalda"], []],
    [/martillo/, "Hammer_Curls", ["biceps"], ["antebrazo"]],
    [/predicador|scott/, "Preacher_Curl", ["biceps"], []],
    [/curl.*(femoral|pierna)|femoral/, "Seated_Leg_Curl", ["femorales"], []],
    [/curl|bicep/, "Dumbbell_Bicep_Curl", ["biceps"], ["antebrazo"]],
    [/press frances|rompecraneo/, "EZ-Bar_Skullcrusher", ["triceps"], []],
    [/fondo/, "Bench_Dips", ["triceps"], ["pecho"]],
    [/tricep/, "Triceps_Pushdown", ["triceps"], []],
    [/bulgar|split/, "Split_Squat_with_Dumbbells", ["cuadriceps"], ["gluteos"]],
    [/hack/, "Hack_Squat", ["cuadriceps"], ["gluteos"]],
    [/goblet|copa/, "Goblet_Squat", ["cuadriceps"], ["gluteos"]],
    [/sentadilla.*smith|smith/, "Smith_Machine_Squat", ["cuadriceps"], ["gluteos"]],
    [/sentadilla|squat/, "Barbell_Full_Squat", ["cuadriceps"], ["gluteos", "femorales"]],
    [/prensa/, "Leg_Press", ["cuadriceps"], ["gluteos"]],
    [/extension|cuadricep/, "Leg_Extensions", ["cuadriceps"], []],
    [/zancada|estocada|lunge/, "Dumbbell_Lunges", ["cuadriceps"], ["gluteos"]],
    [/hip thrust|empuje de cadera/, "Barbell_Hip_Thrust", ["gluteos"], ["femorales"]],
    [/puente/, "Barbell_Glute_Bridge", ["gluteos"], ["femorales"]],
    [/abductor/, "Thigh_Abductor", ["gluteos"], []],
    [/aductor/, "Thigh_Adductor", ["aductores"], []],
    [/pantorrilla.*sentad|gemelo.*sentad/, "Seated_Calf_Raise", ["pantorrillas"], []],
    [/pantorrilla|gemelo|talon/, "Standing_Calf_Raises", ["pantorrillas"], []],
    [/plancha/, "Plank", ["abdomen"], []],
    [/elevacion de piernas|colgad/, "Hanging_Leg_Raise", ["abdomen"], []],
    [/rueda/, "Ab_Roller", ["abdomen"], []],
    [/abdomen|abdominal|crunch/, "Crunches", ["abdomen"], []]
  ];
  // Palabras de la rutina o de las notas → grupos (para sesiones guardadas sin series)
  var PALABRAS_GRUPO = [[/pecho|pectoral/, "pecho"], [/espalda|dorsal/, "espalda"], [/hombro/, "hombros"], [/bicep/, "biceps"], [/tricep/, "triceps"],
    [/abdomen|abdominal/, "abdomen"], [/pierna/, "cuadriceps"], [/pierna|femoral/, "femorales"], [/pierna|gluteo/, "gluteos"], [/pantorrilla|gemelo/, "pantorrillas"], [/cuadricep/, "cuadriceps"]];
  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function infoEjercicio(nombre) {
    var t = sinTildes(nombre);
    var propia = leerPersonal()[t.trim()];
    if (propia && propia.foto) return { foto: propia.foto, principales: propia.principales || [], secundarios: propia.secundarios || [] };
    for (var i = 0; i < CATALOGO_EJ.length; i++) if (CATALOGO_EJ[i][0].test(t)) return { foto: CATALOGO_EJ[i][1], principales: CATALOGO_EJ[i][2], secundarios: CATALOGO_EJ[i][3] };
    var g = PALABRAS_GRUPO.filter(function (p) { return p[0].test(t); }).map(function (p) { return p[1]; });
    return { foto: null, principales: g.filter(function (x, k) { return g.indexOf(x) === k; }), secundarios: [] };
  }
  function nombresGrupos(l) { return l.map(function (g) { return GRUPOS[g]; }).join(" · "); }

  /** Visor grande: la foto del ejercicio a pantalla casi completa, con las dos posiciones (1 y 2). */
  function abrirVisorFoto(info, titulo, inicial) {
    var dlg = h("dialog", { class: "visor", "aria-label": "Fotos de " + titulo });
    var n = inicial || 0;
    var img = h("img", { alt: "Posición " + (n + 1) + " de " + titulo, src: FOTOS_EJ + info.foto + "/" + n + ".jpg" });
    var botones = [0, 1].map(function (k) {
      return h("button", { type: "button", class: "visor-n" + (k === n ? " on" : ""), text: String(k + 1), "aria-label": "Ver la posición " + (k + 1) + (k === 0 ? " (inicial)" : " (final)"),
        onclick: function () { ver(k); } });
    });
    function ver(k) {
      n = k; img.src = FOTOS_EJ + info.foto + "/" + k + ".jpg"; img.alt = "Posición " + (k + 1) + " de " + titulo;
      botones.forEach(function (b, q) { b.classList.toggle("on", q === k); });
      txt.textContent = k === 0 ? "Posición inicial" : "Posición final";
    }
    var txt = h("span", { class: "visor-t", text: n === 0 ? "Posición inicial" : "Posición final" });
    img.addEventListener("click", function () { ver(1 - n); });
    dlg.appendChild(h("div", { class: "visor-caja" },
      h("div", { class: "visor-cab" }, h("b", { text: titulo }), h("button", { type: "button", class: "icono-btn", "aria-label": "Cerrar", onclick: function () { dlg.close(); } }, icono("cerrar", 18))),
      img,
      h("div", { class: "visor-pie" }, botones[0], botones[1], txt),
      h("p", { class: "ayuda visor-ayuda", text: "Toca la foto para cambiar de posición." })));
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { if (dlg.parentNode) dlg.parentNode.removeChild(dlg); });
    document.body.appendChild(dlg);
    dlg.showModal();
  }

  /** Foto del ejercicio: al tocarla se abre en grande, con las dos posiciones. Sin foto: un icono. */
  function fotoEjercicio(info, titulo) {
    var caja = h("button", { type: "button", class: "foto-ej", "aria-label": "Ver en grande la foto de " + (titulo || "el ejercicio") });
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
      if (p[0] === "c") s += '<circle cx="' + p[1] + '" cy="' + p[2] + '" r="' + p[3] + '" fill="' + fill + '"/>';
      else if (p[0] === "e") s += '<ellipse cx="' + p[1] + '" cy="' + p[2] + '" rx="' + p[3] + '" ry="' + p[4] + '" fill="' + fill + '" stroke="#fff" stroke-width="1.5">' + tit + "</ellipse>";
      else s += '<rect x="' + p[1] + '" y="' + p[2] + '" width="' + p[3] + '" height="' + p[4] + '" rx="' + p[5] + '" fill="' + fill + '" stroke="#fff" stroke-width="1.5">' + tit + "</rect>";
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
    return h("div", { class: "ej" },
      h("div", { class: "ej-cab" }, fotoEjercicio(info, g.ejercicio),
        h("button", { type: "button", class: "ej-t", "aria-label": "Historial de " + g.ejercicio, onclick: function () { if (e) abrirHistorialEjercicio(e); } },
          h("b", { text: g.ejercicio }), h("div", { class: "ej-m", text: nombresGrupos(info.principales.concat(info.secundarios)) }), badge,
          h("span", { class: "ej-ver", text: "Ver historial ›" }))),
      h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Serie" }), h("th", { text: "Peso" }), h("th", { text: "Reps" }), h("th", { class: "v", text: "vs anterior" }))), h("tbody", {}, filas)),
      h("div", { class: "tot" }, h("span", { text: "Volumen " + fmt(vol) + " kg" }),
        difVol === null ? null : h("span", { class: "badge " + (difVol >= 0 ? "up" : "dn"), text: (difVol >= 0 ? "▲ " : "▼ ") + Math.abs(difVol) + " % vs el " + corta(previa.fecha) }),
        h("button", { type: "button", class: "ej-editar", text: "Editar", onclick: function () { detalleGym(g); } })));
  }

  function datoNotas(notas, re) { var m = sinTildes(notas).match(re); return m ? m[1].replace(/\./g, "").replace(",", ".") : null; }

  function pintarEntreno() {
    raiz.textContent = "";
    bandas();
    encabezado("Tu entrenamiento", "Entreno");
    if (!estado.tablas) { raiz.appendChild(h("div", { class: "vacio", text: "Para ver tu entreno, la app necesita la versión nueva del servicio de Google." })); raiz.appendChild(navegacion("entreno")); return; }
    var T = estado.tablas, hist = historialEjercicios();
    var lunes = sumarDias(iso(lunesDe(hoy)), 7 * (estado.semanaEntreno || 0)), dias = [];
    for (var i = 0; i < 7; i++) dias.push(sumarDias(lunes, i));
    var ejDe = function (f) { return T.ejercicio.filter(function (x) { return x.fecha === f; }); };
    var serDe = function (f) { return T.series_gym.filter(function (x) { return x.fecha === f; }); };
    var EMO = { gym: "💪", bici: "🚴", caminata: "🚶" };

    // Semana: sesiones, tiempo, kcal y kg levantados
    var ses = 0, minutos = 0, kcal = 0, kg = 0, nivelSemana = {}, nivelDia = {};
    var elegido = dias.indexOf(estado.diaEntreno) >= 0 ? estado.diaEntreno : null; // null = toda la semana
    dias.forEach(function (f) {
      var ej = ejDe(f), se = serDe(f), nivel = nivelDia[f] = {};
      ses += ej.length + (se.length && !ej.some(function (x) { return x.tipo === "gym"; }) ? 1 : 0);
      ej.forEach(function (x) { minutos += Number(x.duracion_min) || 0; kcal += Number(x.kcal) || 0; });
      se.forEach(function (s) {
        kg += (Number(s.peso_kg) || 0) * (Number(s.repeticiones) || 0);
        var inf = infoEjercicio(s.ejercicio);
        inf.principales.forEach(function (g) { nivel[g] = (nivel[g] || 0) + 1; });
        inf.secundarios.forEach(function (g) { nivel[g] = (nivel[g] || 0) + 0.5; });
      });
      // Sesiones de gym sin series: se estima con la rutina o las notas (3 series por grupo)
      if (!se.length) ej.filter(function (x) { return x.tipo === "gym"; }).forEach(function (x) {
        infoEjercicio((x.notas || "") + " " + (x.rutina || "")).principales.forEach(function (g) { nivel[g] = (nivel[g] || 0) + 3; });
      });
      Object.keys(nivel).forEach(function (g) { nivelSemana[g] = (nivelSemana[g] || 0) + nivel[g]; });
    });
    var nivel = elegido ? nivelDia[elegido] : nivelSemana;
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
      h("div", { class: "cuerpo-fig" }, figuraCuerpo("frente", nivel), figuraCuerpo("espalda", nivel)),
      leyenda([["#E3E8E0", "Sin trabajar"], ["#B8E68F", "Poco"], ["#2FA36B", "Medio"], ["#0E6B47", "Mucho"]]),
      gruposSem.length ? h("div", { class: "chips-m" }, gruposSem.map(function (g) { return h("span", { text: GRUPOS[g] + " · " + fmt(nivel[g], 0) + " series" }); }))
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

  /** Última medición contra la anterior, dato por dato (cada dato contra su propia medición anterior). */
  function tarjetaComparacion(med) {
    var fechasGrupo = {};
    var filas = function (grupo) {
      return CAMPOS_MEDICION.filter(function (c) { return c[4] === grupo; }).map(function (c) {
        var con = med.lista.filter(function (x) { return !vacio(x[c[0]]); });
        if (!con.length) return null;
        var u = con[con.length - 1], a = con.length > 1 ? con[con.length - 2] : null;
        var vu = Number(u[c[0]]), va = a ? Number(a[c[0]]) : null;
        var fg = fechasGrupo[grupo] = fechasGrupo[grupo] || { u: "", a: "" };
        if (u.fecha > fg.u) fg.u = u.fecha;
        if (a && a.fecha > fg.a) fg.a = a.fecha;
        var unidad = c[2] ? " " + c[2] : "";
        var badge = null;
        if (a) {
          var dl = vu - va, cero = Math.abs(dl) < Math.pow(10, -c[3]) / 2;
          var bueno = c[5] === "sube" ? dl > 0 : c[5] === "baja" ? dl < 0 : null;
          badge = h("span", { class: "delta" + (cero || bueno === null ? "" : bueno ? " up" : " dn"), text: cero ? "=" : (dl > 0 ? "▲ " : "▼ ") + fmt(Math.abs(dl), c[3]) });
        }
        return h("div", { class: "cmp-fila" },
          h("span", { class: "cmp-n", text: c[1] }),
          h("span", { class: "cmp-a", text: a ? fmt(va, c[3]) : "—", title: a ? corta(a.fecha) : "" }),
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
    ["comidas", "ejercicio", "series_gym"].forEach(function (tabla) {
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
    return h("div", { class: "banda" },
      h("b", { text: "Hay " + plural(r.sobran.length, "registro repetido", "registros repetidos") }),
      h("span", { text: r.kcal ? "Suman " + fmt(r.kcal) + " kcal de más en tus totales." : "Hacen que tus totales salgan más altos." }),
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

  // ---------- Ejercicios y fotos (Ajustes) ----------
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

  function abrirEjerciciosFotos() {
    var personal = leerPersonal(), lista = nombresEjercicios();
    abrirHoja("Ejercicios y fotos", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Aquí corriges el nombre de un ejercicio o eliges otra foto. Toca un ejercicio." }),
      lista.length ? h("div", { class: "lista" }, lista.map(function (e) {
        var inf = infoEjercicio(e.nombre), propia = !!personal[sinTildes(e.nombre)];
        var mini = h("span", { class: "emo mini-foto" });
        if (inf.foto) mini.appendChild(h("img", { src: FOTOS_EJ + inf.foto + "/0.jpg", alt: "", loading: "lazy" })); else mini.textContent = "🏋️";
        return h("button", { class: "item con-emo", onclick: function () { abrirEditorEjercicio(e.nombre); } }, mini,
          h("div", { class: "t" }, h("b", { text: e.nombre }), h("span", { text: plural(e.n, "serie", "series") + (propia ? " · foto elegida por ti" : inf.foto ? "" : " · sin foto") })));
      })) : h("div", { class: "vacio", text: "Aún no hay ejercicios de gym registrados." })));
  }

  function abrirEditorEjercicio(nombre) {
    var k = sinTildes(nombre), personal = leerPersonal(), inf = infoEjercicio(nombre);
    var cuantas = estado.tablas.series_gym.filter(function (s) { return sinTildes(s.ejercicio) === k; }).length;
    var campoNombre = h("input", { id: "f-nuevo-nombre", type: "text", value: nombre, maxlength: 80, "aria-label": "Nombre del ejercicio" });
    var btnNombre = h("button", { class: "btn lima", type: "button", text: "Guardar el nombre en " + plural(cuantas, "serie", "series"), onclick: function () {
      var nuevo = campoNombre.value.trim();
      if (!nuevo || nuevo === nombre) return aviso("Escribe un nombre distinto.", true);
      if (!confirm("¿Cambiar «" + nombre + "» por «" + nuevo + "» en " + plural(cuantas, "serie", "series") + " de todas las fechas?")) return;
      renombrarEjercicio(nombre, nuevo, btnNombre);
    } });
    var foto = fotoEjercicio(inf, nombre);
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
    function elegir(e) {
      var pr = [], se = [];
      (e.primaryMuscles || []).forEach(function (m) { if (MUSC_EN[m] && pr.indexOf(MUSC_EN[m]) < 0) pr.push(MUSC_EN[m]); });
      (e.secondaryMuscles || []).forEach(function (m) { if (MUSC_EN[m] && pr.indexOf(MUSC_EN[m]) < 0 && se.indexOf(MUSC_EN[m]) < 0) se.push(MUSC_EN[m]); });
      var p = leerPersonal(); p[k] = { foto: e.id, principales: pr, secundarios: se }; guardarPersonal(p);
      cerrarHoja(); aviso("Foto elegida para «" + nombre + "»"); pintar();
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
        resultados.appendChild(h("button", { type: "button", class: "foto-op", "aria-label": "Usar la foto de " + e.name, onclick: function () { elegir(e); } },
          h("img", { src: FOTOS_EJ + e.images[0], alt: "", loading: "lazy" }), h("span", { text: e.name })));
      });
      if (hallados.length > 60) resultados.appendChild(h("p", { class: "ayuda", text: "Hay " + hallados.length + " resultados; se muestran 60. Afina la búsqueda." }));
    }
    buscar.addEventListener("input", mostrar);
    pintarChips();
    estadoBD.textContent = "Cargando fotos…";
    cargarBD().then(function () { estadoBD.textContent = "Toca la foto que sí es:"; mostrar(); }, function () { estadoBD.textContent = "No pude cargar las fotos. Revisa tu internet e inténtalo otra vez."; });
    var quitar = personal[k] ? h("button", { class: "btn sec", type: "button", text: "Quitar la foto que elegí (volver a la automática)", onclick: function () {
      var p = leerPersonal(); delete p[k]; guardarPersonal(p); cerrarHoja(); aviso("Listo, vuelve la foto automática"); pintar();
    } }) : null;
    abrirHoja(nombre, h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("div", { class: "ej-cab" }, foto, h("div", {}, h("div", { class: "ej-m", text: nombresGrupos(inf.principales.concat(inf.secundarios)) || "Sin músculos definidos" }),
        h("div", { class: "nota", text: personal[k] ? "Foto elegida por ti" : inf.foto ? "Foto automática" : "Sin foto" }))),
      h("h4", { text: "Nombre" }),
      h("p", { class: "ayuda", text: "Escribe el nombre como aparece en Smart Fit. Se cambia en todas las fechas." }),
      campoNombre, btnNombre,
      h("h4", { text: "Foto" }),
      buscar, h("details", { class: "avanzado" }, h("summary", { text: "Filtrar por músculo o equipo" }), chipsGrupo, chipsEquipo), estadoBD, resultados, quitar));
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
        viejo ? h("p", { class: "ayuda", text: "Copia el código y sigue los pasos. Es la última vez que hace falta." }) : null,
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
      estado.tablas ? h("button", { class: "btn sec", text: "Ejercicios y fotos", onclick: function () { cerrarHoja(); abrirEjerciciosFotos(); } }) : null,
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
