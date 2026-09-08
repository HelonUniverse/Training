/* eslint-disable */
/**
 * Empaqueta el export web de Expo en un único archivo HTML autocontenido:
 * el bundle de JavaScript en línea y todos los assets que la app llega a
 * pedir (imágenes y tipografías) convertidos a data: URI.
 *
 * Sirve para compartir la app sin instalar nada: una sola página que se abre
 * en cualquier navegador, incluido el del teléfono.
 *
 *   ASSET_SCALE=0.58 node scripts/generate-assets.js
 *   npx expo export --platform web --output-dir /tmp/demo-web
 *   node scripts/build-web-demo.js /tmp/demo-web desde-la-red-demo.html
 *   node scripts/generate-assets.js          # restaura la resolución completa
 */
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = process.argv[2];
const OUT = process.argv[3];

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Solo se incrusta lo que la app realmente usa. */
const USED_FONTS = [
  'Exo2_300Light.',
  'Exo2_300Light_Italic.',
  'Exo2_500Medium.',
  'Exo2_600SemiBold.',
  'Exo2_700Bold.',
  'Inter_300Light.',
  'Inter_400Regular.',
  'Inter_500Medium.',
  'Inter_600SemiBold.',
  'Feather.',
];

const shouldInline = (rel) => {
  if (rel.startsWith('assets/assets/images/')) return true;
  if (rel.includes('/Fonts/') || rel.includes('@expo-google-fonts/')) {
    return USED_FONTS.some((f) => path.basename(rel).startsWith(f));
  }
  return false;
};

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function main() {
  const files = walk(EXPORT_DIR);

  const html = fs.readFileSync(path.join(EXPORT_DIR, 'index.html'), 'utf8');
  const scriptMatch = html.match(/<script src="([^"]+)"/);
  if (!scriptMatch) throw new Error('No se encontró el bundle en index.html');
  const bundleRel = scriptMatch[1].replace(/^\//, '');

  let bundle = fs.readFileSync(path.join(EXPORT_DIR, bundleRel), 'utf8');

  // Mapa URL -> data: URI
  const map = new Map();
  let inlined = 0;
  let bytes = 0;
  for (const rel of files) {
    if (!shouldInline(rel)) continue;
    const ext = path.extname(rel).toLowerCase();
    const mime = MIME[ext];
    if (!mime) continue;
    const buf = fs.readFileSync(path.join(EXPORT_DIR, rel));
    map.set('/' + rel, `data:${mime};base64,${buf.toString('base64')}`);
    inlined++;
    bytes += buf.length;
  }

  // Una sola pasada sobre el bundle
  const before = bundle.length;
  bundle = bundle.replace(/\/assets\/[A-Za-z0-9@._\-/]+\.(?:png|jpe?g|ttf|otf|woff2?)/g, (url) =>
    map.has(url) ? map.get(url) : url,
  );

  // El bundle va dentro de <script>: hay que neutralizar cierres.
  const safeBundle = bundle.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

  const page = `<title>Desde la Red</title>
<style>
  html, body { height: 100%; }
  body {
    margin: 0;
    background: #04070d;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .stage {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(120% 80% at 50% 0%, #0a1830 0%, #04070d 55%, #01040a 100%);
  }
  .phone {
    position: relative;
    width: 390px;
    height: min(844px, 100dvh);
    border-radius: 42px;
    overflow: hidden;
    background: #01050d;
    border: 1px solid rgba(120, 190, 240, 0.22);
    box-shadow:
      0 40px 120px rgba(0, 0, 0, 0.75),
      0 0 70px rgba(79, 201, 248, 0.12);
  }
  #root { display: flex; height: 100%; width: 100%; flex: 1; }
  /* En el teléfono, la app ocupa toda la pantalla. */
  @media (max-width: 760px), (max-height: 700px) {
    .phone {
      width: 100%;
      height: 100dvh;
      border-radius: 0;
      border: none;
      box-shadow: none;
    }
  }
</style>

<div class="stage">
  <div class="phone"><div id="root"></div></div>
</div>

<script>
  // La página puede servirse en una ruta profunda (un visor, un iframe, una
  // subcarpeta). El router de la app resuelve rutas contra el path, así que
  // lo devolvemos a la raíz antes de arrancar, conservando la query original.
  (function () {
    try {
      if (location.pathname !== '/') {
        history.replaceState(null, '', '/' + location.search + location.hash);
      }
    } catch (e) {
      /* Origen opaco: el arranque de abajo se encarga. */
    }
  })();
</script>

<script>${safeBundle}</script>
`;

  fs.writeFileSync(OUT, page);

  const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
  console.log(`  assets incrustados: ${inlined}  (${mb(bytes)} originales)`);
  console.log(`  bundle: ${mb(before)} -> ${mb(bundle.length)}`);
  console.log(`  salida: ${OUT}  ${mb(fs.statSync(OUT).size)}`);
}

main();
