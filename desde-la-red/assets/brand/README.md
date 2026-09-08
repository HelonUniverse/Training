# Assets oficiales de marca

Suelta aquí los archivos reales de **Desde la Red**, con estos nombres exactos.
La app los toma automáticamente; no hay que tocar código.

| Archivo | Qué es | Formato ideal |
|---|---|---|
| `logo.png` | El logotipo completo ("Desde la Red" con la D de nodos) | PNG con **fondo transparente**, ancho ≥ 1200 px |
| `keyart.png` | El key art completo: el globo de red sobre el espacio | PNG o JPG, vertical, ancho ≥ 1200 px |

Si además tienes el logotipo en **SVG**, mándalo igual: es mejor, porque escala
sin perder nitidez en cualquier tamaño.

Después de reemplazar los archivos, activa su uso en `src/brand.ts`:

```ts
export const brand = {
  useOfficialLogo: true,    // usa assets/brand/logo.png
  useOfficialKeyArt: true,  // usa assets/brand/keyart.png
};
```

Mientras estén en `false`, la app usa la reconstrucción provisional
(logotipo dibujado en SVG y globo generado por código).
