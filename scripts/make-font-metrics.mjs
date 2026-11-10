import { writeFileSync } from "node:fs";

const FONTS = {
  bangers:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/bangers/Bangers-Regular.ttf",
  comicNeue:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/comicneue/ComicNeue-Bold.ttf",
  arimo:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/arimo/Arimo%5Bwght%5D.ttf",
};

const ascii = Array.from({ length: 95 }, (_, i) =>
  String.fromCharCode(32 + i),
).join("");
const CHARS = `${ascii}ÄÖÜäöüß…„“”–—€«»`;

const tables = (font) => {
  const count = font.getUint16(4);
  const found = {};
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(
      ...[0, 1, 2, 3].map((k) => font.getUint8(at + k)),
    );
    found[tag] = font.getUint32(at + 8);
  }
  return found;
};

const glyphOf = (font, cmap) => {
  const subtables = font.getUint16(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const at = cmap + 4 + i * 8;
    const platform = font.getUint16(at);
    const encoding = font.getUint16(at + 2);
    const table = cmap + font.getUint32(at + 4);
    if (platform !== 3 || encoding !== 1 || font.getUint16(table) !== 4)
      continue;
    const segments = font.getUint16(table + 6) / 2;
    const ends = table + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const offsets = deltas + segments * 2;
    return (code) => {
      for (let s = 0; s < segments; s++) {
        if (font.getUint16(ends + s * 2) < code) continue;
        const start = font.getUint16(starts + s * 2);
        if (start > code) return 0;
        const delta = font.getInt16(deltas + s * 2);
        const offset = font.getUint16(offsets + s * 2);
        if (offset === 0) return (code + delta) & 0xffff;
        const glyph = font.getUint16(
          offsets + s * 2 + offset + (code - start) * 2,
        );
        return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
      }
      return 0;
    };
  }
  throw new Error("no Unicode BMP cmap");
};

const metricsOf = (bytes) => {
  const font = new DataView(bytes);
  const t = tables(font);
  const unitsPerEm = font.getUint16(t.head + 18);
  const longMetrics = font.getUint16(t.hhea + 34);
  const glyph = glyphOf(font, t.cmap);
  const advanceOf = (g) =>
    font.getUint16(t.hmtx + Math.min(g, longMetrics - 1) * 4);
  const advance = {};
  for (const ch of CHARS) {
    const g = glyph(ch.codePointAt(0));
    if (g !== 0) advance[ch] = advanceOf(g);
  }
  return { unitsPerEm, advance };
};

const out = {};
for (const [name, url] of Object.entries(FONTS)) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  out[name] = metricsOf(await response.arrayBuffer());
}
writeFileSync(
  "src/dialogue/fontMetrics.ts",
  `export const FONT_METRICS = ${JSON.stringify(out, null, 2)} as const;\n`,
);
console.log(
  Object.entries(out)
    .map(
      ([name, m]) =>
        `${name}: ${Object.keys(m.advance).length} glyphs, ${m.unitsPerEm} units/em`,
    )
    .join("; "),
);
