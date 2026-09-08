/* eslint-disable */
/**
 * Generador de assets de "Desde la Red".
 *
 * Reproduce el lenguaje gráfico del key art de marca: espacio azul noche,
 * globo terráqueo recubierto por una malla de nodos y líneas en cyan
 * brillante, destellos blanco-hielo y bruma azul eléctrico.
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
  const table =
    crc32.table ||
    (crc32.table = (() => {
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
const DEG = Math.PI / 180;

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
    const i = (xi, yi) =>
      grid[(((yi % size) + size) % size) * size + (((xi % size) + size) % size)];
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
    return [
      lerp(a.rgb[0], b.rgb[0], k),
      lerp(a.rgb[1], b.rgb[1], k),
      lerp(a.rgb[2], b.rgb[2], k),
    ];
  };
}

// ------------------------------------------------------------------ paletas
// Todas monocromas azules, tomadas del key art.

const PALETTES = {
  /** Azul noche → cyan → blanco hielo. La paleta base de marca. */
  deep: ramp([
    { at: 0.0, color: '#01050E' },
    { at: 0.34, color: '#04122B' },
    { at: 0.6, color: '#0A3A6B' },
    { at: 0.8, color: '#1C7FD6' },
    { at: 0.92, color: '#7FD9FA' },
    { at: 1.0, color: '#EAF8FF' },
  ]),
  /** Azul eléctrico de las líneas de la malla. */
  electric: ramp([
    { at: 0.0, color: '#01040C' },
    { at: 0.33, color: '#061A3A' },
    { at: 0.58, color: '#10488F' },
    { at: 0.78, color: '#2E7DF0' },
    { at: 0.92, color: '#8FC6FF' },
    { at: 1.0, color: '#FFFFFF' },
  ]),
  /** Cyan hielo, el acento más luminoso. */
  ice: ramp([
    { at: 0.0, color: '#020713' },
    { at: 0.33, color: '#062136' },
    { at: 0.58, color: '#0D5A80' },
    { at: 0.79, color: '#2FA6D8' },
    { at: 0.92, color: '#9FE7FA' },
    { at: 1.0, color: '#F2FDFF' },
  ]),
  /** Azul profundo, casi sin brillo: para fondos que no compiten. */
  abyss: ramp([
    { at: 0.0, color: '#01040B' },
    { at: 0.45, color: '#040F22' },
    { at: 0.72, color: '#0A2A50' },
    { at: 0.88, color: '#155F9E' },
    { at: 1.0, color: '#8ECBF0' },
  ]),
};

// ------------------------------------------------------- máscara continental
/**
 * Continentes aproximados como unión de elipses en (lon, lat).
 * No busca precisión cartográfica: busca que el globo se lea como la Tierra
 * a la escala en la que aparece en la app.
 */
const LAND = [
  // Norteamérica
  [-122, 50, 10, 12],
  [-112, 44, 14, 12],
  [-98, 40, 16, 12],
  [-85, 36, 12, 10],
  [-78, 42, 9, 8],
  [-104, 60, 26, 7],
  [-95, 66, 22, 5],
  [-150, 63, 11, 6],
  [-101, 25, 9, 9],
  [-88, 18, 9, 4],
  [-80, 10, 6, 4],
  // Groenlandia
  [-42, 73, 12, 7],
  // Sudamérica
  [-70, 0, 9, 9],
  [-62, -8, 13, 10],
  [-55, -16, 12, 10],
  [-60, -26, 9, 9],
  [-66, -38, 6, 10],
  [-70, -47, 4, 8],
  [-75, -10, 6, 12],
  // Europa
  [10, 47, 14, 7],
  [22, 52, 14, 8],
  [-2, 44, 6, 5],
  [16, 62, 9, 7],
  [30, 60, 12, 8],
  [-4, 53, 4, 5],
  // África
  [2, 16, 14, 10],
  [18, 14, 14, 11],
  [30, 20, 10, 10],
  [22, 0, 12, 12],
  [26, -14, 10, 12],
  [26, -28, 8, 8],
  [42, 8, 7, 7],
  [47, -20, 3, 6],
  // Asia
  [50, 45, 14, 12],
  [66, 50, 16, 12],
  [84, 55, 20, 12],
  [104, 58, 22, 12],
  [128, 62, 20, 10],
  [148, 66, 14, 8],
  [92, 38, 18, 10],
  [76, 24, 9, 9],
  [82, 16, 6, 7],
  [102, 18, 9, 8],
  [114, 32, 12, 10],
  [138, 38, 6, 8],
  [46, 34, 12, 8],
  [58, 26, 8, 6],
  [112, 0, 10, 5],
  [122, -3, 8, 4],
  // Oceanía
  [134, -25, 15, 9],
  [146, -38, 5, 5],
  [172, -42, 4, 6],
];

