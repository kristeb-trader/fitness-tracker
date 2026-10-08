# Mi seguimiento: comida, ejercicio, peso, cintura y sueño

Una app personal para el celular. Tus datos viven en **una hoja de Google** tuya, y la app se publica gratis en **GitHub Pages**. No necesitas pagar nada ni instalar programas.

> Fase 1: registrar y ver el resumen del día. Las gráficas de progreso vienen en la siguiente fase.

## Cómo funciona (en simple)

- **Tu hoja de Google** guarda todo, con una pestaña por tema: `comidas`, `ejercicio`, `series_gym`, `medidas` y `metas`. Puedes abrirla y editarla cuando quieras.
- **Un pequeño servicio de Google** (Apps Script) conecta la hoja con la app. Tú lo pegas una sola vez.
- **La app** es una página que se instala en tu celular como cualquier app.
- **La contraseña** vive solo en dos lugares: en tu servicio de Google y en tu celular. No está en este repositorio.

---

## Paso 1. Crear tu hoja

1. Entra a <https://sheets.new> con tu cuenta de Google.
2. Ponle el nombre **Mi seguimiento**.

## Paso 2. Pegar el servicio de Google

1. En la hoja: **Extensiones → Apps Script**.
2. Borra lo que aparece y pega **todo** el contenido del archivo `apps-script/Code.gs` de este repositorio.
3. Pulsa el icono de guardar.

## Paso 3. Crear las pestañas

1. Arriba, en el selector de funciones, elige **setup** y pulsa **Ejecutar**.
2. Google pedirá permiso. Pulsa **Revisar permisos**, elige tu cuenta y, si sale "Google no ha verificado esta app", pulsa **Avanzado → Ir a (nombre del proyecto)**. Es seguro: es tu propio script y solo toca esta hoja.
3. Vuelve a la hoja: ya debes ver las 5 pestañas, con tus metas iniciales en `metas`.

## Paso 4. Crear tu contraseña

1. En Apps Script, menú izquierdo: engranaje **Configuración del proyecto**.
2. Abajo, **Propiedades de la secuencia de comandos → Agregar propiedad**.
3. Nombre: `TOKEN`. Valor: una contraseña **larga** (mínimo 16 caracteres, por ejemplo cuatro palabras al azar con números). Guárdala en tu gestor de contraseñas.
4. Guarda.

## Paso 4b. Registrar con ayuda de Claude, sin gastar API (recomendado)

No necesitas configurar nada extra para esto. Funciona con tu plan de Claude y no gasta créditos de la Consola de API.

1. En la app, toca **+** y abre la pestaña **Pegar**.
2. Toca **Copiar instrucciones para Claude** y pégalas **una sola vez** en un chat de Claude (mejor dentro de un Proyecto, para que las recuerde). Las instrucciones traen tus metas desde tu hoja y una línea `Mi perfil: [escribe aquí tu edad, estatura, peso y objetivo]`: cámbiala por tus datos antes de enviar.
3. Desde ahí, cuéntale a Claude lo que comiste, tu peso, tu sueño o tu ejercicio. Él estima calorías y macros, te dice cuánto llevas del día contra tus metas y te devuelve **un bloque de datos** al final.
4. Copia ese bloque, pégalo en la pestaña **Pegar** y toca **Revisar**. Ves la lista de lo que se va a guardar, y si está bien, **Guardar**.

Lo que no se entiende o es inválido no se guarda, y la app te lo avisa. Si pegas algo con datos distintos a los esperados, el servicio rechaza solo ese registro.

## Paso 4c. Chat dentro de la app (opcional, **gasta créditos de la API**)

Esto es otra forma, más cómoda pero con costo: el chat vive dentro de la app y guarda directo, sin copiar y pegar. **Gasta los créditos de la Consola de API** (console.anthropic.com), no tu plan de Claude ni tus créditos de la nube. Si no quieres gastarlos, sáltate este paso: sin la clave el chat no aparece y no cuesta nada.

1. Crea una clave de API en <https://console.anthropic.com> y **fija un límite de gasto mensual**.
2. En Apps Script, en las **Propiedades de la secuencia de comandos** del Paso 4, agrega:
   - `ANTHROPIC_API_KEY` = tu clave de API.
   - (Opcional) `MODELO` = `claude-sonnet-5-5`, que cuesta aproximadamente la mitad que el modelo por defecto (`claude-opus-5-5`). No uses `claude-haiku-4-5`: el código envía un ajuste que ese modelo no admite.
3. Publica una **nueva versión** de la implementación (Implementar → Administrar implementaciones → editar → Nueva versión).

**Costo (estimación):** entre 1 y 2 centavos de dólar por mensaje con el modelo por defecto. Lo que escribes se envía a la API de Claude para estimar los valores.

## Paso 5. Publicar el servicio

1. **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. **Ejecutar como: Yo**. **Quién tiene acceso: Cualquier usuario**.
4. Pulsa **Implementar** y copia la dirección que termina en `/exec`.

> "Cualquier usuario" solo significa que la dirección responde. Sin tu contraseña no devuelve ningún dato. No compartas la dirección ni la contraseña. Si crees que se filtró, cambia el valor de `TOKEN` y listo.
>
> Si algún día cambias `Code.gs`, hay que hacer **Implementar → Administrar implementaciones → editar → Nueva versión**.

