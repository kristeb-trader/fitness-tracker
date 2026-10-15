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
  var PLATOS = {
    desayuno: '<circle cx="44" cy="44" r="42" fill="#F7F8F5" stroke="#E4E8E0" stroke-width="2"/><circle cx="44" cy="44" r="32" fill="#fff" stroke="#EDF0EA"/><rect x="26" y="30" width="36" height="28" rx="10" fill="#D9A864"/><ellipse cx="43" cy="42" rx="12" ry="9" fill="#fff"/><circle cx="43" cy="42" r="4.5" fill="#F4B400"/><circle cx="56" cy="50" r="4" fill="#D64530"/><circle cx="32" cy="52" r="3.5" fill="#D64530"/>',
    almuerzo: '<circle cx="44" cy="44" r="42" fill="#F7F8F5" stroke="#E4E8E0" stroke-width="2"/><circle cx="44" cy="44" r="32" fill="#5FA23A"/><rect x="30" y="34" width="28" height="18" rx="8" fill="#B9774A" transform="rotate(-12 44 43)"/><circle cx="30" cy="30" r="5" fill="#D64530"/><circle cx="58" cy="58" r="5" fill="#D64530"/><circle cx="56" cy="30" r="4" fill="#E9D96A"/><circle cx="32" cy="58" r="4" fill="#E9D96A"/>',
    cena: '<circle cx="44" cy="44" r="42" fill="#F7F8F5" stroke="#E4E8E0" stroke-width="2"/><circle cx="44" cy="44" r="32" fill="#fff" stroke="#EDF0EA"/><rect x="24" y="34" width="30" height="16" rx="8" fill="#E98A5B" transform="rotate(-10 39 42)"/><circle cx="58" cy="52" r="7" fill="#8CC63F"/><circle cx="34" cy="58" r="5" fill="#E9D96A"/><circle cx="52" cy="30" r="4" fill="#5FA23A"/>',
    snack: '<circle cx="44" cy="44" r="42" fill="#F7F8F5" stroke="#E4E8E0" stroke-width="2"/><circle cx="44" cy="44" r="32" fill="#fff" stroke="#EDF0EA"/><circle cx="36" cy="38" r="6" fill="#3B4A9C"/><circle cx="50" cy="36" r="6" fill="#3B4A9C"/><circle cx="44" cy="48" r="6" fill="#3B4A9C"/><circle cx="56" cy="50" r="5" fill="#D64530"/><circle cx="32" cy="52" r="5" fill="#D64530"/>'
  };

  function svg(inner, size, extra) {
    var t = document.createElement("template");
    t.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + (extra || 24) + " " + (extra || 24) +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
    return t.content.firstChild;
  }
  function icono(nombre, tam) { return svg(ICON[nombre], tam || 22); }
  function plato(tipo) {
    var s = svg(PLATOS[tipo] || PLATOS.snack, 88, 88);
    s.setAttribute("stroke", "none");
    return s;
  }

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
    periodo: 30,     // Progreso: 7, 30, 90, "mes" o "fechas"
    rango: null,     // fechas elegidas a mano {desde, hasta}
    filtroDias: "todos", // "todos", "entreno" o "descanso"
    seccion: "energia",
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

  function tarjetaDia(fecha) {
    var d = deISO(fecha);
    return h("button", { class: "dia" + (fecha === estado.fecha ? " on" : ""), disabled: fecha > hoy, "aria-label": DIAS_LARGO[d.getDay()] + " " + d.getDate(),
      onclick: function () { irA(fecha); } },
      h("span", { text: DIAS_CORTO[(d.getDay() + 6) % 7] }), h("span", { text: String(d.getDate()) }));
  }

  function anillo(pct, centroNum, centroEt) {
    var C = 2 * Math.PI * 60;
    var s = svg('<circle cx="70" cy="70" r="60" stroke="rgba(255,255,255,.45)" stroke-width="12"/><circle cx="70" cy="70" r="60" stroke="#14281E" stroke-width="12" stroke-dasharray="' +
      (Math.max(0, Math.min(1, pct)) * C).toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 70 70)"/>', 140, 140);
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", centroNum + " " + centroEt);
    return h("div", { class: "anillo" }, s,
      h("div", { class: "centro" }, h("div", { class: "num", text: centroNum }), h("div", { class: "et", text: centroEt })));
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
    return h("nav", { class: "nav nav4", "aria-label": "Principal" },
      h("button", { class: "tab" + (activa === "hoy" ? " on" : ""), "aria-label": "Hoy", onclick: function () { estado.pantalla = "hoy"; irA(iso(new Date())); window.scrollTo(0, 0); } }, icono("home"), "Hoy"),
      h("button", { class: "tab" + (activa === "progreso" ? " on" : ""), "aria-label": "Progreso", onclick: function () { estado.pantalla = "progreso"; pintar(); window.scrollTo(0, 0); } }, icono("grafica"), "Progreso"),
      h("button", { class: "fab", "aria-label": "Agregar registro", onclick: function () { abrirAgregar(estado.chat ? "chat" : "pegar"); } }, icono("plus", 28)),
      h("button", { class: "tab", "aria-label": "Ajustes", onclick: abrirAjustes }, icono("ajustes"), "Ajustes"));
  }

  function pintar() {
    if (estado.pantalla === "progreso") return pintarProgreso();
    return pintarHoy();
  }

  function pintarHoy() {
    var d = vistaDia(), m = estado.metas || {};
    var consumido = sumar(d.comidas, "kcal"), prot = sumar(d.comidas, "proteina_g");
    var carb = sumar(d.comidas, "carbos_g"), gra = sumar(d.comidas, "grasa_g");
    var extra = sumar(d.ejercicio, "kcal");
    var meta = metaDia(extra);
    var quedan = meta - consumido;
    var protMin = numMeta(m.proteina_min_g, 130);

    var hora = new Date().getHours();
    var saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
    var esHoy = estado.fecha === hoy;
    var fd = deISO(estado.fecha);
    var lunes = lunesDe(estado.fecha);
    var diasSemana = [];
    for (var i = 0; i < 7; i++) { var x = new Date(lunes); x.setDate(lunes.getDate() + i); diasSemana.push(iso(x)); }

    var med = medicion();
    var sueno = d.medida && !vacio(d.medida.horas_sueno) ? Number(d.medida.horas_sueno) : null;

    var puntos = h("div", { class: "puntos", role: "img", "aria-label": sueno === null ? "Sueño sin registrar" : sueno + " horas de sueño" });
    for (var p = 0; p < 8; p++) puntos.appendChild(h("i", { class: sueno !== null && p < Math.round(Math.min(sueno, 8)) ? "on" : "" }));

    raiz.textContent = "";
    if (estado.version !== null && estado.version < SERVICIO_REQUERIDO) {
      raiz.appendChild(h("div", { class: "banda" },
        h("b", { text: "Actualiza tu servicio de Google" }),
        h("span", { text: "Tiene una versión anterior y por eso algunos registros pueden no verse. Toma 2 minutos." }),
        h("button", { class: "btn lima", text: "Ver cómo", onclick: abrirAjustes })));
    }
    var rep = bandaRepetidos();
    if (rep) raiz.appendChild(rep);
    raiz.appendChild(h("div", { class: "top" },
      h("div", { class: "quien" },
        h("div", { class: "avatar", style: "color:#2E5A12" }, icono("user", 24)),
        h("div", {}, h("div", { class: "sub", text: saludo }),
          h("div", { class: "titulo", text: esHoy ? "Resumen de hoy" : "Resumen del " + DIAS_LARGO[fd.getDay()] + " " + corta(estado.fecha) }))),
      h("button", { class: "icono-btn", "aria-label": "Metas y ajustes", onclick: abrirAjustes }, icono("meta"))
    ));
    raiz.appendChild(h("div", { style: "display:flex;align-items:center;justify-content:space-between" },
      h("button", { class: "icono-btn", "aria-label": "Semana anterior", onclick: function () { irA(sumarDias(estado.fecha, -7)); } }, icono("atras", 20)),
      h("div", { class: "sub", text: corta(diasSemana[0]) + " – " + corta(diasSemana[6]) }),
      h("button", { class: "icono-btn", "aria-label": "Semana siguiente", disabled: diasSemana[6] >= hoy, onclick: function () { irA(sumarDias(estado.fecha, 7)); } }, icono("sig", 20))
    ));
    raiz.appendChild(h("div", { class: "dias" }, diasSemana.map(tarjetaDia)));

    raiz.appendChild(h("div", { class: "hero" },
      anillo(meta > 0 ? consumido / meta : 0, fmt(Math.abs(quedan)), quedan >= 0 ? "kcal restantes" : "kcal de más"),
      h("div", { class: "macros" },
        h("div", {}, h("div", { class: "fila" }, h("span", { text: "Proteína" }), h("span", { text: fmt(prot) + " / " + fmt(protMin) + " g" })),
          h("div", { class: "barra" }, h("div", { style: "width:" + Math.min(100, Math.round(protMin > 0 ? prot / protMin * 100 : 0)) + "%" }))),
        h("div", { class: "fila" }, h("span", { text: "Carbos" }), h("span", { text: fmt(carb) + " g" })),
        h("div", { class: "fila" }, h("span", { text: "Grasa" }), h("span", { text: fmt(gra) + " g" })),
        h("div", { class: "meta", text: "Meta del día: " + fmt(meta) + " kcal" + (extra ? " (incluye ejercicio)" : "") })
      )
    ));

    raiz.appendChild(h("div", { class: "dos" },
      h("button", { type: "button", class: "card tocable" + (med.toca ? " toca" : ""), "aria-label": med.toca ? "Toca medir peso y cintura" : "Medición trimestral de peso y cintura", onclick: function () { abrirAgregar("medidas", { enfocar: "peso_kg" }); } },
        h("div", { class: "cab" }, h("div", { class: "chip-ico", style: "background:#FFF1D6;color:#9A5B00" }, icono("peso", 20)), h("span", { text: "Medición" }), h("span", { class: "mas", "aria-hidden": "true", text: "+" })),
        h("div", {},
          h("div", { class: "valor" }, med.peso ? fmt(med.peso.peso_kg, 1) : "—", " ", h("small", { text: "kg" })),
          h("div", { class: "nota", text: (med.cintura ? "Cintura " + fmt(med.cintura.cintura_cm, 1) + " cm" : "Cintura sin medir") + (med.fecha ? " · " + corta(med.fecha) : "") })),
        h("div", { class: "proxima", text: !med.fecha ? "Toca para medir" : med.toca ? "Ya toca medir" : "Próxima en " + med.faltan + (med.faltan === 1 ? " día" : " días") })),
      h("button", { type: "button", class: "card tocable", "aria-label": "Registrar horas de sueño", onclick: function () { abrirAgregar("medidas", { enfocar: "horas_sueno" }); } },
        h("div", { class: "cab" }, h("div", { class: "chip-ico", style: "background:#E4EEFB;color:#2F6FC0" }, icono("luna", 20)), h("span", { text: "Sueño" }), h("span", { class: "mas", "aria-hidden": "true", text: "+" })),
        h("div", {}, h("div", { class: "valor" }, sueno === null ? "—" : fmt(sueno, 1), " ", h("small", { text: "h" })),
          h("div", { class: "nota", text: sueno === null ? "Toca para registrar" : "de 8 h" })),
        puntos)
    ));

    raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Comidas del día" }), h("span", { text: d.comidas.length ? d.comidas.length + (d.comidas.length === 1 ? " registro" : " registros") : "" })));
    raiz.appendChild(d.comidas.length
      ? h("div", { class: "carrusel" }, d.comidas.map(function (c) {
          return h("button", { class: "plato", "aria-label": c.tipo_comida + ": " + c.descripcion, onclick: function () { detalleComida(c); } },
            plato(c.tipo_comida), h("b", { text: cap(c.tipo_comida) }),
            h("div", { class: "desc", text: c.descripcion }),
            h("div", { class: "kcal-chip", text: vacio(c.kcal) ? "sin kcal" : fmt(c.kcal) + " kcal" }));
        }))
      : h("div", { class: "vacio", text: "Aún no hay comidas en este día. Toca el + para agregar." }));

    if (d.ejercicio.length) {
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Ejercicio" })));
      raiz.appendChild(h("div", { class: "lista" }, d.ejercicio.map(function (e) {
        return h("button", { class: "item", onclick: function () { detalleEjercicio(e); } },
          h("div", { class: "chip-ico", style: "background:#E8F5D4;color:#2E5A12" }, icono(e.tipo === "gym" ? "pesa" : "camina", 20)),
          h("div", { class: "t" }, h("b", { text: cap(e.tipo) + (e.duracion_min ? " · " + fmt(e.duracion_min) + " min" : "") }),
            h("span", { text: (vacio(e.kcal) ? "" : fmt(e.kcal) + " kcal · ") + (e.fuente || "manual") })));
      })));
    }

    var grupos = agruparSeries(d.series);
    if (grupos.length) {
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Gym" }), h("span", { text: d.series.length + (d.series.length === 1 ? " serie" : " series") })));
      raiz.appendChild(h("div", { class: "lista" }, grupos.map(function (g) {
        return h("button", { class: "item", onclick: function () { detalleGym(g); } },
          h("div", { class: "chip-ico", style: "background:#FFF1D6;color:#9A5B00" }, icono("pesa", 20)),
          h("div", { class: "t" }, h("b", { text: g.ejercicio + " · " + g.series.length + (g.series.length === 1 ? " serie" : " series") }),
            h("span", { text: g.series.map(function (s) { return fmt(s.peso_kg, 1) + " kg × " + fmt(s.repeticiones); }).join(" · ") })));
      })));
    }

    raiz.appendChild(navegacion("hoy"));
  }

  // ---------- Pantalla "Progreso" ----------
  var COLOR = { tinta: "#14281E", verde: "#8CC63F", ambar: "#E0A030", banda: "#E8F5D4", rejilla: "#EEF1EB", texto: "#5C6B60", azul: "#4A90E2", azulClaro: "#9DBDE8", deficit: "#2E7D32", cintura: "#2E5A12", lima: "#A8E063" };
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

  function pintarProgreso() {
    raiz.textContent = "";
    raiz.appendChild(h("div", { class: "top" },
      h("div", { class: "quien" },
        h("div", { class: "avatar", style: "color:#2E5A12" }, icono("grafica", 24)),
        h("div", {}, h("div", { class: "sub", text: "Tu avance" }), h("div", { class: "titulo", text: "Progreso" })))));

    if (!estado.tablas) {
      raiz.appendChild(h("div", { class: "banda" }, h("b", { text: "Actualiza tu servicio de Google" }),
        h("span", { text: "Para ver tu progreso, la app necesita la versión nueva del servicio." }),
        h("button", { class: "btn lima", text: "Ver cómo", onclick: abrirAjustes })));
      raiz.appendChild(navegacion("progreso"));
      return;
    }

    var repe = bandaRepetidos();
    if (repe) raiz.appendChild(repe);
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
    var p = estado.periodo;
    var filaFechas = null;
    if (p === "fechas") {
      var rg = estado.rango || { desde: sumarDias(hoy, -29), hasta: hoy };
      var cambiar = function () {
        var d1 = document.getElementById("f-desde").value, d2 = document.getElementById("f-hasta").value;
        if (!d1 || !d2) return;
        estado.rango = { desde: d1 <= d2 ? d1 : d2, hasta: (d1 <= d2 ? d2 : d1) > hoy ? hoy : (d1 <= d2 ? d2 : d1) };
        pintar();
      };
      filaFechas = h("div", { class: "fechas-f" },
        h("label", {}, "Desde", h("input", { type: "date", id: "f-desde", value: rg.desde, max: hoy, onchange: cambiar })),
        h("label", {}, "Hasta", h("input", { type: "date", id: "f-hasta", value: rg.hasta, max: hoy, onchange: cambiar })));
    }
    var fp = estado.filtroDias;
    raiz.appendChild(h("div", { class: "filtros" },
      h("div", { class: "fila-f", role: "group", "aria-label": "Periodo" }, h("span", { class: "lbl", text: "Periodo" }),
        h("div", { class: "pills" },
          [7, 30, 90].map(function (n) { return pill(n + " d", p === n, function () { estado.periodo = n; pintar(); }, n + " días"); }),
          pill("Este mes", p === "mes", function () { estado.periodo = "mes"; pintar(); }),
          pill("Fechas", p === "fechas", function () { estado.periodo = "fechas"; if (!estado.rango) estado.rango = { desde: sumarDias(hoy, -29), hasta: hoy }; pintar(); }, "Elegir fechas"))),
      filaFechas,
      h("div", { class: "fila-f", role: "group", "aria-label": "Días" }, h("span", { class: "lbl", text: "Días" }),
        h("div", { class: "pills" },
          pill("Todos", fp === "todos", function () { estado.filtroDias = "todos"; pintar(); }),
          pill("Con entreno", fp === "entreno", function () { estado.filtroDias = "entreno"; pintar(); }),
          pill("Descanso", fp === "descanso", function () { estado.filtroDias = "descanso"; pintar(); }))),
      h("div", { class: "rango", text: corta(R.ini) + " – " + corta(R.fin) + " · " + R.dias.length + (R.dias.length === 1 ? " día" : " días") })));

    // ¿Faltan datos de esas fechas en el teléfono?
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
    var hayPrevio = estado.desde && estado.desde <= prevIni;
    var P = hayPrevio ? consolidado(prevDias.filter(pasa), porDia) : null;
    raiz.querySelector(".filtros .rango").textContent += " · " + C.registrados + " con comidas";

    // ---- Consolidado (tarjeta verde)
    var kcalF = function (v) { return (v < 0 ? "−" : v > 0 ? "+" : "") + fmt(Math.abs(Math.round(v))); };
    var notaBal;
    if (!C.registrados) notaBal = "Sin comidas registradas en estos días.";
    else {
      var defDia = -C.balanceDia;
      notaBal = "≈ " + fmt(Math.abs(C.balance) / 7700, 1) + " kg de grasa " + (C.balance <= 0 ? "menos" : "más") + " (estimado) · " +
        (defDia >= defMin && defDia <= defMax ? "✓ en tu meta de déficit" : defDia > defMax ? "déficit mayor que tu meta" : defDia > 0 ? "▲ menos déficit que tu meta" : "▲ en superávit");
    }
    raiz.appendChild(h("div", { class: "hero-bal" },
      h("div", { class: "k", text: "Balance del periodo" }),
      h("div", { class: "big" }, C.registrados ? kcalF(C.balance) : "—", h("small", { text: " kcal" })),
      h("div", { class: "sub2", text: notaBal }),
      h("div", { class: "tres" },
        h("div", {}, h("b", { text: C.registrados ? fmt(C.consumidoDia) : "—" }), h("span", { text: "Consumido / día" })),
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
    function kpi(k, d, valor, unidad, nota, barra) {
      return h("div", { class: "kpi" }, h("span", { class: "k" }, h("span", { text: k }), d),
        h("span", { class: "v" }, valor, unidad ? h("small", { text: " " + unidad }) : null), h("span", { class: "n", text: nota }),
        barra === undefined ? null : h("div", { class: "bar-meta" }, h("div", { style: "width:" + Math.round(Math.max(0, Math.min(1, barra)) * 100) + "%" })));
    }
    var tiposTxt = Object.keys(C.tipos).sort(function (a, b) { return C.tipos[b].n - C.tipos[a].n; }).map(function (t) { return C.tipos[t].n + " " + t; }).join(" · ");
    raiz.appendChild(h("div", { class: "kpis" },
      kpi("Proteína promedio", delta(C.registrados ? C.protDia : null, P && P.registrados ? P.protDia : null, 0, "g", true),
        C.registrados ? fmt(C.protDia) : "—", "g/día", C.registrados ? C.diasProt + " de " + C.registrados + " días en la meta" : "Sin comidas", C.registrados ? C.diasProt / C.registrados : 0),
      kpi("Sueño promedio", delta(C.suenoProm, P ? P.suenoProm : null, 1, "", true),
        C.suenoProm === null ? "—" : fmt(C.suenoProm, 1), C.suenoProm === null ? "" : "h", C.noches ? C.noches8 + (C.noches8 === 1 ? " noche" : " noches") + " de 8 h o más" : "Sin registrar"),
      kpi("Entrenamientos", delta(C.sesiones, P ? P.sesiones : null, 0, "", true), String(C.sesiones), "", tiposTxt || "Ninguno"),
      kpi("Quemado en ejercicio", delta(C.quemado, P ? P.quemado : null, 0, "kcal", true), fmt(C.quemado), "kcal",
        C.sesiones ? fmt(C.quemado / C.sesiones) + " kcal por sesión" : "Sin ejercicio")));
    raiz.appendChild(h("div", { class: "nota-centro", text: P ? "▲▼ comparado con los " + prevDias.length + " días anteriores" : "La comparación con el periodo anterior aparece cuando hay datos de esas fechas." }));

    // ---- Secciones
    var sec = estado.seccion;
    raiz.appendChild(h("div", { class: "secciones", role: "tablist" }, [["energia", "Energía"], ["nutricion", "Nutrición"], ["entreno", "Entreno"], ["cuerpo", "Cuerpo"]].map(function (x) {
      return h("button", { type: "button", role: "tab", "aria-selected": x[0] === sec ? "true" : "false", class: x[0] === sec ? "on" : "", text: x[1], onclick: function () { estado.seccion = x[0]; pintar(); } });
    })));

    var ejeX = fechasEje(R.dias), N = R.dias.length;
    var indice = {}; R.dias.forEach(function (f, i) { indice[f] = i; });
    var conComida = diasF.filter(function (f) { return porDia[f] && porDia[f].comidas; });
    var sinDatos = function (t, d) { return tarjetaGraf(t, d || "No hay registros con este filtro."); };
    var ejeKcal = function (t) { return (t < 0 ? "−" : "") + fmt(Math.abs(t)); };

    if (sec === "energia") {
      if (!conComida.length) raiz.appendChild(sinDatos("Gastado vs consumido"));
      else {
        var ptsVs = [], lineaG = [], maxV = 0;
        diasF.forEach(function (f) {
          var d = porDia[f] || VACIO_DIA, g = base + d.ejercicio;
          lineaG.push({ i: indice[f], v: g }); maxV = Math.max(maxV, g);
          if (!d.comidas) return;
          maxV = Math.max(maxV, d.kcal);
          var bal = d.kcal - g;
          ptsVs.push({ i: indice[f], v: d.kcal, color: COLOR.verde,
            txt: fechaLarga(f) + " · comiste " + fmt(d.kcal) + " · gastaste " + fmt(g) + (d.ejercicio ? " (ejercicio " + fmt(d.ejercicio) + ")" : "") + " · " + (bal <= 0 ? "déficit " : "superávit ") + kcalF(bal) });
        });
        var mVs = marcasDe(0, maxV * 1.05, 4);
        raiz.appendChild(tarjetaGraf("Gastado vs consumido", "Barras: lo que comiste · Línea: lo que gastaste (mantenimiento " + fmt(base) + " + ejercicio)", [
          grafica({ tipo: "barras", n: N, puntos: ptsVs, linea: lineaG, min: 0, max: Math.max(mVs[mVs.length - 1], maxV * 1.05), marcas: mVs, fechas: ejeX, izq: 40,
            resumen: "Consumido promedio " + fmt(C.consumidoDia) + ", gastado promedio " + fmt(C.gastadoDia) }),
          leyenda([[COLOR.verde, "Consumido"], [COLOR.tinta, "Gastado", "linea"]])]));

        var ptsB = conComida.map(function (f) {
          var d = porDia[f], bal = d.kcal - (base + d.ejercicio);
          return { i: indice[f], v: bal, color: bal <= 0 ? COLOR.deficit : COLOR.ambar, txt: fechaLarga(f) + ": " + (bal <= 0 ? "déficit " : "superávit ") + kcalF(bal) + " kcal" };
        });
        var absMax = Math.max(defMax * 1.5, Math.max.apply(null, ptsB.map(function (q) { return Math.abs(q.v); })) * 1.1);
        var mB = marcasDe(-absMax, absMax, 4);
        var enMeta = ptsB.filter(function (q) { return -q.v >= defMin && -q.v <= defMax; }).length;
        raiz.appendChild(tarjetaGraf("Balance diario", "Abajo de la línea = déficit (bajas grasa) · arriba = superávit", [
          h("div", { class: "grande" }, ptsB.filter(function (q) { return q.v <= 0; }).length + " de " + ptsB.length, " ", h("small", { text: "días en déficit · " + enMeta + " en tu meta" })),
          grafica({ tipo: "barras", n: N, puntos: ptsB, min: -absMax, max: absMax, marcas: mB, banda: [-defMax, -defMin], cero: true, fechas: ejeX, izq: 40, fmtEje: ejeKcal,
            resumen: "Balance diario: " + enMeta + " días en tu meta de déficit" }),
          leyenda([[COLOR.deficit, "Déficit"], [COLOR.ambar, "Superávit"], [COLOR.banda, "Tu meta: −" + fmt(defMin) + " a −" + fmt(defMax), "borde"]])]));

        var acu = 0, ptsA = conComida.map(function (f) {
          var d = porDia[f]; acu += d.kcal - (base + d.ejercicio);
          return { x: (indice[f] + 0.5) / N, v: acu, txt: "Hasta el " + corta(f) + ": " + kcalF(acu) + " kcal (≈ " + fmt(Math.abs(acu) / 7700, 1) + " kg)" };
        });
        var vals = ptsA.map(function (q) { return q.v; }).concat([0]);
        var mnA = Math.min.apply(null, vals), mxA = Math.max.apply(null, vals), padA = Math.max(200, (mxA - mnA) * 0.12);
        var mA = marcasDe(mnA - padA, mxA + padA, 4);
        raiz.appendChild(tarjetaGraf("Balance acumulado", "Cómo se va sumando tu déficit en el periodo", [
          grafica({ tipo: "linea", puntos: ptsA, min: Math.min(mA[0], mnA - padA), max: Math.max(mA[mA.length - 1], mxA + padA), marcas: mA, unir: true, area: true, cero: true, color: COLOR.cintura, alto: 140, izq: 44,
            fmtEje: ejeKcal, fechas: ejeX, etiquetaFinal: kcalF(acu) + " kcal", resumen: "Balance acumulado " + kcalF(acu) + " kcal", sinPuntos: ptsA.length > 20 })]));
      }
    }

    if (sec === "nutricion") {
      if (!conComida.length) raiz.appendChild(sinDatos("Nutrición"));
      else {
        var ptsP = conComida.map(function (f) {
          var d = porDia[f];
          return { i: indice[f], v: d.prot, color: d.prot < protMin ? COLOR.ambar : COLOR.tinta, txt: fechaLarga(f) + ": " + fmt(d.prot) + " g de proteína" + (d.prot < protMin ? " (faltaron " + fmt(protMin - d.prot) + " g)" : "") };
        });
        var maxP = Math.max(protMax * 1.1, Math.max.apply(null, ptsP.map(function (q) { return q.v; })) * 1.05);
        raiz.appendChild(tarjetaGraf("Proteína por día", "Franja verde: " + fmt(protMin) + " a " + fmt(protMax) + " g", [
          h("div", { class: "grande" }, C.diasProt + " de " + C.registrados, " ", h("small", { text: "días en la meta · promedio " + fmt(C.protDia) + " g" })),
          grafica({ tipo: "barras", n: N, puntos: ptsP, min: 0, max: maxP, marcas: [0, 50, 100, protMin, protMax].filter(function (v, i, a) { return a.indexOf(v) === i && v <= maxP; }).sort(function (a, b) { return a - b; }), banda: [protMin, protMax], fechas: ejeX, resumen: C.diasProt + " de " + C.registrados + " días con la proteína en la meta" }),
          leyenda([[COLOR.tinta, "En la meta"], [COLOR.ambar, "Te faltó"], [COLOR.banda, "Meta", "borde"]])]));

        var kP = C.protDia * 4, kC = C.carbDia * 4, kG = C.graDia * 9, kT = kP + kC + kG || 1;
        var macros = [["Proteína", C.protDia, kP / kT, COLOR.tinta], ["Carbos", C.carbDia, kC / kT, COLOR.verde], ["Grasa", C.graDia, kG / kT, COLOR.ambar]];
        raiz.appendChild(tarjetaGraf("Reparto de macros", "Promedio por día y qué parte de tus calorías viene de cada uno", [
          h("div", { class: "macro", role: "img", "aria-label": macros.map(function (x) { return x[0] + " " + Math.round(x[2] * 100) + "%"; }).join(", ") },
            macros.map(function (x) { return h("div", { style: "width:" + (x[2] * 100).toFixed(1) + "%;background:" + x[3] }); })),
          h("div", { class: "filas" }, macros.map(function (x) {
            return h("div", { class: "r" }, h("span", {}, h("i", { class: "pt", style: "background:" + x[3] }), x[0]), h("b", { text: fmt(x[1]) + " g" }), h("span", { text: Math.round(x[2] * 100) + "%" }));
          }))]));

        var tiposC = ["desayuno", "almuerzo", "cena", "snack"].filter(function (t) { return C.porTipo[t]; });
        Object.keys(C.porTipo).forEach(function (t) { if (tiposC.indexOf(t) < 0) tiposC.push(t); });
        var totC = C.consumido || 1, maxT = Math.max.apply(null, tiposC.map(function (t) { return C.porTipo[t]; }));
        raiz.appendChild(tarjetaGraf("Calorías por comida", "Promedio por día con comidas registradas", [
          h("div", { class: "filas" }, tiposC.map(function (t) {
            return h("div", { class: "r r3" }, h("span", { text: cap(t) }),
              h("div", { class: "t" }, h("div", { style: "width:" + (C.porTipo[t] / maxT * 100).toFixed(1) + "%;background:" + COLOR.verde })),
              h("span", { text: fmt(C.porTipo[t] / C.registrados) + " · " + Math.round(C.porTipo[t] / totC * 100) + "%" }));
          }))]));
      }
    }

    if (sec === "entreno") {
      var tiposE = Object.keys(C.tipos).sort(function (a, b) { return C.tipos[b].n - C.tipos[a].n; });
      if (!tiposE.length) raiz.appendChild(sinDatos("Entrenamientos", "No hay entrenamientos con este filtro."));
      else {
        var maxN = Math.max.apply(null, tiposE.map(function (t) { return C.tipos[t].n; }));
        raiz.appendChild(tarjetaGraf("Sesiones por tipo", C.sesiones + " sesiones · " + fmt(C.quemado) + " kcal quemadas", [
          h("div", { class: "filas" }, tiposE.map(function (t) {
            return h("div", { class: "r r3" }, h("span", { text: cap(t) }),
              h("div", { class: "t" }, h("div", { style: "width:" + (C.tipos[t].n / maxN * 100).toFixed(1) + "%;background:" + COLOR.tinta })),
              h("span", { text: C.tipos[t].n + " · " + fmt(C.tipos[t].kcal) + " kcal" }));
          }))]));
        var ptsQ = diasF.filter(function (f) { return porDia[f] && porDia[f].ejercicio > 0; }).map(function (f) {
          var d = porDia[f];
          return { i: indice[f], v: d.ejercicio, color: COLOR.verde, txt: fechaLarga(f) + ": " + fmt(d.ejercicio) + " kcal · " + d.sesiones.map(function (s) { return s.tipo; }).join(", ") };
        });
        if (ptsQ.length) {
          var maxQ = Math.max.apply(null, ptsQ.map(function (q) { return q.v; })) * 1.1, mQ = marcasDe(0, maxQ, 3);
          raiz.appendChild(tarjetaGraf("Calorías quemadas por día", null, [
            grafica({ tipo: "barras", n: N, puntos: ptsQ, min: 0, max: Math.max(maxQ, mQ[mQ.length - 1]), marcas: mQ, fechas: ejeX, alto: 130, resumen: fmt(C.quemado) + " kcal quemadas en ejercicio" })]));
        }
      }
      raiz.appendChild(tarjetaFuerza(R, diasF, ejeX));
    }

    if (sec === "cuerpo") {
      var med = medicion();
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Medición trimestral" }),
        h("span", { text: !med.fecha ? "" : med.toca ? "Ya toca medir" : "Próxima en " + med.faltan + " días" })));
      raiz.appendChild(tarjetaComparacion(med));
      raiz.appendChild(graficaMedida(med, "peso_kg", "Peso", "kg", COLOR.tinta));
      raiz.appendChild(graficaMedida(med, "grasa_pct", "Grasa corporal", "%", COLOR.ambar));
      raiz.appendChild(graficaMedida(med, "masa_muscular_kg", "Masa muscular", "kg", COLOR.cintura));
      raiz.appendChild(graficaMedida(med, "cintura_cm", "Cintura", "cm", COLOR.tinta));
      if (med.toca && med.fecha) raiz.appendChild(h("button", { class: "btn lima", text: "Registrar medición", onclick: function () { abrirAgregar("medidas", { enfocar: "peso_kg" }); } }));
      var ptsS = diasF.filter(function (f) { return porDia[f] && porDia[f].sueno !== null; }).map(function (f) {
        var d = porDia[f];
        return { i: indice[f], v: d.sueno, color: d.sueno < 6.5 ? COLOR.azulClaro : COLOR.azul, txt: fechaLarga(f) + ": " + fmt(d.sueno, 1) + " h de sueño" };
      });
      if (ptsS.length) {
        raiz.appendChild(tarjetaGraf("Sueño", "Horas por noche · línea en 8 h", [
          h("div", { class: "grande" }, fmt(C.suenoProm, 1) + " h", " ", h("small", { class: C.suenoProm >= 8 ? "bien" : "ojo", text: "promedio" })),
          grafica({ tipo: "barras", n: N, puntos: ptsS, min: 0, max: Math.max(10, Math.ceil(Math.max.apply(null, ptsS.map(function (q) { return q.v; })))), marcas: [0, 4, 6, 8, 10], lineaFija: 8, fechas: ejeX, alto: 130, resumen: "Sueño promedio " + fmt(C.suenoProm, 1) + " horas" }),
          leyenda([[COLOR.azul, "6,5 h o más"], [COLOR.azulClaro, "Noche corta"], [COLOR.tinta, "8 h", "linea"]])]));
      } else raiz.appendChild(sinDatos("Sueño", "Sin registros de sueño con este filtro."));
    }

    raiz.appendChild(navegacion("progreso"));
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
    if (!nombres.length) return tarjetaGraf("Gym: tu fuerza", "Sin series de gym con este filtro.");
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
    var tendencia = ptsG.length < 2 ? "" : ultimo > primero ? "▲ subiendo" : ultimo < primero ? "▼ bajando" : "= igual";
    return tarjetaGraf("Gym: tu fuerza", "Peso máximo de cada sesión", [
      h("div", { class: "chips" }, nombres.slice(0, 8).map(function (n) {
        return h("button", { type: "button", class: n === elegido ? "on" : "", text: n, onclick: function () { estado.gymEjercicio = n; pintar(); } });
      })),
      h("div", { class: "grande" }, ptsG.length > 1 ? fmt(primero, 1) + " → " + fmt(ultimo, 1) + " kg" : fmt(ultimo, 1) + " kg", " ", h("small", { class: ultimo >= primero ? "bien" : "ojo", text: tendencia })),
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
  function detalleGym(g) {
    abrirHoja(g.ejercicio, h("div", { style: "display:flex;flex-direction:column;gap:6px" },
      g.rutina ? h("p", { class: "ayuda", text: "Rutina: " + g.rutina }) : null,
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