const inLand = (lat, lon) => {
  for (const [clon, clat, rx, ry] of LAND) {
    let dlon = lon - clon;
    if (dlon > 180) dlon -= 360;
    if (dlon < -180) dlon += 360;
    const a = dlon / rx;
    const b = (lat - clat) / ry;
    if (a * a + b * b <= 1) return true;
  }
  // Antártida
  if (lat < -68) return true;
  return false;
};

// ---------------------------------------------------- utilidades de trazado

const makeCanvas = (w, h) => ({ w, h, data: new Float32Array(w * h * 3) });

/** Mezcla aditiva con desvanecimiento suave (glow). */
function addGlow(canvas, x, y, radius, rgb, intensity) {
  const { w, h, data } = canvas;
  const x0 = Math.max(0, Math.floor(x - radius));
  const x1 = Math.min(w - 1, Math.ceil(x + radius));
  const y0 = Math.max(0, Math.floor(y - radius));
  const y1 = Math.min(h - 1, Math.ceil(y + radius));
  const r2 = radius * radius;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - x;
      const dy = py - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const f = Math.pow(1 - Math.sqrt(d2) / radius, 2.2) * intensity;
      const i = (py * w + px) * 3;
      data[i] += rgb[0] * f;
      data[i + 1] += rgb[1] * f;
      data[i + 2] += rgb[2] * f;
    }
  }
}

function addPoint(canvas, x, y, rgb, intensity) {
  const { w, h, data } = canvas;
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= w || py >= h) return;
  const i = (py * w + px) * 3;
  data[i] += rgb[0] * intensity;
  data[i + 1] += rgb[1] * intensity;
  data[i + 2] += rgb[2] * intensity;
}

const NODE_RGB = [1.0, 1.0, 1.0];
const LINE_RGB = [0.36, 0.76, 1.0];
const LAND_RGB = [0.55, 0.86, 1.0];
const ATMO_RGB = [0.24, 0.62, 1.0];

// ---------------------------------------------------------- globo de red 3D

/**
 * Dibuja el globo del key art: océanos en azul profundo, continentes
 * punteados en cyan, malla de nodos conectados y halo atmosférico.
 */
