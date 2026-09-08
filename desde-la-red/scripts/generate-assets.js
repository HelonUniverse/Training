/* eslint-disable */
/**
 * Generador de assets cinematográficos para "Desde la Red".
 *
 * Produce PNGs procedurales (nebulosas, auroras, rayos de luz, horizontes
 * cósmicos) con la paleta aprobada: azul noche, cyan elegante y dorado cálido.
 * No requiere dependencias externas ni acceso a red.
 *
 *   node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------- PNG writer

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** rgba: Uint8Array de w*h*4 */
function encodePNG(rgba, w, h) {
  const stride = w * 4;
  // Filtro "Up" (2): excelente para degradados verticales suaves.
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1);
    raw[o] = 2;
    for (let x = 0; x < stride; x++) {
      const cur = rgba[y * stride + x];
      const up = y === 0 ? 0 : rgba[(y - 1) * stride + x];
      raw[o + 1 + x] = (cur - up) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- helpers

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ruido de valor con interpolación bicúbica-suave. */
function makeValueNoise(rand, size) {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  return (x, y) => {
    const fx = x * size;
    const fy = y * size;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const i = (xi, yi) => grid[(((yi % size) + size) % size) * size + (((xi % size) + size) % size)];
    const top = lerp(i(x0, y0), i(x0 + 1, y0), tx);
    const bot = lerp(i(x0, y0 + 1), i(x0 + 1, y0 + 1), tx);
    return lerp(top, bot, ty);
  };
}

function makeFbm(seed, octaves = 5, baseSize = 4) {
  const rand = mulberry32(seed);
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    layers.push({
      noise: makeValueNoise(rand, baseSize * Math.pow(2, o)),
      amp: Math.pow(0.5, o + 1),
    });
  }
  const total = layers.reduce((s, l) => s + l.amp, 0);
  return (x, y) => {
    let v = 0;
    for (const l of layers) v += l.noise(x, y) * l.amp;
    return v / total;
  };
}

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Rampa de color a partir de stops [{ at, color }] ordenados. */
function ramp(stops) {
  const parsed = stops.map((s) => ({ at: s.at, rgb: hexToRgb(s.color) }));
  return (t) => {
    t = clamp01(t);
    let a = parsed[0];
    let b = parsed[parsed.length - 1];
    for (let i = 0; i < parsed.length - 1; i++) {
      if (t >= parsed[i].at && t <= parsed[i + 1].at) {
        a = parsed[i];
        b = parsed[i + 1];
        break;
      }
    }
    const span = b.at - a.at || 1;
    const k = smooth(clamp01((t - a.at) / span));
    return [lerp(a.rgb[0], b.rgb[0], k), lerp(a.rgb[1], b.rgb[1], k), lerp(a.rgb[2], b.rgb[2], k)];
  };
}

// ------------------------------------------------------------------ paletas

const PALETTES = {
  // Azul noche profundo -> cyan -> dorado cálido
  cosmos: ramp([
    { at: 0.0, color: '#040711' },
    { at: 0.32, color: '#0A1730' },
    { at: 0.58, color: '#12406B' },
    { at: 0.78, color: '#2C8FA8' },
    { at: 0.9, color: '#7FD3E0' },
    { at: 1.0, color: '#F3E3BE' },
  ]),
  aurora: ramp([
    { at: 0.0, color: '#03060F' },
    { at: 0.35, color: '#0A2038' },
    { at: 0.6, color: '#13566C' },
    { at: 0.82, color: '#48B7C4' },
    { at: 1.0, color: '#DFF6F7' },
  ]),
  gold: ramp([
    { at: 0.0, color: '#050810' },
    { at: 0.3, color: '#141026' },
    { at: 0.55, color: '#3B2A2F' },
    { at: 0.75, color: '#8A6533' },
    { at: 0.9, color: '#D8AE63' },
    { at: 1.0, color: '#F6E6C2' },
  ]),
  violet: ramp([
    { at: 0.0, color: '#04060F' },
    { at: 0.33, color: '#120E2B' },
    { at: 0.58, color: '#2B2359' },
    { at: 0.78, color: '#5D5FA8' },
    { at: 0.92, color: '#9FB6E8' },
    { at: 1.0, color: '#EFE4C9' },
  ]),
  deep: ramp([
    { at: 0.0, color: '#030510' },
    { at: 0.4, color: '#071328' },
    { at: 0.68, color: '#0E3350' },
    { at: 0.86, color: '#1F6E86' },
    { at: 1.0, color: '#BFE6EC' },
  ]),
};

// ------------------------------------------------------------------- estilos

/**
 * Cada estilo devuelve una "densidad" 0..1 por pixel; la rampa la convierte
 * en color. Así todas las imágenes comparten el mismo ADN cromático.
 */
