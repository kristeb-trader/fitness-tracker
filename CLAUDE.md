# Instrucciones para Claude en este repositorio

App personal de seguimiento (comida, ejercicio, peso, cintura, sueño). El dueño no es técnico:
explícale todo en español, en lenguaje claro y sin jerga.

## Cómo publicar cambios

- **El dueño autorizó (8 oct 2026) publicar directo en `main`, sin abrir PR.** GitHub Pages
  publica `main` sola en 2–3 minutos.
- Antes de cada push, corre las pruebas y publica solo si todas pasan:
  - `node tests/servicio.test.js`
  - `node tests/app.e2e.js` (necesita el paquete `playwright` y Chromium)
- Después del push, revisa el resultado del workflow «Pruebas» en GitHub; si sale rojo, arréglalo de inmediato.
- Al terminar, cuéntale al dueño qué cambió y si tiene que hacer algo.

## Cómo está armado

- `apps-script/Code.gs`: servicio de Google mínimo (lee, guarda y borra filas). **Cambiarlo obliga al
  dueño a pegarlo en Apps Script**, así que evítalo: pon la lógica en `app.js`. Si es imprescindible,
  sube `VERSION` en `Code.gs` y `SERVICIO_REQUERIDO` en `app.js`, y mantén la app funcionando con la
  versión anterior (la app muestra el aviso amarillo con los pasos).
- `app.js`: toda la lógica y los cálculos. Si cambias archivos de la app, sube `CACHE` en `sw.js`.
- `config.js`: dirección del servicio del dueño (no es secreta). No la cambies sin que él lo pida.
- Nunca pongas contraseñas, claves de API ni datos personales (edad, peso, estatura) en el repositorio.