function drawGlobe(canvas, opts) {
  const {
    cx,
    cy,
    r,
    seed = 7,
    tilt = 16 * DEG,
    spin = -18 * DEG,
    nodeCount = 190,
    linkAngle = 24 * DEG,
    landDots = 1.7,
  } = opts;

  const { w, h } = canvas;
  const rand = mulberry32(seed);

  const cosT = Math.cos(-tilt);
  const sinT = Math.sin(-tilt);
  const cosS = Math.cos(-spin);
  const sinS = Math.sin(-spin);

  /** Pasa un punto de la vista al mundo (deshace giro e inclinación). */
  const viewToWorld = (vx, vy, vz) => {
    // Rx(-tilt)
    const y1 = vy * cosT - vz * sinT;
    const z1 = vy * sinT + vz * cosT;
    // Ry(-spin)
    const x2 = vx * cosS + z1 * sinS;
    const z2 = -vx * sinS + z1 * cosS;
    return [x2, y1, z2];
  };

  const cosTf = Math.cos(tilt);
  const sinTf = Math.sin(tilt);
  const cosSf = Math.cos(spin);
  const sinSf = Math.sin(spin);

  /** Del mundo a la vista (para proyectar nodos). */
  const worldToView = (x, y, z) => {
    // Ry(spin)
    const x1 = x * cosSf + z * sinSf;
    const z1 = -x * sinSf + z * cosSf;
    // Rx(tilt)
    const y2 = y * cosTf - z1 * sinTf;
    const z2 = y * sinTf + z1 * cosTf;
    return [x1, y2, z2];
  };

  const project = (x, y, z) => {
    const [vx, vy, vz] = worldToView(x, y, z);
    return { sx: cx + vx * r, sy: cy - vy * r, front: vz > 0, vz };
  };

  const fromLatLon = (lat, lon) => {
    const la = lat * DEG;
    const lo = lon * DEG;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  };

  // --- Superficie: océano, continentes punteados y halo atmosférico ---
  const x0 = Math.max(0, Math.floor(cx - r * 1.3));
  const x1 = Math.min(w - 1, Math.ceil(cx + r * 1.3));
  const y0 = Math.max(0, Math.floor(cy - r * 1.3));
  const y1 = Math.min(h - 1, Math.ceil(cy + r * 1.3));

  const dotSpacing = Math.max(3, r * 0.0092);
  const dots = [];

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = (px - cx) / r;
      const dy = (py - cy) / r;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);

      if (d2 <= 1) {
        const nz = Math.sqrt(1 - d2);
        const [wx, wy, wz] = viewToWorld(dx, -dy, nz);
        const lat = Math.asin(Math.max(-1, Math.min(1, wy))) / DEG;
        const lon = Math.atan2(wx, wz) / DEG;

        // Océano: azul profundo que se enciende hacia el limbo.
        const edge = Math.pow(d, 4.5);
        const base = 0.085 + edge * 0.46;
        const i = (py * w + px) * 3;
        canvas.data[i] += base * 0.1;
        canvas.data[i + 1] += base * 0.34;
        canvas.data[i + 2] += base * 0.86;

        // Continentes: puntos regulares en pantalla, como luces de ciudad.
        if (inLand(lat, lon)) {
          const gx = Math.round(px / dotSpacing);
          const gy = Math.round(py / dotSpacing);
          if (
            Math.abs(px - gx * dotSpacing) < 0.55 &&
            Math.abs(py - gy * dotSpacing) < 0.55
          ) {
            const jitter = mulberry32(gx * 7919 + gy * 104729 + seed)();
            dots.push([px, py, (0.5 + jitter * 1.0) * (0.45 + nz * 0.7)]);
          }
        }
      }

      // Halo atmosférico: anillo fino y encendido justo en el limbo.
      const rim = Math.exp(-Math.pow((d - 0.995) * 34, 2)) * 0.9;
      const bleed = d > 1 ? Math.exp(-Math.pow((d - 1) * 9, 2)) * 0.34 : 0;
      const halo = rim + bleed;
      if (halo > 0.002) {
        const i = (py * w + px) * 3;
        canvas.data[i] += ATMO_RGB[0] * halo;
        canvas.data[i + 1] += ATMO_RGB[1] * halo;
        canvas.data[i + 2] += ATMO_RGB[2] * halo;
      }
    }
  }

  for (const [px, py, bright] of dots) {
    addPoint(canvas, px, py, LAND_RGB, bright * 2.3);
    addGlow(canvas, px, py, 2.6, LAND_RGB, bright * 0.42);
  }

  // --- Malla de nodos ---
  const nodes = [];
  for (let n = 0; n < nodeCount; n++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    nodes.push([s * Math.cos(th), u, s * Math.sin(th)]);
  }

  const cosLink = Math.cos(linkAngle);

  // Enlaces (arcos de círculo máximo) ligeramente elevados sobre la esfera.
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const A = nodes[a];
      const B = nodes[b];
      const dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
      if (dot < cosLink) continue;
      const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (omega < 1e-4) continue;
      const steps = Math.max(10, Math.round((omega / DEG) * 2.4));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const k1 = Math.sin((1 - t) * omega) / Math.sin(omega);
        const k2 = Math.sin(t * omega) / Math.sin(omega);
        // Elevación: la malla flota sobre la superficie, como en el key art.
        const lift = 1.035;
        const px3 = (A[0] * k1 + B[0] * k2) * lift;
        const py3 = (A[1] * k1 + B[1] * k2) * lift;
        const pz3 = (A[2] * k1 + B[2] * k2) * lift;
        const p = project(px3, py3, pz3);
        if (!p.front) continue;
        const depth = 0.3 + p.vz * 0.85;
        addPoint(canvas, p.sx, p.sy, LINE_RGB, 0.85 * depth);
        addGlow(canvas, p.sx, p.sy, 2.4, LINE_RGB, 0.2 * depth);
      }
    }
  }

  // Nodos: estrella brillante con halo, y destello alargado en los mayores.
  for (const [nx, ny, nz] of nodes) {
    const p = project(nx * 1.035, ny * 1.035, nz * 1.035);
    if (!p.front) continue;
    const depth = 0.25 + p.vz * 0.9;
    const big = mulberry32(Math.round((nx + 2) * 9871 + (ny + 2) * 6547))() > 0.72;
    addGlow(canvas, p.sx, p.sy, big ? 12 : 6, [0.5, 0.86, 1], (big ? 0.7 : 0.4) * depth);
    addGlow(canvas, p.sx, p.sy, big ? 3 : 1.8, NODE_RGB, 0.95 * depth);
    if (big) {
      const len = 9;
      for (let k = -len; k <= len; k++) {
        const f = Math.pow(1 - Math.abs(k) / len, 2.4) * 0.5 * depth;
        addPoint(canvas, p.sx + k, p.sy, NODE_RGB, f);
        addPoint(canvas, p.sx, p.sy + k, NODE_RGB, f);
      }
    }
  }
}

