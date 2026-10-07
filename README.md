# Mi seguimiento: comida, ejercicio, peso y cintura

Una app personal con dos formas de registrar datos:

1. **Chat con Claude** (la principal): escribes lo que comiste y Claude estima, valida y guarda.
2. **Formulario web** (respaldo): una página sencilla para registrar comida, medidas y ejercicio a mano.

Los datos viven en **Supabase** y la página se publica gratis en **GitHub Pages**.
Todo es para una sola persona.

> Esta es la Fase 1: registrar datos. Las gráficas vienen en la siguiente fase.

---

## Paso 1. Crear tu base de datos en Supabase (≈ 5 min)

1. Entra a <https://supabase.com> y crea una cuenta gratis.
2. Pulsa **New project**. Ponle un nombre (por ejemplo `seguimiento`), elige una contraseña para la base de datos (guárdala en tu gestor de contraseñas, no aquí) y la región más cercana.
3. Espera a que el proyecto termine de crearse.

## Paso 2. Crear las tablas

1. En Supabase, menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `schema.sql` de este repositorio, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe decir "Success". Si lo ejecutas dos veces no pasa nada: no borra datos.
4. Comprueba en **Table Editor** que ves 5 tablas: `comidas`, `ejercicio`, `series_gym`, `medidas`, `metas`. En `metas` ya vienen tus metas iniciales.

## Paso 3. Crear tu usuario y cerrar la puerta

1. **Authentication → Users → Add user → Create new user**. Escribe tu email y marca **Auto Confirm User**. No hace falta contraseña real: entrarás con un enlace por correo.
2. **Authentication → Sign In / Providers** (o *Settings*): **desactiva "Allow new users to sign up"**. Así nadie más puede crear cuenta. **Este paso es importante para tu seguridad.**
3. **Authentication → URL Configuration**: en **Site URL** pon la dirección de tu página (la tendrás en el Paso 5, algo como `https://TU-USUARIO.github.io/fitness-tracker/`). Puedes volver aquí después.

## Paso 4. Conectar la página con tu base de datos

1. En Supabase: **Project Settings → API**. Copia la **Project URL** y la clave **publishable** (también puede llamarse *anon public*).
2. Abre `config.js` y reemplaza los dos valores de ejemplo.

Esas dos claves son públicas por diseño: no pasa nada porque estén en el repositorio. Lo que protege tus datos son las reglas de la base de datos. **Nunca pegues la clave `service_role` ni ninguna "secret key" en el repositorio.**

## Paso 5. Publicar la página

1. En GitHub: tu repositorio → **Settings → Pages**.
2. En **Build and deployment**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
3. En un par de minutos tendrás tu dirección. Ábrela, escribe tu email, pulsa **Enviarme el enlace** y abre el correo que te llega.

---

## Registrar con el chat de Claude (la forma cómoda)

1. En Claude (claude.ai), activa el **conector de Supabase** (Configuración → Conectores → Supabase) y autoriza tu proyecto.
2. Abre un chat nuevo y pega este mensaje **una sola vez** para dejarle las reglas:

```
Eres mi asistente de seguimiento. Usa el conector de Supabase de mi proyecto "seguimiento".
Reglas:
- Cuando te cuente una comida, estima kcal, proteína, carbos y grasa. Si no me dio pesos o cantidades exactas, marca estimado = true. Si son datos exactos (etiqueta o gramos pesados), estimado = false.
- Guarda directo en la tabla comidas y luego muéstrame lo que guardaste. Si algo no se entiende o las cantidades parecen raras, pregúntame antes de guardar.
- Tipos de comida válidos: desayuno, almuerzo, cena, snack. Usa la fecha de hoy si no te digo otra.
- Después de guardar, dime el total del día: kcal y proteína contra mis metas (tabla metas). Meta de proteína: 130 a 160 g. Calorías: cerca de mantenimiento (kcal_base más el ejercicio del día) menos 200 a 300 kcal en días normales.
- Peso, cintura y sueño van en la tabla medidas (una fila por día: si ya existe esa fecha, actualízala). Ejercicio va en ejercicio (tipo: gym, bici o caminata; fuente: manual, estimado o strava). Series de gym van en series_gym.
- Nunca borres ni modifiques registros viejos sin que yo te lo pida.
- Responde en español, con unidades en kg, cm y kcal.
```

3. Desde ahí, solo escribe cosas como:
   - "Desayuno: 3 huevos revueltos y 2 tostadas con aguacate"
   - "Peso 72,4, cintura 86, dormí 7 horas"
   - "Caminata de 40 minutos"
   - "Press banca: 4 series de 8 con 60 kg"

Si Claude estima mal una comida, dile "corrige la última a 600 kcal" y la actualiza.

---

## Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `schema.sql` | Crea las 5 tablas y las reglas de seguridad |
| `index.html`, `app.js` | La página con los formularios |
| `config.js` | Tu URL y clave pública de Supabase |

## Seguridad en resumen

- Solo un usuario con sesión iniciada puede leer y escribir datos (RLS activado en todas las tablas).
- Los registros nuevos están desactivados, así que solo existes tú.
- El repositorio no contiene contraseñas ni claves secretas.
- El conector de Claude entra con tu cuenta de Supabase. Autorízalo solo en tu cuenta personal.
