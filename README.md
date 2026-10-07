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

1. En GitHub: tu repositorio → **Settings → Pages**.
2. **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
3. En un par de minutos tendrás tu dirección, algo como `https://TU-USUARIO.github.io/fitness-tracker/`.

## Paso 8. Instalarla en el celular

1. Abre la dirección en el celular. La primera vez pide la **contraseña** del Paso 4. Solo se pide una vez por dispositivo.
2. **iPhone (Safari):** botón Compartir → **Añadir a pantalla de inicio**.
3. **Android (Chrome):** menú ⋮ → **Instalar aplicación**.

---

## Cómo se usa

- **Hoy:** anillo con las calorías que te quedan, barra de proteína, carbos y grasa, peso, cintura, sueño, comidas y ejercicio del día. Con las flechas y la tira de días puedes ver otros días.
- **Botón +:** agregar comida, medidas (peso, cintura, sueño) o ejercicio.
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
- El servicio valida cada dato (tipos de comida, rangos, fechas) antes de guardarlo.
- Los datos están en tu cuenta de Google. Nadie más puede abrir la hoja a menos que tú la compartas.