// ------------------------------------------------- malla plana (decorativa)

function drawMesh(canvas, opts) {
  const { seed = 3, density = 46, linkDist = 0.26, intensity = 1, top = 0, bottom = 1 } = opts;
  const { w, h } = canvas;
  const rand = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < density; i++) {
    pts.push([rand(), lerp(top, bottom, rand())]);
  }
  for (let a = 0; a < pts.length; a++) {
    for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[a][0] - pts[b][0];
      const dy = (pts[a][1] - pts[b][1]) * (h / w);
      const d = Math.hypot(dx, dy);
      if (d > linkDist) continue;
      const fade = (1 - d / linkDist) * intensity;
      const steps = Math.round(d * w * 0.9) + 6;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = lerp(pts[a][0], pts[b][0], t) * w;
        const y = lerp(pts[a][1], pts[b][1], t) * h;
        addPoint(canvas, x, y, LINE_RGB, 0.42 * fade);
        addGlow(canvas, x, y, 2.2, LINE_RGB, 0.08 * fade);
      }
    }
  }
  for (const [px, py] of pts) {
    const x = px * w;
    const y = py * h;
    addGlow(canvas, x, y, 7, [0.5, 0.86, 1], 0.34 * intensity);
    addGlow(canvas, x, y, 2.2, NODE_RGB, 0.85 * intensity);
  }
}

// ------------------------------------------------------------------- estilos

const STYLES = {
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

  aurora(opts) {
    const fbm = makeFbm(opts.seed, 5, 3);
    return (x, y) => {
      const wave =
        Math.sin(x * 6.1 + fbm(x * 0.8, y * 0.4) * 5.2) * 0.14 + Math.sin(x * 2.7 + 1.4) * 0.08;
      const band = Math.exp(-Math.pow((y - (0.42 + wave)) * 5.6, 2));
      const band2 = Math.exp(-Math.pow((y - (0.68 + wave * 0.6)) * 7.4, 2)) * 0.4;
      const haze = fbm(x * 1.6, y * 1.6) * 0.26;
      return clamp01(band * 0.62 + band2 + haze * (1 - y * 0.35) + 0.04);
    };
  },

  rays(opts) {
    const fbm = makeFbm(opts.seed, 5, 3);
    const cx = opts.cx ?? 0.5;
    const cy = opts.cy ?? -0.12;
    return (x, y) => {
      const ang = Math.atan2(y - cy, x - cx);
      const dist = Math.hypot(x - cx, y - cy);
      const beams =
        (Math.sin(ang * 13 + 0.6) * 0.5 + 0.5) * 0.55 + (Math.sin(ang * 27 - 1.2) * 0.5 + 0.5) * 0.25;
      const falloff = Math.exp(-dist * 1.9);
      const mist = fbm(x * 1.4, y * 1.4) * 0.4;
      return clamp01(beams * falloff * 1.5 + mist * (1 - y * 0.5) + falloff * 0.5);
    };
  },

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

/** Convierte un lienzo aditivo (float) a RGBA con compresión suave de altas luces. */
function toRGBA(canvas) {
  const { w, h, data } = canvas;
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    for (let k = 0; k < 3; k++) {
      const v = data[i + k];
      // Rodilla suave: los tonos medios quedan fieles a la paleta y solo
      // las altas luces se comprimen, para no lavar el azul de marca.
      const knee = 0.78;
      const t = v <= knee ? v : knee + (1 - knee) * (1 - Math.exp(-(v - knee) / (1 - knee)));
      rgba[j + k] = Math.round(clamp01(t) * 255);
    }
    rgba[j + 3] = 255;
  }
  return rgba;
}

function paintBase(canvas, style, palette, seed, opts, gain = 1) {
  if (!style) return;
  const density = STYLES[style]({ seed, ...opts });
  const colorAt = PALETTES[palette];
  const { w, h, data } = canvas;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = colorAt(density(x / w, y / h));
      const i = (y * w + x) * 3;
      data[i] += (r / 255) * gain;
      data[i + 1] += (g / 255) * gain;
      data[i + 2] += (b / 255) * gain;
    }
  }
}