## Paso 6. Conectar la app

1. Abre `config.js` y reemplaza `https://script.google.com/macros/s/TU-ID/exec` por la dirección que copiaste.
2. Guarda el cambio en GitHub.

## Paso 7. Publicar la app

En el plan gratis, GitHub Pages solo funciona con un repositorio **público**. Si ves el mensaje "Upgrade or make this repository public to enable Pages", haz esto primero:

1. En GitHub: tu repositorio → **Settings → General**, baja hasta **Danger Zone → Change repository visibility → Make public**, y confirma.

**Qué se ve cuando es público:** el código y este README. No se ven tus datos (viven en tu hoja de Google), ni tu contraseña, ni tu clave de API. La dirección de tu servicio de Google irá en `config.js`: por sí sola no sirve, porque sin tu contraseña no devuelve nada. No escribas en el repositorio datos personales como tu edad, peso o estatura; el perfil se lo escribes a Claude en tu chat.

Luego:

1. **Settings → Pages**.
2. **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
3. En un par de minutos tendrás tu dirección, algo como `https://TU-USUARIO.github.io/fitness-tracker/`.

## Paso 8. Instalarla en el celular

1. Abre la dirección en el celular. La primera vez pide la **contraseña** del Paso 4. Solo se pide una vez por dispositivo.
2. **iPhone (Safari):** botón Compartir → **Añadir a pantalla de inicio**.
3. **Android (Chrome):** menú ⋮ → **Instalar aplicación**.

---

## Si algo falla

La app ahora dice qué pasó. Qué significa cada mensaje:

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| **Falta configurar** | `config.js` todavía tiene la dirección de ejemplo | Pega la dirección de tu servicio de Google (Paso 6) |
| **La contraseña no es correcta.** | El texto no coincide con la propiedad `TOKEN` de Apps Script | Revisa que se llame exactamente `TOKEN`, que tenga 16 caracteres o más y que no tenga espacios; vuelve a escribirla a mano y guarda |
| **No se pudo conectar con tu servicio de Google…** | Sin internet, o la dirección de `config.js` es incorrecta | Revisa tu conexión y que la dirección termine en `/exec` |
| **Tu servicio de Google respondió algo que no es de la app…** | Dirección de una implementación vieja, o acceso mal configurado | En Apps Script: Implementar → Administrar implementaciones; confirma que la dirección es la activa y que **Quién tiene acceso** es **Cualquier usuario** |
| **Los registros están en la hoja pero no salen en la app** | Sheets guardó la fecha como fecha real y una versión anterior del servicio no la reconocía | Pega la última versión de `apps-script/Code.gs` en Apps Script y publica una **Nueva versión** (Implementar → Administrar implementaciones → lápiz → Nueva versión). Los registros que ya tienes empiezan a verse solos |
| **Falta la pestaña … Ejecuta setup()** | No se crearon las pestañas de la hoja | En Apps Script, ejecuta la función `setup` (Paso 3) |

Los mensajes de conexión traen un **Detalle** entre paréntesis. Si necesitas ayuda, copia ese detalle completo. Otra pista útil: en Apps Script, el menú izquierdo **Ejecuciones** muestra cada llamada de la app y, si falló, el error.

## Cómo se usa

- **Hoy:** anillo con las calorías que te quedan, barra de proteína, carbos y grasa, peso, cintura, sueño, comidas y ejercicio del día. Con las flechas y la tira de días puedes ver otros días.
- **Botón +:** abre **Pegar** (registrar con ayuda de tu chat de Claude), los formularios de comida, medidas (peso, cintura, sueño) y ejercicio, y el **Chat** si activaste el Paso 4c. En Claude puedes escribir cosas como «desayuno 3 huevos y 2 tostadas», «peso 72,4, cintura 85, dormí 7 horas», «caminata 40 minutos» o «press banca 4 series de 8 con 60 kg».
- **Tocar una comida o un ejercicio:** ver el detalle o borrarlo.
- **Medidas:** un registro por día. Si guardas otra vez el mismo día, solo se actualizan los campos que llenes.
- **Meta de calorías del día** = calorías base + ejercicio del día − déficit promedio. Las cifras se cambian en la pestaña `metas` de tu hoja.

## Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `apps-script/Code.gs` | El servicio de Google: guarda y lee datos, con contraseña |
| `index.html`, `styles.css`, `app.js` | La app |
| `config.js` | La dirección de tu servicio de Google |
| `manifest.webmanifest`, `sw.js`, `icons/` | Lo que permite instalarla en el celular |

## Seguridad en resumen

- Toda petición exige tu contraseña, que se compara en el servicio de Google. Sin ella no se lee ni se escribe nada.
- La contraseña no está en el repositorio: vive en las propiedades de tu proyecto de Apps Script y en tu celular.
- El servicio valida cada dato (tipos de comida, rangos, fechas) antes de guardarlo, también lo que propone el chat.
- Si activas el chat con API (Paso 4c), la clave vive solo en las propiedades de tu proyecto de Apps Script, nunca en el repositorio ni en el celular.
- Los datos están en tu cuenta de Google. Nadie más puede abrir la hoja a menos que tú la compartas.
