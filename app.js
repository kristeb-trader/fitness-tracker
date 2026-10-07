(function () {
  const $ = (id) => document.getElementById(id);
  const msg = $("msg");

  function aviso(texto, error) {
    msg.textContent = texto;
    msg.className = error ? "err" : "";
  }

  const cfg = window.CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("TU-PROYECTO")) {
    aviso("Falta configurar config.js con la URL y la clave pública de Supabase (ver README).", true);
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);

  function hoy() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  // Convierte los campos del formulario en un objeto; vacío -> null, número -> número.
  function leer(form) {
    const o = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") { o[el.name] = el.checked; continue; }
      if (el.value === "") { o[el.name] = null; continue; }
      o[el.name] = el.type === "number" ? Number(el.value) : el.value;
    }
    return o;
  }

  function mostrar(sesion) {
    $("login").classList.toggle("hidden", !!sesion);
    $("app").classList.toggle("hidden", !sesion);
    if (sesion) document.querySelectorAll('input[type="date"]').forEach((i) => { if (!i.value) i.value = hoy(); });
  }

  // --- Sesión ---
  db.auth.getSession().then(({ data }) => mostrar(data.session));
  db.auth.onAuthStateChange((_e, sesion) => mostrar(sesion));

  $("btn-login").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) return aviso("Escribe tu email.", true);
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname }
    });
    aviso(error ? "No se pudo enviar el enlace: " + error.message : "Listo. Revisa tu correo y abre el enlace.", !!error);
  });

  $("btn-logout").addEventListener("click", () => db.auth.signOut());

  // --- Pestañas ---
  document.querySelectorAll(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
      ["comida", "medidas", "ejercicio"].forEach((t) => $("f-" + t).classList.toggle("hidden", t !== b.dataset.tab));
      aviso("");
    })
  );

  // --- Guardar ---
  // soloLlenos: no envía campos vacíos, para no borrar datos ya guardados ese día.
  async function guardar(form, tabla, upsertEn, ok, soloLlenos) {
    let fila = leer(form);
    if (soloLlenos) fila = Object.fromEntries(Object.entries(fila).filter(([, v]) => v !== null));
    const q = upsertEn ? db.from(tabla).upsert(fila, { onConflict: upsertEn }) : db.from(tabla).insert(fila);
    const { error } = await q;
    if (error) return aviso("No se pudo guardar: " + error.message, true);
    aviso(ok);
    const fecha = form.elements.fecha.value;
    form.reset();
    form.elements.fecha.value = fecha;
  }

  $("f-comida").addEventListener("submit", (e) => {
    e.preventDefault();
    guardar(e.target, "comidas", null, "Comida guardada.");
  });
  $("f-medidas").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = leer(e.target);
    if (f.peso_kg == null && f.cintura_cm == null && f.horas_sueno == null) return aviso("Escribe al menos un dato.", true);
    guardar(e.target, "medidas", "fecha", "Medidas guardadas.", true);
  });
  $("f-ejercicio").addEventListener("submit", (e) => {
    e.preventDefault();
    guardar(e.target, "ejercicio", null, "Ejercicio guardado.");
  });
})();