function paintStars(canvas, seed, amount = 0.0016) {
  const { w, h } = canvas;
  const rand = mulberry32(seed * 31 + 7);
  const count = Math.round(w * h * amount);
  for (let s = 0; s < count; s++) {
    const sx = rand() * w;
    const sy = rand() * h;
    const bright = Math.pow(rand(), 2.4);
    const tint = rand() > 0.7 ? [0.72, 0.9, 1.0] : [0.86, 0.95, 1.0];
    addPoint(canvas, sx, sy, tint, bright * 0.95);
    if (bright > 0.7) addGlow(canvas, sx, sy, 2.6, tint, bright * 0.28);
  }
}

function render(spec) {
  const { w, h } = spec;
  const canvas = makeCanvas(w, h);

  paintBase(canvas, spec.style, spec.palette ?? 'deep', spec.seed, spec.opts ?? {}, spec.gain ?? 1);
  if (spec.stars !== 0) paintStars(canvas, spec.seed, spec.stars ?? 0.0014);
  if (spec.mesh) drawMesh(canvas, { seed: spec.seed + 13, ...spec.mesh });
  if (spec.globe) {
    drawGlobe(canvas, {
      seed: spec.seed + 5,
      ...spec.globe,
      // Las fracciones del manifiesto se resuelven a píxeles al final.
      cx: spec.globe.cx * w,
      cy: spec.globe.cy * h,
      r: spec.globe.r * w,
    });
  }

  return encodePNG(toRGBA(canvas), w, h);
}

// ---------------------------------------------------------------- manifiesto

const W = 960;
const H = 680;

/**
 * Todo el imaginario de la app nace del mismo key art: espacio casi negro,
 * el globo de la Red y su malla de nodos. Lo que cambia entre piezas es el
 * encuadre — el globo entero, un limbo encendido cruzando el cuadro, o un
 * campo de nodos suelto — nunca el idioma visual.
 */

/** Haz un fondo de espacio con bruma azul muy tenue. */
const space = (seed, gain = 0.55) => ({
  style: 'veil',
  palette: 'abyss',
  seed,
  gain,
  stars: 0.0016,
});

