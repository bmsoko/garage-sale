// Minimal static server for Railway. Serves the vanilla HTML/CSS/JS site in
// public/ (storefront + /admin) and generates /config.js at request time so
// the Supabase project and WhatsApp number can be overridden via Railway
// environment variables without touching code. The Supabase key used here
// is the public "publishable"/anon key, which is safe to expose client-side
// — data access (including the admin panel's writes) is enforced by
// Postgres Row Level Security, not by hiding this key.

const express = require('express');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULTS = {
  SUPABASE_URL: 'https://cqtzwiztzvqfoeuqecpb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_A2q7IlfqxIAls_UDD1S-bw_xMd1gYSg',
  WHATSAPP_NUMBER: '5493515180599',
  SITE_NAME: 'Garage Sale Córdoba',
};

// Security headers on every response: strict CSP (only self + the exact
// third-party origins the site actually uses), HSTS, no framing (blocks
// clickjacking on the admin login), no MIME sniffing, etc.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://*.supabase.co'],
        mediaSrc: ["'self'", 'https://*.supabase.co'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Belt-and-suspenders on top of the <meta name="robots"> tag in
// admin/index.html: keep the admin panel out of search engines even if a
// crawler ignores the meta tag.
app.use('/admin', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

app.get('/config.js', (req, res) => {
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || DEFAULTS.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || DEFAULTS.SUPABASE_ANON_KEY,
    WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || DEFAULTS.WHATSAPP_NUMBER,
    SITE_NAME: process.env.SITE_NAME || DEFAULTS.SITE_NAME,
  };
  res.type('application/javascript');
  res.send(`window.GARAGE_SALE_CONFIG = ${JSON.stringify(config)};`);
});

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use(express.static(path.join(__dirname, 'public')));

// Single-page app fallback for the storefront (no client-side routes yet,
// but keeps things working if we add any later). Anything under /admin
// that isn't a real static file falls through to the admin SPA shell too.
app.get('*', (req, res) => {
  const indexFile = req.path.startsWith('/admin')
    ? path.join(__dirname, 'public', 'admin', 'index.html')
    : path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexFile);
});

app.listen(PORT, () => {
  console.log(`Garage sale site listening on port ${PORT}`);
});
