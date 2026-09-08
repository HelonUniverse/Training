/* eslint-disable */
/**
 * Remata el export web para que sea una app instalable.
 *
 * Expo genera el <head> del SPA con su propia plantilla, así que las etiquetas
 * de PWA se añaden aquí: manifiesto, iconos, pantalla completa en iOS y el
 * fondo azul noche antes de que cargue nada.
 *
 *   node scripts/finish-web-build.js [dist]
 */
const fs = require('fs');
const path = require('path');

const DIST = process.argv[2] || 'dist';
const indexPath = path.join(DIST, 'index.html');

const HEAD = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Desde la Red" />
    <meta name="color-scheme" content="dark" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="Desde la Red" />
    <meta property="og:description" content="Enseñanza viva para el alma contemporánea." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/icon-512.png" />
    <style>
      html, body { background-color: #01050D; }
      body { overscroll-behavior: none; -webkit-font-smoothing: antialiased; }
    </style>
`;

function main() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No existe ${indexPath}. Corre primero: npx expo export --platform web --output-dir ${DIST}`);
  }
  let html = fs.readFileSync(indexPath, 'utf8');

  // La barra de estado del iPhone debe quedar debajo de la app.
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />',
  );

  if (!html.includes('manifest.webmanifest')) {
    html = html.replace('</head>', `${HEAD}  </head>`);
  }

  fs.writeFileSync(indexPath, html);

  const required = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
  const missing = required.filter((f) => !fs.existsSync(path.join(DIST, f)));
  if (missing.length) {
    throw new Error(`Faltan archivos en ${DIST}: ${missing.join(', ')}`);
  }

  console.log(`  ✓ ${indexPath} listo como app instalable`);
}

main();