const IMAGES = [
  // --- Enseñanzas / biblioteca ---------------------------------------------
  {
    // Limbo encendido cruzando la parte baja, como en el póster.
    file: 'teaching-silence.png',
    ...space(1207, 0.5),
    globe: { cx: 0.42, cy: 1.62, r: 1.15, tilt: 14 * DEG, spin: -30 * DEG, nodeCount: 210 },
  },
  {
    // Globo asomando desde abajo, encuadre cerrado.
    file: 'teaching-light.png',
    ...space(3391, 0.5),
    globe: { cx: 0.5, cy: 1.28, r: 0.86, tilt: 12 * DEG, spin: 24 * DEG, nodeCount: 190 },
  },
  {
    // Campo de nodos abierto, sin globo.
    file: 'teaching-water.png',
    ...space(5517, 0.6),
    mesh: { density: 38, linkDist: 0.23, intensity: 0.9 },
  },
  {
    // Arco superior: la curva del planeta cruzando por arriba.
    file: 'teaching-threshold.png',
    ...space(7723, 0.45),
    globe: { cx: 0.55, cy: -0.75, r: 1.05, tilt: 20 * DEG, spin: -70 * DEG, nodeCount: 200 },
  },
  {
    // Globo completo, pequeño y centrado.
    file: 'teaching-roots.png',
    ...space(9109, 0.5),
    globe: { cx: 0.5, cy: 0.5, r: 0.33, tilt: 18 * DEG, spin: -10 * DEG, nodeCount: 160 },
  },
  {
    // Malla densa: la Red como constelación.
    file: 'teaching-breath.png',
    ...space(2467, 0.55),
    mesh: { density: 46, linkDist: 0.21, intensity: 1.0 },
  },
  {
    // Encuadre cerrado por la izquierda.
    file: 'teaching-fire.png',
    ...space(6151, 0.5),
    globe: { cx: 0.02, cy: 0.52, r: 0.72, tilt: 16 * DEG, spin: 60 * DEG, nodeCount: 190 },
  },
  {
    // Globo lejano, arriba a la derecha.
    file: 'teaching-return.png',
    ...space(8837, 0.55),
    globe: { cx: 0.74, cy: 0.3, r: 0.2, tilt: 15 * DEG, spin: -130 * DEG, nodeCount: 140 },
    mesh: { density: 26, linkDist: 0.28, intensity: 0.6, top: 0.45, bottom: 1 },
  },

  // --- En vivo / círculos ---------------------------------------------------
  {
    file: 'live-ceremony.png',
    ...space(4409, 0.5),
    globe: { cx: 0.5, cy: 0.52, r: 0.4, tilt: 16 * DEG, spin: -20 * DEG, nodeCount: 180 },
  },
  {
    file: 'live-meditation.png',
    ...space(1613, 0.6),
    mesh: { density: 40, linkDist: 0.22, intensity: 0.95 },
  },
  {
    file: 'circle-luna.png',
    ...space(7057, 0.5),
    globe: { cx: 0.3, cy: 1.35, r: 0.95, tilt: 12 * DEG, spin: 100 * DEG, nodeCount: 195 },
  },
  {
    file: 'circle-fuego.png',
    ...space(3163, 0.45),
    globe: { cx: 0.45, cy: -0.6, r: 0.92, tilt: 22 * DEG, spin: 150 * DEG, nodeCount: 195 },
  },
  {
    file: 'circle-raiz.png',
    ...space(5843, 0.5),
    globe: { cx: 0.78, cy: 1.2, r: 0.7, tilt: 14 * DEG, spin: -95 * DEG, nodeCount: 175 },
    mesh: { density: 24, linkDist: 0.3, intensity: 0.55, top: 0, bottom: 0.5 },
  },

  // --- Fondos de pantalla completa -----------------------------------------
  {
    // Login y splash: la composición exacta del póster.
    file: 'bg-auth.png',
    w: 828,
    h: 1500,
    ...space(9973, 0.45),
    globe: { cx: 0.5, cy: 1.16, r: 0.72, tilt: 14 * DEG, spin: -22 * DEG, nodeCount: 200 },
  },
  {
    file: 'bg-path.png',
    w: 828,
    h: 1500,
    ...space(2711, 0.5),
    mesh: { density: 34, linkDist: 0.22, intensity: 0.8, top: 0.02, bottom: 0.6 },
    globe: { cx: 0.5, cy: 1.4, r: 0.8, tilt: 14 * DEG, spin: 40 * DEG, nodeCount: 190 },
  },
  {
    // La Red: el globo entero.
    file: 'bg-network.png',
    w: 828,
    h: 1500,
    ...space(6379, 0.4),
    globe: { cx: 0.5, cy: 0.5, r: 0.56, tilt: 18 * DEG, spin: -14 * DEG, nodeCount: 200 },
  },
];

function main() {
  const outDir = path.join(__dirname, '..', 'assets', 'images');
  fs.mkdirSync(outDir, { recursive: true });

  for (const img of IMAGES) {
    const buf = render({ w: W, h: H, ...img });
    fs.writeFileSync(path.join(outDir, img.file), buf);
    console.log(`  ✓ ${img.file}  ${(buf.length / 1024).toFixed(0)} KB`);
  }

  // --- Icono, splash y adaptive icon -------------------------------------
  const brandDir = path.join(__dirname, '..', 'assets');

  const icon = render({
    w: 1024,
    h: 1024,
    style: null,
    seed: 1111,
    stars: 0.0006,
    globe: { cx: 0.5, cy: 0.52, r: 0.4, tilt: 16 * DEG, spin: -20 * DEG, nodeCount: 120 },
  });
  fs.writeFileSync(path.join(brandDir, 'icon.png'), icon);
  fs.writeFileSync(path.join(brandDir, 'android-icon-foreground.png'), icon);
  fs.writeFileSync(
    path.join(brandDir, 'favicon.png'),
    render({
      w: 196,
      h: 196,
      style: null,
      seed: 1111,
      stars: 0,
      globe: { cx: 0.5, cy: 0.52, r: 0.4, tilt: 16 * DEG, spin: -20 * DEG, nodeCount: 70 },
    }),
  );

  fs.writeFileSync(
    path.join(brandDir, 'splash.png'),
    render({
      w: 828,
      h: 1792,
      style: 'veil',
      palette: 'abyss',
      seed: 4242,
      gain: 0.7,
      globe: { cx: 0.5, cy: 1.1, r: 0.68, tilt: 14 * DEG, spin: -22 * DEG, nodeCount: 150 },
    }),
  );

  console.log('  ✓ icon.png / splash.png / favicon.png');
}

main();