const STYLES = {
  /** Nebulosa: nubes fbm con núcleo luminoso. */
  nebula(opts) {
    const fbm = makeFbm(opts.seed, 6, 3);
    const warp = makeFbm(opts.seed + 977, 3, 2);
    const cx = opts.cx ?? 0.62;
    const cy = opts.cy ?? 0.38;
    return (x, y) => {
      const wx = x + (warp(x * 0.9, y * 0.9) - 0.5) * 0.34;
      const wy = y + (warp(x * 0.9 + 3.1, y * 0.9 + 1.7) - 0.5) * 0.34;
      const clouds = fbm(wx * 1.25, wy * 1.25);
      const dx = (x - cx) * 1.25;
      const dy = y - cy;
      const glow = Math.exp(-(dx * dx + dy * dy) * 7.5);
      const vign = 1 - Math.pow(Math.hypot(x - 0.5, y - 0.5) * 1.32, 2.1);
      return clamp01(clouds * 0.72 * clamp01(vign) + glow * 0.72);
    };
  },

  /** Aurora: bandas onduladas que ascienden. */
  aurora(opts) {
    const fbm = makeFbm(opts.seed, 5, 3);
    return (x, y) => {
      const wave =
        Math.sin(x * 6.1 + fbm(x * 0.8, y * 0.4) * 5.2) * 0.14 +
        Math.sin(x * 2.7 + 1.4) * 0.08;
      const band = Math.exp(-Math.pow((y - (0.42 + wave)) * 5.6, 2));
      const band2 = Math.exp(-Math.pow((y - (0.68 + wave * 0.6)) * 7.4, 2)) * 0.4;
      const haze = fbm(x * 1.6, y * 1.6) * 0.26;
      return clamp01(band * 0.62 + band2 + haze * (1 - y * 0.35) + 0.04);
    };
  },

  /** Rayos de luz atravesando la bruma (catedral cósmica). */
  rays(opts) {
    const fbm = makeFbm(opts.seed, 5, 3);
    const cx = opts.cx ?? 0.5;
    const cy = opts.cy ?? -0.12;
    return (x, y) => {
      const ang = Math.atan2(y - cy, x - cx);
      const dist = Math.hypot(x - cx, y - cy);
      const beams =
        (Math.sin(ang * 13 + 0.6) * 0.5 + 0.5) * 0.55 +
        (Math.sin(ang * 27 - 1.2) * 0.5 + 0.5) * 0.25;
      const falloff = Math.exp(-dist * 1.9);
      const mist = fbm(x * 1.4, y * 1.4) * 0.4;
      return clamp01(beams * falloff * 1.5 + mist * (1 - y * 0.5) + falloff * 0.5);
    };
  },

  /** Horizonte: planeta/amanecer con atmósfera. */
  horizon(opts) {
    const fbm = makeFbm(opts.seed, 5, 4);
    const hy = opts.hy ?? 0.72;
    return (x, y) => {
      const atmo = Math.exp(-Math.pow((y - hy) * 13.0, 2)) * 0.48;
      const sun = Math.exp(-(Math.pow((x - 0.44) * 3.8, 2) + Math.pow((y - hy) * 10.0, 2))) * 0.5;
      const sky = clamp01(1 - y) * 0.17;
      const ground = y > hy ? clamp01((y - hy) * 1.4) * -0.4 : 0;
      const grain = fbm(x * 2.2, y * 2.2) * 0.2;
      return clamp01(atmo + sun + sky + ground + grain);
    };
  },

  /** Ondas concéntricas: "la red" que se expande. */
  ripple(opts) {
    const fbm = makeFbm(opts.seed, 4, 3);
    const cx = opts.cx ?? 0.5;
    const cy = opts.cy ?? 0.52;
    return (x, y) => {
      const d = Math.hypot((x - cx) * 1.15, y - cy);
      const rings = Math.pow(Math.sin(d * 26 - 1.1) * 0.5 + 0.5, 3.2) * Math.exp(-d * 2.4);
      const core = Math.exp(-d * d * 120) * 0.62;
      const haze = fbm(x * 1.5, y * 1.5) * 0.26 * Math.exp(-d * 1.1);
      return clamp01(rings * 0.6 + core + haze + 0.05);
    };
  },

  /** Bruma vertical minimalista para fondos de pantalla completa. */
  veil(opts) {
    const fbm = makeFbm(opts.seed, 5, 3);
    return (x, y) => {
      const base = Math.pow(1 - y, 2.4) * 0.38;
      const glow = Math.exp(-(Math.pow((x - 0.5) * 3.4, 2) + Math.pow((y - 0.13) * 6.4, 2))) * 0.4;
      const clouds = fbm(x * 1.1, y * 1.1) * 0.24;
      return clamp01(base + glow + clouds * (1 - y * 0.55));
    };
  },
};

// ------------------------------------------------------------------- render

