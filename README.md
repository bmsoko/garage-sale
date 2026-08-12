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
├── server.js             # Server Express: helmet (headers de seguridad),
│                          # sirve /public y genera /config.js
├── public/
│   ├── index.html         # Vidriera pública (hero + grilla + footer)
│   ├── app.js               # Fetch a Supabase + render de tarjetas + filtros
│   └── admin/
│       ├── index.html       # Panel de administración (login + dashboard)
│       └── app.js             # Login por magic link + CRUD de artículos
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

### Cómo subir fotos, agregar o editar artículos

**Forma recomendada — panel de administración (`/admin`)**, ver la sección
siguiente. Subís la foto y editás precio/estado/descripción desde el
navegador, sin tocar Supabase Studio.

**Alternativa — directo en Supabase Studio**, siempre disponible como
respaldo (por ejemplo si no tenés a mano el link mágico):

1. **Storage** → bucket `garage-sale-media` → subí la foto o video.
2. Copiá la URL pública del archivo (botón "Copy URL" / "Get URL").
3. **Table Editor** → tabla `items` → pegá esa URL en `image_url` (o
   `video_url`) de la fila correspondiente. Ahí mismo podés cambiar
   precio, estado, descripción, `is_sold`, o borrar/insertar filas.
4. No hace falta redeploy — el sitio lee la tabla en cada visita.

## Panel de administración (`/admin`)

URL: `https://<tu-dominio-de-railway>/admin/`

Login sin contraseña (magic link por email) + control de acceso por
Row Level Security en la base — no por ocultar la URL. Aunque alguien
adivine `/admin`, no puede escribir nada sin (a) acceso a la casilla de
email autorizada y (b) que ese email esté en la lista blanca de la base.

**Cómo entrar:**
1. Andá a `/admin/`, escribí tu email → **"Enviarme el link mágico"**.
2. Abrí el email y hacé clic en el link — te vuelve a `/admin/` ya logueado.
3. Vas a ver la lista de artículos, cada uno editable inline: nombre,
   categoría, precio, estado, descripción, orden, `video_url`, y un
   checkbox de "Vendido". Subís foto o video con el selector de archivo
   junto a la miniatura — se sube al bucket y actualiza el artículo solo.
4. **"+ Nuevo artículo"** crea una fila en blanco para completar.
5. **"Cerrar sesión"** desloguea; también se desloguea solo a los 20
   minutos de inactividad.

**Cómo funciona la seguridad (resumen técnico):**
- Auth por **magic link de Supabase Auth** (`signInWithOtp`) — nunca hay
  una contraseña que gestionar ni que se pueda filtrar.
- Cualquier email puede *pedir* un link (no hace falta deshabilitar el
  registro), pero solo puede *escribir* datos el email que esté en la
  tabla `public.admins` — hoy solo `sokobruno@gmail.com`.
- Esa verificación la hace una función Postgres `is_admin()` con
  `security definer`, referenciada desde policies de RLS en `items` y en
  `storage.objects` (bucket `garage-sale-media`). La tabla `admins` en sí
  tiene RLS sin policies — no es legible por la API pública, solo por la
  función.
- El frontend usa la misma clave pública/`anon` que el sitio público —
  no hay ninguna clave secreta en el navegador. El control de acceso es
  100% de la base de datos, no del cliente.
- Headers de seguridad (via `helmet` en `server.js`): CSP restrictiva
  (solo permite los orígenes que el sitio realmente usa: Google Fonts,
  jsDelivr para `supabase-js`, y el propio proyecto de Supabase),
  `frame-ancestors 'none'` (anti-clickjacking), HSTS, sin sniffing de
  MIME. `/admin` además manda `X-Robots-Tag: noindex` para no aparecer
  en buscadores.

**Para agregar otro administrador** (por ejemplo si querés que alguien
más gestione el sitio): en Supabase Studio → **Table Editor** → tabla
`admins` → **Insert row** → pegá su email. No requiere redeploy ni tocar
código — la próxima vez que esa persona pida un link mágico, ya puede
escribir.

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
- **RLS como única puerta de escritura:** ni el sitio público ni el panel
  de administración tienen la `service_role` key (nunca expuesta al
  navegador) — todo insert/update/delete pasa por policies de Postgres
  que verifican `is_admin()`.
- **Sin contraseñas:** el admin entra por magic link de Supabase Auth,
  nada que filtrar ni rotar.
- **Allow-list explícita en la base** (`public.admins`), no una lista de
  emails hardcodeada en el frontend — se administra desde Table Editor.
- **Headers de seguridad** (`helmet`): CSP restrictiva, HSTS,
  anti-clickjacking, `noindex` en `/admin`.
- **Sin build step:** HTML/CSS/JS plano + Express estático → deploy rápido
  y sin fricción en Railway.
- **Config vía env vars con defaults sensatos:** se puede migrar de
  proyecto Supabase o cambiar el número de WhatsApp sin tocar código.
- **Contenido 100% en español**, pensado para el mercado de Córdoba,
  Argentina, con precios en ARS.
