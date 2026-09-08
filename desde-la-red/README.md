# Desde la Red — app móvil (React Native + Expo)

App móvil real y navegable de **Desde la Red**, construida sobre el key art
oficial de marca: espacio azul noche, globo terráqueo recubierto por una malla
de nodos en cyan brillante, azul eléctrico, destellos blanco-hielo, tipografía
tecnológica (Exo 2 + Inter) y tarjetas oscuras con bordes finos.

Funciona **100 % en modo demo**: todo el estado vive en el dispositivo con
AsyncStorage. **Todavía no hay Supabase ni ningún backend conectado.**

---

## Verla en el iPhone

```bash
cd desde-la-red && npm install && npx expo start
```

Escanea el código QR con la cámara del iPhone (necesitas la app **Expo Go**
instalada, y que el teléfono esté en la misma red Wi-Fi que la computadora).

Si la red local bloquea la conexión: `npx expo start --tunnel`.

---

## Pantallas

| # | Pantalla | Ruta |
|---|---|---|
| 1 | Splash | `app/index.tsx` |
| 2 | Login / Registro | `app/(auth)/login.tsx` |
| 3 | Hoy | `app/(tabs)/hoy.tsx` |
| 4 | Lectura completa | `app/lectura/[id].tsx` |
| 5 | Biblioteca Viva | `app/(tabs)/explorar.tsx` |
| 6 | En Vivo | `app/(tabs)/en-vivo.tsx` |
| 7 | La Red | `app/(tabs)/la-red.tsx` |
| 8 | Círculos | `app/circulos/index.tsx` · `app/circulos/[id].tsx` |
| 9 | Guías de la Red | `app/guias/index.tsx` |
| 10 | Perfil de Guía | `app/guias/[id].tsx` |
| 11 | Servicios | `app/servicios/index.tsx` |
| 12 | Reserva | `app/reserva/[serviceId].tsx` |
| 13 | Mi Camino | `app/(tabs)/mi-camino.tsx` |
| 14 | Perfil | `app/perfil.tsx` |

La barra inferior tiene exactamente cinco destinos: **Hoy · Explorar · En Vivo ·
La Red · Mi Camino**. El resto son pantallas apiladas.

---

## Qué funciona en modo demo

- Tocar la enseñanza del día abre la lectura completa.
- Guardar / quitar enseñanzas (persiste entre sesiones).
- Escuchar y Compartir (Compartir usa la hoja nativa del sistema).
- Marcado automático de enseñanzas leídas.
- Búsqueda y filtros en Biblioteca Viva, La Red, Guías, Círculos y Servicios.
- Mi Camino: seleccionar opciones, ver progreso y guardar.
- Guías → perfil de guía → servicios → seleccionar servicio → fecha y hora →
  crear reserva demo (aparece en Mi Camino y en Perfil).
- Entrar y salir de círculos; resonar con publicaciones de La Red.
- Reservar lugar en encuentros En Vivo.
- Cambio de tabs con háptica y estado activo dorado.

Todo se guarda bajo la clave `desde-la-red:state:v1` de AsyncStorage.

---

## Estructura

```
app/                    rutas (expo-router)
src/theme/              colores, tipografía, espaciado, sombras
src/components/         componentes reutilizables (Card, Button, TabBar, …)
src/data/               contenido demo tipado (enseñanzas, guías, círculos…)
src/store/              estado global + persistencia AsyncStorage
src/lib/                formato, búsqueda, háptica
assets/images/          imágenes cinematográficas
scripts/generate-assets.js  generador procedural de esas imágenes
```

### Sistema visual

- **Paleta** (`src/theme/colors.ts`): azul noche `#030814`, cyan `#4FC9F8`,
  azul eléctrico `#2E7DF0` y blanco-hielo `#BFE9FF` como acento de mayor
  jerarquía. Sin dorado: el key art es monocromo azul.
- **Tipografía** (`src/theme/typography.ts`): Exo 2 para titulares (geométrica y
  ancha, en la línea del logotipo) e Inter para interfaz y lectura larga.
- **Logotipo** (`src/components/BrandLogo.tsx`): reconstruido en SVG — la "D"
  con su racimo de nodos, el wordmark y el nodo-antena sobre la "d" de *Red*.

### Imágenes

Las imágenes son **generadas proceduralmente** con la paleta oficial: el globo
de red (continentes punteados, malla de nodos enlazados y halo atmosférico) más
nebulosas, auroras y rayos de luz. No dependen de ningún servicio externo ni de
licencias de terceros. Para regenerarlas o ajustar paletas:

```bash
npm run assets
```

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npx expo start` | Arranca el servidor de desarrollo (QR para Expo Go) |
| `npm run typecheck` | TypeScript en modo estricto |
| `npm run assets` | Regenera las imágenes cósmicas |
| `npm run web` | Abre la app en el navegador (útil para revisar diseño) |
| `npm run demo` | Empaqueta la app en un solo HTML para compartir (ver abajo) |

---

## Compartir la app sin instalar nada

La app se puede empaquetar en **un único archivo HTML** —bundle, imágenes y
tipografías incluidos— que se abre en cualquier navegador, también en el
teléfono:

```bash
ASSET_SCALE=0.58 node scripts/generate-assets.js      # imágenes ligeras
npx expo export --platform web --output-dir /tmp/demo-web
npm run demo -- /tmp/demo-web desde-la-red-demo.html
node scripts/generate-assets.js                       # restaura la resolución
```

Pesa unos 9 MB y no depende de ningún servidor: se puede subir a cualquier
sitio, mandar por mensaje o abrir desde el propio archivo.

---

## Siguiente paso (cuando toque)

Conectar Supabase reemplazando `src/data/*` por consultas reales y cambiando
`src/store/app-store.tsx` para sincronizar contra el backend. La capa de UI no
necesita cambios: todos los componentes reciben datos por props.
