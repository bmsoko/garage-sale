# Garage Sale Córdoba

Sitio en español para vender artículos de casa (bicicletas, muebles, auto
eléctrico para niños, etc.) en Córdoba, Argentina. Cada artículo muestra
foto, estado y un botón de WhatsApp para consultar por ese artículo puntual.

- **Frontend:** HTML/CSS/JS plano (sin build step), servido por un server
  Express minúsculo — pensado para desplegar rápido en **Railway**.
- **Datos e imágenes:** **Supabase** (Postgres + Storage). El frontend lee
  los artículos directo desde la API REST de Supabase con la clave pública
  (`anon`/`publishable`), protegida por Row Level Security (solo lectura).

> Este repo es standalone (una sola app en la raíz) — hermano de
> [`bmsoko/flyer-perritos`](https://github.com/bmsoko/flyer-perritos), donde
> también vive una copia de este código dentro de `garage-sale/`. Los dos no
> comparten historia de git; tratalos como proyectos independientes.

## Estructura

```
.
├── server.js          # Server Express: sirve /public y genera /config.js
├── public/
│   ├── index.html      # Página única (hero + grilla de artículos + footer)
│   └── app.js           # Fetch a Supabase + render de tarjetas + filtros
├── railway.json         # Config de build/deploy para Railway
└── package.json
```

## Supabase — qué ya está creado

Proyecto: **garage-sale** (org `bmsoko`, región `sa-east-1`).

- Tabla `public.items` con RLS habilitado y una policy de **solo lectura
  pública** (`select` para `anon`/`authenticated`). No hay policies de
  insert/update/delete para el rol público — cargar o editar artículos se
  hace desde el **Table Editor** de Supabase Studio (o con la `service_role`
  key desde un script, nunca desde el navegador).
- Columnas de `items`: `sort_order`, `name`, `category`, `description`,
  `condition`, `price`, `currency`, `image_url`, `video_url`,
  `whatsapp_number` (opcional, para pisar el número general en un artículo
  puntual), `is_sold`.
- Bucket de Storage público **`garage-sale-media`** para fotos y videos.
- Ya hay 10 artículos de ejemplo cargados (bicicletas, muebles, auto
  eléctrico) con `image_url = null` — el sitio muestra un placeholder
  ilustrado ("Foto próximamente") hasta que subas la foto real.

### Cómo subir fotos reales (sin tocar código)

1. En Supabase Studio → **Storage** → bucket `garage-sale-media` → subí la
   foto (o video) del artículo.
2. Copiá la URL pública del archivo (botón "Copy URL" o `Get URL`).
3. En **Table Editor** → tabla `items` → pegá esa URL en la columna
   `image_url` (o `video_url`) de la fila correspondiente.
4. Listo — no hace falta redeploy, el sitio la muestra al instante porque
   lee la tabla en cada visita.

### Cómo agregar, editar o borrar un artículo

Todo desde **Table Editor → items** en Supabase Studio: agregar una fila
nueva, cambiar precio/estado/descripción, o marcar `is_sold = true` cuando
se vende (la tarjeta queda tachada con un sello "VENDIDO" pero visible).

## Variables de entorno (Railway)

El sitio funciona "out of the box" con los valores del proyecto Supabase ya
harcodeados como default en `server.js`, pero podés pisarlos con variables
de entorno en Railway (por ejemplo si migrás a otro proyecto de Supabase o
cambiás el número de WhatsApp) sin tocar código:

| Variable | Descripción | Default actual |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://cqtzwiztzvqfoeuqecpb.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave pública (publishable/anon) | (ver `server.js`) |
| `WHATSAPP_NUMBER` | Número de WhatsApp por defecto, formato internacional sin `+` (ej `5493515180599`) | `5493515180599` |
| `SITE_NAME` | Nombre mostrado en el sitio | `Garage Sale Córdoba` |
| `PORT` | Puerto (lo define Railway automáticamente) | `3000` |

La clave `anon`/`publishable` es segura de exponer en el frontend — el
control de acceso real lo hace Row Level Security en Postgres, no el
secreto de la clave.

## Deploy en Railway (pasos manuales, ~5 minutos)

Este agente no tiene una integración directa con Railway, así que estos
pasos los tenés que hacer vos una vez desde el dashboard:

1. Entrá a [railway.app](https://railway.app) → **New Project** → **Deploy
   from GitHub repo** → elegí `bmsoko/garage-sale`.
2. Railway detecta Node automáticamente (Nixpacks) y usa `npm start`
   (definido en `railway.json` y `package.json`). Como el repo es standalone
   (sin subcarpetas), no hace falta tocar el Root Directory — levanta solo.
3. (Opcional) Si querés pisar los defaults, cargá las variables de entorno
   de la tabla de arriba en **Variables**.
4. **Settings → Networking → Generate Domain** para obtener una URL pública
   (o conectar un dominio propio).
5. Cada push a `main` dispara un redeploy automático.

## Correr localmente

```bash
npm install
npm start
# http://localhost:3000
```

## Buenas prácticas aplicadas (resumen)

- **Separación de datos y código:** los artículos viven en Supabase, no en
  el HTML — agregar/editar/marcar vendido no requiere redeploy.
- **RLS por defecto:** la tabla solo permite lectura pública; cualquier
  escritura requiere la `service_role` key (nunca expuesta al navegador).
- **Sin build step:** HTML/CSS/JS plano + Express estático → deploy rápido
  y sin fricción en Railway.
- **Config vía env vars con defaults sensatos:** se puede migrar de
  proyecto Supabase o cambiar el número de WhatsApp sin tocar código.
- **Contenido 100% en español**, pensado para el mercado de Córdoba,
  Argentina, con precios en ARS.