function render({ w, h, style, palette, seed, stars = 0.0016, grain = 1.1, opts = {} }) {
  const density = STYLES[style]({ seed, ...opts });
  const colorAt = PALETTES[palette];
  const rgba = new Uint8Array(w * h * 4);
  const rand = mulberry32(seed * 31 + 7);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const d = density(u, v);
      const [r, g, b] = colorAt(d);
      const n = (rand() - 0.5) * grain;
      const i = (y * w + x) * 4;
      rgba[i] = clamp01((r + n) / 255) * 255;
      rgba[i + 1] = clamp01((g + n) / 255) * 255;
      rgba[i + 2] = clamp01((b + n) / 255) * 255;
      rgba[i + 3] = 255;
    }
  }

  // Estrellas con halo suave.
  const count = Math.round(w * h * stars);
  for (let s = 0; s < count; s++) {
    const sx = Math.floor(rand() * w);
    const sy = Math.floor(rand() * h);
    const bright = Math.pow(rand(), 2.2);
    const radius = bright > 0.86 ? 2 : bright > 0.6 ? 1 : 0;
    const tint = rand() > 0.72 ? [255, 236, 198] : [226, 246, 255];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = sx + dx;
        const py = sy + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const fall = Math.exp(-(dx * dx + dy * dy) * 0.9);
        const a = clamp01(bright * fall * 0.95);
        const i = (py * w + px) * 4;
        rgba[i] = lerp(rgba[i], tint[0], a);
        rgba[i + 1] = lerp(rgba[i + 1], tint[1], a);
        rgba[i + 2] = lerp(rgba[i + 2], tint[2], a);
      }
    }
  }

  return encodePNG(rgba, w, h);
}

// ---------------------------------------------------------------- manifiesto

const W = 960;
const H = 680;

const IMAGES = [
  // Enseñanzas / biblioteca
  { file: 'teaching-silence.png', style: 'nebula', palette: 'cosmos', seed: 1207, opts: { cx: 0.66, cy: 0.34 } },
  { file: 'teaching-light.png', style: 'rays', palette: 'gold', seed: 3391, opts: { cx: 0.46, cy: -0.15 } },
  { file: 'teaching-water.png', style: 'aurora', palette: 'aurora', seed: 5517 },
  { file: 'teaching-threshold.png', style: 'horizon', palette: 'deep', seed: 7723, opts: { hy: 0.66 } },
  { file: 'teaching-roots.png', style: 'nebula', palette: 'violet', seed: 9109, opts: { cx: 0.34, cy: 0.46 } },
  { file: 'teaching-breath.png', style: 'ripple', palette: 'aurora', seed: 2467 },
  { file: 'teaching-fire.png', style: 'nebula', palette: 'gold', seed: 6151, opts: { cx: 0.5, cy: 0.55 } },
  { file: 'teaching-return.png', style: 'horizon', palette: 'violet', seed: 8837, opts: { hy: 0.58 } },

  // En vivo / círculos
  { file: 'live-ceremony.png', style: 'rays', palette: 'cosmos', seed: 4409, opts: { cx: 0.52, cy: -0.08 } },
  { file: 'live-meditation.png', style: 'ripple', palette: 'violet', seed: 1613 },
  { file: 'circle-luna.png', style: 'nebula', palette: 'aurora', seed: 7057, opts: { cx: 0.4, cy: 0.4 } },
  { file: 'circle-fuego.png', style: 'aurora', palette: 'gold', seed: 3163 },
  { file: 'circle-raiz.png', style: 'horizon', palette: 'cosmos', seed: 5843, opts: { hy: 0.7 } },

  // Fondos de pantalla
  { file: 'bg-auth.png', style: 'veil', palette: 'cosmos', seed: 9973, w: 828, h: 1500 },
  { file: 'bg-path.png', style: 'veil', palette: 'violet', seed: 2711, w: 828, h: 1500 },
  { file: 'bg-network.png', style: 'ripple', palette: 'deep', seed: 6379, w: 828, h: 1500 },
];

function main() {
  const outDir = path.join(__dirname, '..', 'assets', 'images');
  fs.mkdirSync(outDir, { recursive: true });

  for (const img of IMAGES) {
    const buf = render({
      w: img.w ?? W,
      h: img.h ?? H,
      style: img.style,
      palette: img.palette,
      seed: img.seed,
      opts: img.opts,
    });
    fs.writeFileSync(path.join(outDir, img.file), buf);
    console.log(`  ✓ ${img.file}  ${(buf.length / 1024).toFixed(0)} KB`);
  }

  // --- Icono, splash y adaptive icon -------------------------------------
  const brandDir = path.join(__dirname, '..', 'assets');

  const icon = render({ w: 1024, h: 1024, style: 'ripple', palette: 'cosmos', seed: 1111, stars: 0.0009 });
  fs.writeFileSync(path.join(brandDir, 'icon.png'), icon);
  fs.writeFileSync(path.join(brandDir, 'android-icon-foreground.png'), icon);
  fs.writeFileSync(path.join(brandDir, 'favicon.png'), render({ w: 128, h: 128, style: 'ripple', palette: 'cosmos', seed: 1111, stars: 0 }));

  const splash = render({ w: 828, h: 1792, style: 'veil', palette: 'cosmos', seed: 4242 });
  fs.writeFileSync(path.join(brandDir, 'splash.png'), splash);

  console.log('  ✓ icon.png / splash.png / favicon.png');
}

main();
