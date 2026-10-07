(function () {
  "use strict";

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
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString("de-DE", { maximumFractionDigits: dec === undefined ? 0 : dec });
  }
  function iso(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function deISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function sumar(lista, campo) { return lista.reduce(function (a, x) { return a + (Number(x[campo]) || 0); }, 0); }
  function corta(s) { var d = deISO(s); return d.getDate() + " " + MESES[d.getMonth()]; }
  function ahoraHHMM() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }

  var toastT;
  function aviso(txt, error) {
    var t = document.getElementById("toast");
    t.textContent = txt;
    t.className = "toast ver" + (error ? " err" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = "toast"; }, 3200);
  }

  // ---------- Contraseña y conexión con Google ----------
  function leerToken() { try { return localStorage.getItem("token") || ""; } catch (e) { return ""; } }
  function guardarToken(t) { try { localStorage.setItem("token", t); } catch (e) { /* sin almacenamiento */ } }
  function borrarToken() { try { localStorage.removeItem("token"); } catch (e) { /* nada */ } }
  var tokenMemoria = "";

  function api(accion, extra, tokenProbar) {
    var cuerpo = Object.assign({ token: tokenProbar || tokenMemoria || leerToken(), accion: accion }, extra || {});
    return fetch(CFG.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita la petición previa que Google no admite
      body: JSON.stringify(cuerpo)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) {
        var e = new Error(j.error || "Error");
        e.noAutorizado = j.error === "No autorizado";
        throw e;
      }
      return j;
    });
  }
  function manejarError(e) {
    if (e && e.noAutorizado) { borrarToken(); tokenMemoria = ""; pantallaEntrada("La contraseña no es correcta."); return; }
    aviso(e && e.message && !/fetch|network|Failed/i.test(e.message) ? e.message : "No hay conexión con tu hoja de Google.", true);
  }

  // ---------- Estado ----------
  var hoy = iso(new Date());
  var estado = { fecha: hoy, datos: null };
  var raiz = document.getElementById("app");

  function pantallaEntrada(mensaje) {
    raiz.textContent = "";
    var campo = h("input", { type: "password", id: "tok", autocomplete: "current-password", placeholder: "Tu contraseña" });
    var err = h("p", { class: "error", text: mensaje || "" });
    var ir = function () {
      var t = campo.value.trim();
      if (!t) return;
      err.textContent = "Comprobando…";
      api("ping", {}, t).then(function () { guardarToken(t); tokenMemoria = t; cargar(); })
        .catch(function (e) { err.textContent = e.noAutorizado ? "La contraseña no es correcta." : "No hay conexión con tu hoja de Google."; });
    };
    campo.addEventListener("keydown", function (e) { if (e.key === "Enter") ir(); });
    raiz.appendChild(h("div", { class: "entrada" },
      h("h1", { text: "Mi seguimiento" }),
      h("p", { class: "ayuda", text: "Escribe la contraseña que creaste en tu hoja de Google. Solo se pide una vez en este dispositivo." }),
      h("label", { for: "tok", text: "Contraseña" }), campo, err,
      h("button", { class: "btn lima", text: "Entrar", onclick: ir })
    ));
  }

  function cargar() {
    raiz.classList.add("cargando");
    return api("dia", { fecha: estado.fecha }).then(function (r) {
      estado.datos = r.datos;
      raiz.classList.remove("cargando");
      pintar();
    }).catch(function (e) { raiz.classList.remove("cargando"); manejarError(e); });
  }

  // ---------- Pantalla "Hoy" ----------
  function lunesDe(fecha) {
    var d = deISO(fecha), dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  }
  function moverSemana(delta) {
    var d = deISO(estado.fecha);
    d.setDate(d.getDate() + 7 * delta);
    var nueva = iso(d);
    estado.fecha = nueva > hoy ? hoy : nueva;
    cargar();
  }

  function tarjetaDia(fecha) {
    var d = deISO(fecha);
    return h("button", { class: "dia" + (fecha === estado.fecha ? " on" : ""), disabled: fecha > hoy, "aria-label": DIAS_LARGO[d.getDay()] + " " + d.getDate(),
      onclick: function () { estado.fecha = fecha; cargar(); } },
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
      var ultimo = i === vals.length - 1;
      barras += '<rect x="' + (i * 19) + '" y="' + (22 - alto).toFixed(1) + '" width="14" height="' + alto.toFixed(1) + '" rx="4" fill="' + (ultimo ? "#E0A02E" : "#F2C879") + '"/>';
    });
    var s = svg(barras, 22, 130);
    s.setAttribute("width", "100%");
    s.setAttribute("viewBox", "0 0 130 22");
    s.setAttribute("stroke", "none");
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", "Peso de los últimos registros");
    return s;
  }

  function pintar() {
    var d = estado.datos, m = d.metas || {};
    var consumido = sumar(d.comidas, "kcal"), prot = sumar(d.comidas, "proteina_g");
    var carb = sumar(d.comidas, "carbos_g"), gra = sumar(d.comidas, "grasa_g");
    var extra = sumar(d.ejercicio, "kcal");
    var base = m.kcal_base !== undefined ? m.kcal_base : 2500;
    var deficit = ((m.deficit_min_kcal !== undefined ? m.deficit_min_kcal : 200) + (m.deficit_max_kcal !== undefined ? m.deficit_max_kcal : 300)) / 2;
    var meta = base + extra - deficit;
    var quedan = meta - consumido;
    var protMin = m.proteina_min_g !== undefined ? m.proteina_min_g : 130;

    var hora = new Date().getHours();
    var saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
    var esHoy = estado.fecha === hoy;
    var fd = deISO(estado.fecha);
    var lunes = lunesDe(estado.fecha);
    var diasSemana = [];
    for (var i = 0; i < 7; i++) { var x = new Date(lunes); x.setDate(lunes.getDate() + i); diasSemana.push(iso(x)); }

    var peso = d.medida && d.medida.peso_kg !== null ? d.medida.peso_kg : (d.ultimoPeso ? d.ultimoPeso.peso_kg : null);
    var pesoFecha = d.medida && d.medida.peso_kg !== null ? estado.fecha : (d.ultimoPeso ? d.ultimoPeso.fecha : null);
    var cintura = d.medida && d.medida.cintura_cm !== null ? d.medida.cintura_cm : (d.ultimaCintura ? d.ultimaCintura.cintura_cm : null);
    var sueno = d.medida && d.medida.horas_sueno !== null ? d.medida.horas_sueno : null;

    var puntos = h("div", { class: "puntos", role: "img", "aria-label": sueno === null ? "Sueño sin registrar" : sueno + " horas de sueño" });
    for (var p = 0; p < 8; p++) puntos.appendChild(h("i", { class: sueno !== null && p < Math.round(Math.min(sueno, 8)) ? "on" : "" }));

    var comidas = d.comidas.length
      ? h("div", { class: "carrusel" }, d.comidas.map(function (c) {
          return h("button", { class: "plato", "aria-label": c.tipo_comida + ": " + c.descripcion, onclick: function () { detalleComida(c); } },
            plato(c.tipo_comida), h("b", { text: c.tipo_comida.charAt(0).toUpperCase() + c.tipo_comida.slice(1) }),
            h("div", { class: "desc", text: c.descripcion }),
            h("div", { class: "kcal-chip", text: c.kcal === null ? "sin kcal" : fmt(c.kcal) + " kcal" }));
        }))
      : h("div", { class: "vacio", text: "Aún no hay comidas en este día. Toca el + para agregar." });

    var ejercicio = d.ejercicio.length
      ? h("div", { class: "lista" }, d.ejercicio.map(function (e) {
          return h("button", { class: "item", onclick: function () { detalleEjercicio(e); } },
            h("div", { class: "chip-ico", style: "background:#E8F5D4;color:#2E5A12" }, icono("pesa", 20)),
            h("div", { class: "t" }, h("b", { text: e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1) + (e.duracion_min ? " · " + e.duracion_min + " min" : "") }),
              h("span", { text: (e.kcal !== null ? fmt(e.kcal) + " kcal · " : "") + e.fuente })));
        }))
      : null;

    raiz.textContent = "";
    raiz.appendChild(h("div", { class: "top" },
      h("div", { class: "quien" },
        h("div", { class: "avatar", style: "color:#2E5A12" }, icono("user", 24)),
        h("div", {}, h("div", { class: "sub", text: saludo }),
          h("div", { class: "titulo", text: esHoy ? "Resumen de hoy" : "Resumen del " + DIAS_LARGO[fd.getDay()] + " " + corta(estado.fecha) }))),
      h("button", { class: "icono-btn", "aria-label": "Metas y ajustes", onclick: abrirAjustes }, icono("meta"))
    ));
    raiz.appendChild(h("div", { style: "display:flex;align-items:center;justify-content:space-between" },
      h("button", { class: "icono-btn", "aria-label": "Semana anterior", onclick: function () { moverSemana(-1); } }, icono("atras", 20)),
      h("div", { class: "sub", text: corta(diasSemana[0]) + " – " + corta(diasSemana[6]) }),
      h("button", { class: "icono-btn", "aria-label": "Semana siguiente", disabled: diasSemana[6] >= hoy, onclick: function () { moverSemana(1); } }, icono("sig", 20))
    ));
    raiz.appendChild(h("div", { class: "dias" }, diasSemana.map(tarjetaDia)));

    raiz.appendChild(h("div", { class: "hero" },
      anillo(consumido / meta, fmt(Math.abs(quedan)), quedan >= 0 ? "kcal restantes" : "kcal de más"),
      h("div", { class: "macros" },
        h("div", {}, h("div", { class: "fila" }, h("span", { text: "Proteína" }), h("span", { text: fmt(prot) + " / " + fmt(protMin) + " g" })),
          h("div", { class: "barra" }, h("div", { style: "width:" + Math.min(100, Math.round(prot / protMin * 100)) + "%" }))),
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
    raiz.appendChild(comidas);
    if (ejercicio) {
      raiz.appendChild(h("div", { class: "seccion" }, h("h2", { text: "Ejercicio" })));
      raiz.appendChild(ejercicio);
    }

    raiz.appendChild(h("nav", { class: "nav", "aria-label": "Principal" },
      h("button", { class: "tab on", "aria-label": "Hoy", onclick: function () { estado.fecha = hoy; cargar(); } }, icono("home"), "Hoy"),
      h("button", { class: "fab", "aria-label": "Agregar registro", onclick: function () { abrirAgregar("comida"); } }, icono("plus", 28)),
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
      estado.fecha = f && f <= hoy ? f : estado.fecha;
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
      campo("Tipo de comida", "tipo_comida", { tag: "select", hijos: null, attrs: { required: true } }),
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

  function abrirAgregar(tab) {
    var cuerpo = h("div", {});
    var tabs = h("div", { class: "tabs", role: "tablist" });
    var defs = [["comida", "Comida", formComida], ["medidas", "Medidas", formMedidas], ["ejercicio", "Ejercicio", formEjercicio]];
    function mostrar(clave) {
      cuerpo.textContent = "";
      Array.prototype.forEach.call(tabs.children, function (b, i) { b.className = defs[i][0] === clave ? "on" : ""; b.setAttribute("aria-selected", defs[i][0] === clave); });
      cuerpo.appendChild(defs.filter(function (x) { return x[0] === clave; })[0][2]());
    }
    defs.forEach(function (x) { tabs.appendChild(h("button", { type: "button", role: "tab", text: x[1], onclick: function () { mostrar(x[0]); } })); });
    abrirHoja("Agregar registro", h("div", { style: "display:flex;flex-direction:column;gap:6px" }, tabs, cuerpo));
    mostrar(tab);
  }

  function lineas(pares) {
    return h("div", { class: "lista" }, pares.filter(function (p) { return p[1] !== null && p[1] !== ""; }).map(function (p) {
      return h("div", { class: "item", style: "justify-content:space-between" }, h("span", { class: "sub", text: p[0] }), h("b", { text: String(p[1]) }));
    }));
  }
  function detalleBase(titulo, pares, tabla, id) {
    var borrar = h("button", { class: "btn peligro", text: "Borrar este registro", onclick: function () {
      if (!confirm("¿Borrar este registro?")) return;
      borrar.disabled = true;
      api("borrar", { tabla: tabla, id: id }).then(function () { cerrarHoja(); aviso("Registro borrado"); cargar(); })
        .catch(function (e) { borrar.disabled = false; manejarError(e); });
    } });
    abrirHoja(titulo, h("div", { style: "display:flex;flex-direction:column;gap:6px" }, lineas(pares), borrar));
  }
  function detalleComida(c) {
    detalleBase(c.tipo_comida.charAt(0).toUpperCase() + c.tipo_comida.slice(1), [
      ["Descripción", c.descripcion], ["Hora", c.hora], ["Calorías", c.kcal === null ? null : fmt(c.kcal) + " kcal"],
      ["Proteína", c.proteina_g === null ? null : fmt(c.proteina_g, 1) + " g"], ["Carbohidratos", c.carbos_g === null ? null : fmt(c.carbos_g, 1) + " g"],
      ["Grasa", c.grasa_g === null ? null : fmt(c.grasa_g, 1) + " g"], ["Valores", c.estimado ? "estimados" : "exactos"]
    ], "comidas", c.id);
  }
  function detalleEjercicio(e) {
    detalleBase(e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1), [
      ["Duración", e.duracion_min ? e.duracion_min + " min" : null], ["Calorías", e.kcal === null ? null : fmt(e.kcal) + " kcal"],
      ["Fuente", e.fuente], ["Notas", e.notas]
    ], "ejercicio", e.id);
  }

  function abrirAjustes() {
    var m = (estado.datos && estado.datos.metas) || {};
    var nombres = { proteina_min_g: "Proteína mínima (g)", proteina_max_g: "Proteína máxima (g)", kcal_base: "Calorías base (kcal)", deficit_min_kcal: "Déficit mínimo (kcal)", deficit_max_kcal: "Déficit máximo (kcal)" };
    var pares = Object.keys(nombres).filter(function (k) { return m[k] !== undefined; }).map(function (k) { return [nombres[k], fmt(m[k])]; });
    abrirHoja("Metas y ajustes", h("div", { style: "display:flex;flex-direction:column;gap:8px" },
      h("p", { class: "ayuda", text: "Las metas se cambian en la pestaña «metas» de tu hoja de Google." }),
      lineas(pares),
      h("p", { class: "ayuda", text: "Meta de calorías del día = calorías base + ejercicio del día − déficit promedio." }),
      h("button", { class: "btn sec", text: "Actualizar", onclick: function () { cerrarHoja(); cargar(); } }),
      h("button", { class: "btn peligro", text: "Olvidar contraseña en este dispositivo", onclick: function () { borrarToken(); tokenMemoria = ""; cerrarHoja(); pantallaEntrada(""); } })
    ));
  }

  // ---------- Inicio ----------
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () { /* la app funciona igual */ });
  }
  if (!CFG.SCRIPT_URL || CFG.SCRIPT_URL.indexOf("TU-ID") >= 0) {
    raiz.appendChild(h("div", { class: "entrada" }, h("h1", { text: "Falta configurar" }),
      h("p", { class: "ayuda", text: "Abre config.js y pega la dirección de tu servicio de Google (README, paso 4)." })));
    return;
  }
  tokenMemoria = leerToken();
  if (!tokenMemoria) pantallaEntrada(""); else cargar();
})();
