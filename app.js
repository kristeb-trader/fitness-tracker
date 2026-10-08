(function () {
  "use strict";

  var VERSION_APP = 2;
  var SERVICIO_REQUERIDO = 2; // versión de apps-script/Code.gs que espera esta app
  var DIAS_CARGADOS = 60;     // la app trae de una vez los últimos 60 días: cambiar de día es instantáneo

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
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>'
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
      var e = new Error(tardo ? "Tu servicio de Google tardó demasiado en responder. Inténtalo de nuevo." : "No se pudo conectar con tu servicio de Google. Revisa tu internet y la dirección del servicio (Ajustes).");
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
        throw e;
      }
      return j;
    }, function (e) { if (reloj) clearTimeout(reloj); throw e; });
  }
  function textoError(e) {
    return ((e && e.message) || "Error") + (e && e.detalle ? " (Detalle: " + e.detalle + ")" : "");
  }
  function manejarError(e) {
    if (e && e.noAutorizado) { borrarLocal("token"); tokenMemoria = ""; pantallaEntrada("La contraseña no es correcta."); return; }
    var msg = textoError(e);
    var enEntrada = document.querySelector(".entrada .error");
    if (enEntrada) enEntrada.textContent = msg;
    aviso(msg, true);
  }

  // ---------- Estado ----------
  var hoy = iso(new Date());
  var estado = {
    fecha: hoy,
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

  /** Trae los datos. Con el servicio nuevo, trae los últimos días de una vez. */
  function cargar() {
    hoy = iso(new Date());
    raiz.classList.add("cargando");
    var paso = estado.version === null
      ? api("ping").then(function (r) { estado.version = Number(r.version) || 1; estado.chat = !!r.chat; })
      : Promise.resolve();
    return paso.then(function () {
      if (estado.version >= 2) {
        var desde = sumarDias(estado.fecha < hoy ? estado.fecha : hoy, -DIAS_CARGADOS);
        return api("leer", { desde: desde }).then(function (r) {
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
        });
      }
      return api("dia", { fecha: estado.fecha }).then(function (r) {
        estado.legado = r.datos;
        estado.metas = (r.datos && r.datos.metas) || {};
        estado.chat = !!(r.datos && r.datos.chat);
        estado.tablas = null;
      });
    }).then(function () {
      estado.cargadoEn = new Date();
      raiz.classList.remove("cargando");
      pintar();
    }).catch(function (e) { raiz.classList.remove("cargando"); manejarError(e); });
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

  function barritasPeso(pesos) {
    if (!pesos.length) return h("div", { class: "nota", text: "Sin registros todavía" });
    var vals = pesos.map(function (p) { return Number(p.peso_kg); });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rango = mx - mn;
    var barras = "";
    vals.forEach(function (v, i) {
      var alto = rango === 0 ? 14 : 6 + ((v - mn) / rango) * 16;
      barras += '<rect x="' + (i * 19) + '" y="' + (22 - alto).toFixed(1) + '" width="14" height="' + alto.toFixed(1) + '" rx="4" fill="' + (i === vals.length - 1 ? "#E0A02E" : "#F2C879") + '"/>';
    });
    var s = svg(barras, 22, 130);
    s.setAttribute("width", "100%");
    s.setAttribute("viewBox", "0 0 130 22");
    s.setAttribute("stroke", "none");
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", "Peso de los últimos registros");
    return s;
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

  function pintar() {
    var d = vistaDia(), m = estado.metas || {};
    var consumido = sumar(d.comidas, "kcal"), prot = sumar(d.comidas, "proteina_g");
    var carb = sumar(d.comidas, "carbos_g"), gra = sumar(d.comidas, "grasa_g");
    var extra = sumar(d.ejercicio, "kcal");
    var num = function (v, def) { return vacio(v) || isNaN(v) ? def : Number(v); };
    var base = num(m.kcal_base, 2500);
    var deficit = (num(m.deficit_min_kcal, 200) + num(m.deficit_max_kcal, 300)) / 2;
    var meta = base + extra - deficit;
    var quedan = meta - consumido;
    var protMin = num(m.proteina_min_g, 130);

    var hora = new Date().getHours();
    var saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
    var esHoy = estado.fecha === hoy;
    var fd = deISO(estado.fecha);
    var lunes = lunesDe(estado.fecha);
    var diasSemana = [];
    for (var i = 0; i < 7; i++) { var x = new Date(lunes); x.setDate(lunes.getDate() + i); diasSemana.push(iso(x)); }

    var peso = d.medida && !vacio(d.medida.peso_kg) ? d.medida.peso_kg : (d.ultimoPeso ? d.ultimoPeso.peso_kg : null);
    var pesoFecha = d.medida && !vacio(d.medida.peso_kg) ? estado.fecha : (d.ultimoPeso ? normFecha(d.ultimoPeso.fecha) : null);
    var cintura = d.medida && !vacio(d.medida.cintura_cm) ? d.medida.cintura_cm : (d.ultimaCintura ? d.ultimaCintura.cintura_cm : null);
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
      h("div", { class: "card" },
        h("div", { class: "cab" }, h("div", { class: "chip-ico", style: "background:#FFF1D6;color:#9A5B00" }, icono("peso", 20)), h("span", { text: "Peso" })),
        h("div", {}, h("div", { class: "valor" }, peso === null ? "—" : fmt(peso, 1), " ", h("small", { text: "kg" })),
          h("div", { class: "nota", text: (cintura === null ? "Cintura sin registrar" : "Cintura " + fmt(cintura, 1) + " cm") + (pesoFecha && pesoFecha !== estado.fecha ? " · al " + corta(pesoFecha) : "") })),
        barritasPeso(d.pesos || [])),
      h("div", { class: "card" },
        h("div", { class: "cab" }, h("div", { class: "chip-ico", style: "background:#E4EEFB;color:#2F6FC0" }, icono("luna", 20)), h("span", { text: "Sueño" })),
        h("div", {}, h("div", { class: "valor" }, sueno === null ? "—" : fmt(sueno, 1), " ", h("small", { text: "h" })),
          h("div", { class: "nota", text: sueno === null ? "Sin registrar" : "de 8 h" })),
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

    raiz.appendChild(h("nav", { class: "nav", "aria-label": "Principal" },
      h("button", { class: "tab on", "aria-label": "Hoy", onclick: function () { irA(iso(new Date())); } }, icono("home"), "Hoy"),
      h("button", { class: "fab", "aria-label": "Agregar registro", onclick: function () { abrirAgregar(estado.chat ? "chat" : "pegar"); } }, icono("plus", 28)),
      h("button", { class: "tab", "aria-label": "Ajustes", onclick: abrirAjustes }, icono("ajustes"), "Ajustes")
    ));
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

  function formMedidas() {
    var btn = h("button", { class: "btn lima", type: "submit", text: "Guardar medidas" });
    var f = h("form", { novalidate: true },
      h("p", { class: "ayuda", text: "Un registro por día. Si guardas otra vez el mismo día, solo se actualizan los campos que llenes." }),
      campo("Fecha", "fecha", { attrs: { type: "date", required: true, max: hoy }, valor: estado.fecha }),
      h("div", { class: "grid2" },
        campo("Peso en ayunas (kg)", "peso_kg", { attrs: { type: "number", min: 20, step: 0.1, inputmode: "decimal" } }),
        campo("Cintura (cm)", "cintura_cm", { attrs: { type: "number", min: 20, step: 0.1, inputmode: "decimal" } })),
      campo("Horas de sueño", "horas_sueno", { attrs: { type: "number", min: 0, max: 24, step: 0.1, inputmode: "decimal" } }),
      btn);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fila = leerForm(f, ["peso_kg", "cintura_cm", "horas_sueno"]);
      if (fila.peso_kg === null && fila.cintura_cm === null && fila.horas_sueno === null) return aviso("Escribe al menos un dato.", true);
      enviar(f, btn, function () { return api("medidas", { fila: fila }); }, "Medidas guardadas");
    });
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
      '{"tabla":"ejercicio","tipo":"caminata","duracion_min":40,"kcal":210,"fuente":"estimado","notas":""}',
      '{"tabla":"series_gym","rutina":"Pecho","ejercicio":"Press banca","numero_serie":1,"peso_kg":60,"repeticiones":8}',
      "",
      "Valores permitidos: tipo_comida = desayuno | almuerzo | cena | snack. tipo (ejercicio) = gym | bici | caminata. fuente = manual | estimado | strava.",
      "En medidas incluye solo lo que te dé. En series_gym, 4 series de 8 con 60 kg son 4 registros (numero_serie 1 a 4).",
      "Ejemplo de bloque final: [ {registro}, {registro} ]. No inventes datos que no te dije."
    ].join("\n");
  }

  var ALIAS_TABLAS = { comidas: "comidas", comida: "comidas", medidas: "medidas", medida: "medidas", ejercicio: "ejercicio", ejercicios: "ejercicio",
    series_gym: "series_gym", serie_gym: "series_gym", series: "series_gym", serie: "series_gym", gym: "series_gym" };

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
    if (datos.length > 50) throw new Error("Son demasiados registros de una vez (máximo 50).");
    return datos;
  }

  /** Limpia un registro pegado: nombre de tabla, fecha (o el día abierto), mayúsculas. */
  function normalizarRegistro(r) {
    if (!r || typeof r !== "object") return null;
    var o = {};
    Object.keys(r).forEach(function (k) { o[String(k).trim()] = typeof r[k] === "string" ? r[k].trim() : r[k]; });
    o.tabla = ALIAS_TABLAS[String(o.tabla || "").toLowerCase()] || "";
    o.fecha = vacio(o.fecha) ? estado.fecha : normFecha(o.fecha);
    if (!vacio(o.hora)) o.hora = normHora(o.hora);
    if (o.tipo_comida) o.tipo_comida = String(o.tipo_comida).toLowerCase();
    if (o.tipo) o.tipo = String(o.tipo).toLowerCase();
    if (o.fuente) o.fuente = String(o.fuente).toLowerCase();
    return o;
  }

  function describirRegistro(r) {
    if (!r || !r.tabla) return { ok: false, texto: "Registro no reconocido" };
    var n = function (v) { return vacio(v) ? "?" : fmt(v, 1); };
    var problema = !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? "fecha no válida" : r.fecha > hoy ? "fecha futura" : "";
    var cuando = r.fecha !== estado.fecha && !problema ? " · " + corta(r.fecha) : "";
    var d;
    if (r.tabla === "comidas") d = { ok: !!(r.tipo_comida && r.descripcion), texto: cap(r.tipo_comida || "?") + ": " + String(r.descripcion || "?") + " · " + n(r.kcal) + " kcal · " + n(r.proteina_g) + " g proteína" + (r.estimado === true || r.estimado === "true" ? " (estimado)" : "") };
    else if (r.tabla === "medidas") {
      var p = [];
      if (!vacio(r.peso_kg)) p.push(n(r.peso_kg) + " kg");
      if (!vacio(r.cintura_cm)) p.push("cintura " + n(r.cintura_cm) + " cm");
      if (!vacio(r.horas_sueno)) p.push(n(r.horas_sueno) + " h de sueño");
      d = { ok: p.length > 0, texto: "Medidas: " + (p.join(" · ") || "sin datos") };
    } else if (r.tabla === "ejercicio") d = { ok: !!r.tipo, texto: "Ejercicio: " + cap(r.tipo || "?") + (r.duracion_min ? " · " + n(r.duracion_min) + " min" : "") + (vacio(r.kcal) ? "" : " · " + n(r.kcal) + " kcal") };
    else d = { ok: !!(r.ejercicio && r.numero_serie), texto: "Gym: " + String(r.ejercicio || "?") + " · serie " + n(r.numero_serie) + ": " + n(r.peso_kg) + " kg × " + n(r.repeticiones) };
    if (problema) { d.ok = false; d.texto += " (" + problema + ")"; }
    d.texto += cuando;
    return d;
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
    var guardar = h("button", { class: "btn", type: "button", text: "Guardar", hidden: true });
    var copiar = h("button", { class: "btn sec", type: "button", text: "Copiar instrucciones para Claude" });
    var respaldo = h("textarea", { rows: 6, readonly: true, hidden: true, "aria-label": "Instrucciones para Claude" });
    var validos = [];

    copiar.addEventListener("click", function () {
      copiarTexto(instruccionesClaude(), respaldo, "Instrucciones copiadas. Pégalas en un chat de Claude.");
    });

    revisar.addEventListener("click", function () {
      vista.textContent = ""; guardar.hidden = true; validos = [];
      var lista;
      try { lista = leerRegistros(area.value); } catch (e) { return aviso(e.message, true); }
      lista.map(normalizarRegistro).forEach(function (r) {
        var d = describirRegistro(r);
        if (d.ok) validos.push(r);
        vista.appendChild(h("div", { class: "item" }, h("div", { class: "t" }, h("b", { text: (d.ok ? "" : "No se guardará: ") + d.texto }))));
      });
      if (validos.length) { guardar.textContent = "Guardar " + validos.length + (validos.length === 1 ? " registro" : " registros"); guardar.hidden = false; }
      else aviso("Ningún registro es válido.", true);
    });

    guardar.addEventListener("click", function () {
      guardar.disabled = true; revisar.disabled = true;
      var res = { ok: 0, fallos: [], fechas: [] };
      validos.reduce(function (cadena, r) {
        return cadena.then(function () {
          return enviarRegistro(r).then(function () { res.ok++; res.fechas.push(r.fecha); }, function (e) {
            if (e && e.noAutorizado) throw e;
            res.fallos.push(describirRegistro(r).texto + " → " + (e && e.message ? e.message : "error"));
          });
        });
      }, Promise.resolve()).then(function () {
        guardar.disabled = false; revisar.disabled = false;
        if (res.ok) {
          // Muestra el día de lo que se guardó
          var ultima = res.fechas.filter(function (f) { return f <= hoy; }).sort().pop();
          if (ultima) estado.fecha = ultima;
          cargar();
        }
        if (!res.fallos.length) { cerrarHoja(); aviso(res.ok + (res.ok === 1 ? " registro guardado" : " registros guardados")); return; }
        aviso("Guardé " + res.ok + " y fallaron " + res.fallos.length + ".", true);
        vista.textContent = "";
        res.fallos.forEach(function (f) { vista.appendChild(h("div", { class: "item" }, h("div", { class: "t" }, h("b", { text: "No se guardó: " + f })))); });
        guardar.hidden = true; area.value = "";
      }).catch(function (e) { guardar.disabled = false; revisar.disabled = false; manejarError(e); });
    });

    return h("div", { class: "chat" },
      h("p", { class: "ayuda", text: "1) Copia las instrucciones y pégalas una vez en un chat de Claude. 2) Cuéntale lo que comiste, tu peso, etc. 3) Copia el bloque de datos que te devuelva y pégalo aquí. Se guarda en el día que tienes abierto: " + corta(estado.fecha) + "." }),
      copiar, respaldo, area, revisar, vista, guardar,
      h("p", { class: "ayuda", text: "Usa tu plan de Claude, no la API. Revisa la lista antes de guardar." }));
  }

  /** Copia un texto; si el navegador no deja, lo muestra para copiarlo a mano. */
  function copiarTexto(texto, respaldo, mensaje) {
    var plan_b = function () { respaldo.value = texto; respaldo.hidden = false; respaldo.focus(); respaldo.select(); aviso("Copia el texto de abajo (Ctrl+C o mantén pulsado)."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { respaldo.hidden = true; aviso(mensaje); }, plan_b);
    else plan_b();
  }

  function abrirAgregar(tab) {
    var cuerpo = h("div", {});
    var tabs = h("div", { class: "tabs", role: "tablist" });
    var defs = (estado.chat ? [["chat", "Chat", formChat]] : []).concat([["pegar", "Pegar", formPegar], ["comida", "Comida", formComida], ["medidas", "Medidas", formMedidas], ["ejercicio", "Ejercicio", formEjercicio]]);
    function mostrar(clave) {
      cuerpo.textContent = "";
      Array.prototype.forEach.call(tabs.children, function (b, i) { b.className = defs[i][0] === clave ? "on" : ""; b.setAttribute("aria-selected", defs[i][0] === clave); });
      cuerpo.appendChild(defs.filter(function (x) { return x[0] === clave; })[0][2]());
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
        estado.version = null; estado.tablas = null;
        cerrarHoja(); aviso("Dirección guardada");
        if (leerLocal("token")) cargar(); else pantallaEntrada("");
      } }),
      leerLocal("servicio") ? h("button", { class: "btn sec", text: "Volver a la dirección de config.js", onclick: function () {
        borrarLocal("servicio"); estado.version = null; estado.tablas = null; cerrarHoja(); inicio();
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

    abrirHoja("Metas y ajustes", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Las metas se cambian en la pestaña «metas» de tu hoja de Google." }),
      lineas(pares),
      h("p", { class: "ayuda", text: "Meta de calorías del día = calorías base + ejercicio del día − déficit promedio." }),

      h("h4", { text: "Estado de la conexión" }),
      lineas([
        ["App", "versión " + VERSION_APP],
        ["Servicio de Google", estado.version === null ? "sin conectar" : "versión " + estado.version + (viejo ? " (desactualizado)" : " (al día)")],
        ["Dirección", u ? "…" + u.slice(-18) + (leerLocal("servicio") ? " (guardada aquí)" : "") : "sin configurar"],
        ["Datos en el teléfono", T ? [plural(T.comidas.length, "comida", "comidas"), plural(T.ejercicio.length, "ejercicio", "ejercicios"), plural(T.series_gym.length, "serie", "series"), plural(T.medidas.length, "medida", "medidas")].join(", ") : null],
        ["Desde", T && estado.desde ? corta(estado.desde) : null],
        ["Última actualización", estado.cargadoEn ? dos(estado.cargadoEn.getHours()) + ":" + dos(estado.cargadoEn.getMinutes()) : null]
      ]),

      h("h4", { text: viejo ? "Tu servicio de Google necesita actualizarse" : "Actualizar el servicio de Google" }),
      h("p", { class: "ayuda", text: viejo
        ? "Es la última vez que hace falta: desde esta versión, los arreglos llegan solos con la app."
        : "Solo si la app te lo pide. Hoy está al día." }),
      copiarCodigo, respaldo,
      h("ol", { class: "pasos" },
        h("li", { text: "Abre tu hoja de Google → menú Extensiones → Apps Script." }),
        h("li", { text: "Haz clic en el código, pulsa Ctrl+A (seleccionar todo), bórralo y pega el código copiado. Guarda con Ctrl+S." }),
        h("li", { text: "Implementar → Administrar implementaciones → lápiz → en Versión elige «Nueva versión» → Implementar." }),
        h("li", { text: "No uses «Nueva implementación»: cambia la dirección. Si ya pasó, pon la dirección nueva abajo." }),
        h("li", { text: "Vuelve aquí y pulsa «Actualizar datos». En «Servicio de Google» debe decir versión " + SERVICIO_REQUERIDO + "." })),

      h("button", { class: "btn sec", text: "Cambiar la dirección del servicio", onclick: abrirDireccion }),
      h("button", { class: "btn sec", text: "Actualizar datos", onclick: function () { estado.version = null; cerrarHoja(); cargar(); } }),
      h("button", { class: "btn peligro", text: "Olvidar contraseña en este dispositivo", onclick: function () { borrarLocal("token"); tokenMemoria = ""; cerrarHoja(); pantallaEntrada(""); } })
    ));
  }

  // ---------- Inicio ----------
  // Al volver a la app: si cambió el día o pasó un rato, trae los datos nuevos solo.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !tokenMemoria || hojaActual) return;
    var ahora = iso(new Date());
    if (ahora !== hoy) { if (estado.fecha === hoy) estado.fecha = ahora; hoy = ahora; cargar(); return; }
    if (!estado.cargadoEn || Date.now() - estado.cargadoEn.getTime() > 2 * 60 * 1000) cargar();
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
    if (!tokenMemoria) pantallaEntrada(""); else cargar();
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* la app funciona igual */ });
  }
  inicio();
})();
