# Mi seguimiento: comida, ejercicio, peso, cintura y sueño

Una app personal para el celular. Tus datos viven en **una hoja de Google** tuya, y la app se publica gratis en **GitHub Pages**. No necesitas pagar nada ni instalar programas.

> Fase 1: registrar y ver el resumen del día. Las gráficas de progreso vienen en la siguiente fase.

## Cómo funciona (en simple)

- **Tu hoja de Google** guarda todo, con una pestaña por tema: `comidas`, `ejercicio`, `series_gym`, `medidas` y `metas`. Puedes abrirla y editarla cuando quieras.
- **Un pequeño servicio de Google** (Apps Script) conecta la hoja con la app. Solo lee, guarda y borra filas, y entiende cualquier formato de fecha que Sheets use. Lo pegas una vez, y la app te avisa si alguna vez hay que actualizarlo.
- **La app** es una página que se instala en tu celular como cualquier app. Hace todos los cálculos, así que los arreglos llegan solos cuando se fusiona un cambio en GitHub.
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

`setup` se puede ejecutar otra vez sin riesgo: no borra ni cambia las filas que ya tienes. Para revisar tu hoja, ejecuta la función `probar` y mira el **Registro de ejecución**: muestra la versión del servicio y cuántas filas y qué fechas hay en cada pestaña.

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
> Si algún día actualizas `Code.gs`, usa **Implementar → Administrar implementaciones → lápiz → Nueva versión**. No uses «Nueva implementación»: crea una dirección distinta. La app te guía con un botón que copia el código (Ajustes → Actualizar el servicio de Google).

## Paso 6. Conectar la app

Elige una de dos formas:

- **Desde la app (más fácil):** al abrirla la primera vez, si no encuentra la dirección, te la pide. También puedes cambiarla cuando quieras en **Ajustes → Cambiar la dirección del servicio**. Se guarda en ese dispositivo.
- **En GitHub, para todos los dispositivos:** edita `config.js` y reemplaza la dirección. Antes de guardar, revisa que arriba a la izquierda diga la rama **`main`**, que es la que publica GitHub Pages.

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

Primero abre **Ajustes → Estado de la conexión**. Ahí ves la versión de la app y del servicio, la dirección que se está usando y cuántos registros tiene el teléfono.

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| Aviso amarillo **Actualiza tu servicio de Google** | Tu Apps Script tiene una versión anterior | Toca **Ver cómo**: el botón copia el código y te da los pasos |
| **Falta la dirección del servicio** | Ni `config.js` ni el teléfono tienen la dirección | Toca **Poner la dirección** y pega la que termina en `/exec` |
| **La contraseña no es correcta.** | El texto no coincide con la propiedad `TOKEN` | Revisa que se llame exactamente `TOKEN` y tenga 16 caracteres o más. Los espacios al inicio o al final ya no importan |
| **No se pudo conectar con tu servicio de Google…** | Sin internet, o la dirección es incorrecta | Revisa tu conexión y la dirección en Ajustes |
| **Tu servicio de Google respondió algo que no es de la app…** | La dirección es de una implementación vieja o el acceso está mal | En Apps Script: Implementar → Administrar implementaciones. Copia la URL de la implementación activa a la app (Ajustes → Cambiar la dirección) y confirma **Quién tiene acceso: Cualquier usuario** |
| **Falta la pestaña … ejecuta la función setup** | No se crearon las pestañas | En Apps Script, ejecuta `setup` (Paso 3). Es seguro repetirlo |

Los mensajes de conexión traen un **Detalle** entre paréntesis. Si necesitas ayuda, copia ese detalle completo.

## Cómo se usa

- **Hoy:** anillo con las calorías que te quedan, barra de proteína, carbos y grasa, peso, cintura, sueño, comidas, ejercicio y series de gym del día. Con las flechas y la tira de días ves otros días al instante, porque la app trae los últimos 60 días de una vez. Al volver a la app después de un rato, se actualiza sola.
- **Botón +:** abre **Pegar** (registrar con ayuda de tu chat de Claude), los formularios de comida, medidas (peso, cintura, sueño) y ejercicio, y el **Chat** si activaste el Paso 4c. En Claude puedes escribir cosas como «desayuno 3 huevos y 2 tostadas», «peso 72,4, cintura 85, dormí 7 horas», «caminata 40 minutos» o «press banca 4 series de 8 con 60 kg».
- **Tocar una comida, un ejercicio o un ejercicio de gym:** ver el detalle o borrarlo (en gym, serie por serie).
- **Pegar:** si Claude no pone fecha, se guarda en el día que tienes abierto. Acepta fechas como `9/10/2026` y avisa si una fecha es futura. Al guardar, la app te lleva al día de lo guardado.
- **Medidas:** un registro por día. Si guardas otra vez el mismo día, solo se actualizan los campos que llenes.
- **Meta de calorías del día** = calorías base + ejercicio del día − déficit promedio. Las cifras se cambian en la pestaña `metas` de tu hoja.

## Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `apps-script/Code.gs` | El servicio de Google: guarda y lee datos, con contraseña |
| `index.html`, `styles.css`, `app.js` | La app |
| `config.js` | La dirección de tu servicio de Google |
| `manifest.webmanifest`, `sw.js`, `icons/` | Lo que permite instalarla en el celular |
| `tests/` | Pruebas automáticas: el servicio con una hoja simulada y la app completa en un navegador |
| `.github/workflows/pruebas.yml` | Corre las pruebas en cada cambio; si algo se rompe, el PR muestra una ✗ antes de fusionarlo |

## Seguridad en resumen

- Toda petición exige tu contraseña, que se compara en el servicio de Google. Sin ella no se lee ni se escribe nada.
- La contraseña no está en el repositorio: vive en las propiedades de tu proyecto de Apps Script y en tu celular.
- El servicio valida cada dato (tipos de comida, rangos, fechas) antes de guardarlo, también lo que propone el chat.
- Si activas el chat con API (Paso 4c), la clave vive solo en las propiedades de tu proyecto de Apps Script, nunca en el repositorio ni en el celular.
- Los datos están en tu cuenta de Google. Nadie más puede abrir la hoja a menos que tú la compartas.
