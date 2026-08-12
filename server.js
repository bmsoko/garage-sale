// Minimal static server for Railway. Serves the vanilla HTML/CSS/JS site in
// public/ and generates /config.js at request time so the Supabase project
// and WhatsApp number can be overridden via Railway environment variables
// without touching code. The Supabase key used here is the public
// "publishable"/anon key, which is safe to expose client-side — data access
// is enforced by Postgres Row Level Security, not by hiding this key.

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULTS = {
  SUPABASE_URL: 'https://cqtzwiztzvqfoeuqecpb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_A2q7IlfqxIAls_UDD1S-bw_xMd1gYSg',
  WHATSAPP_NUMBER: '5493515180599',
  SITE_NAME: 'Garage Sale Córdoba',
};

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

// Single-page app fallback (no client-side routes yet, but keeps things
// working if we add any later).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Garage sale site listening on port ${PORT}`);
});
