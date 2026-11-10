import { ToonBox, drawnTexture, glowMapOf } from "../toon/primitives";
import {
  BALCONIES,
  balconyParts,
  BLOCK_SPAN,
  BUILDING_HEIGHT,
  CORNICE,
  COPING,
  ENTRANCE_X,
  FACADE_Z,
  OPENINGS,
  OPENING_LAYERS,
  WINDOW_PAINT,
  openingFrame,
} from "./building";
import { MirrorFilm } from "./MirrorFilms";
import { distantGlass } from "./glassReflection";
import { HAUSTUER } from "./facade";
import { neighbourWindowsOn } from "./lightsOn";
import { PartBoxes } from "./PartBoxes";

const PIXELS_PER_METRE = 40;
const RAILING = "#4d5257";
const DOOR = {
  width: HAUSTUER.width,
  height: HAUSTUER.height,
  bottom: HAUSTUER.hinge[1],
};

const TEXTURE = [BLOCK_SPAN * PIXELS_PER_METRE, Math.round(BUILDING_HEIGHT * PIXELS_PER_METRE)] as const;

const boxPainter = (ctx: CanvasRenderingContext2D, h: number) => (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) => {
  ctx.fillStyle = color;
  ctx.fillRect(
    (x - width / 2 + BLOCK_SPAN / 2) * PIXELS_PER_METRE,
    h - (y + height / 2) * PIXELS_PER_METRE,
    width * PIXELS_PER_METRE,
    height * PIXELS_PER_METRE,
  );
};

const litTexture = (number: string, on: readonly number[]) =>
  drawnTexture(`distant-lit-${number}-${on.length}`, ...TEXTURE, (ctx, w, h) => {
    const box = boxPainter(ctx, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    for (const k of on) {
      const [fw, fh] = openingFrame(OPENINGS[k]);
      box(OPENINGS[k].x, OPENINGS[k].y, fw - 0.17, fh - 0.17, WINDOW_PAINT.lit);
    }
  });

const glassMask = () =>
  drawnTexture("distant-glass", ...TEXTURE, (ctx, w, h) => {
    const box = boxPainter(ctx, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    for (const g of distantGlass()) box((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, g.x1 - g.x0, g.y1 - g.y0, "#ffffff");
  });

const facadeTexture = (number: string, plaster: string) =>
  drawnTexture(
    `distant-facade-${number}-${plaster}`,
    ...TEXTURE,
    (ctx, w, h) => {
      const px = (x: number) => (x + BLOCK_SPAN / 2) * PIXELS_PER_METRE;
      const py = (y: number) => h - y * PIXELS_PER_METRE;
      const box = boxPainter(ctx, h);
      ctx.fillStyle = plaster;
      ctx.fillRect(0, 0, w, h);
      box(0, 0.275, BLOCK_SPAN, 0.55, "#8f877b");
      box(0, 3.45, BLOCK_SPAN, 0.12, "#d9caa9");
      for (const opening of OPENINGS) {
        const [fw, fh] = openingFrame(opening);
        box(opening.x, opening.y, fw, fh, WINDOW_PAINT.frame);
        box(opening.x, opening.y, fw - 0.17, fh - 0.17, WINDOW_PAINT.glass);
        box(opening.x, opening.y, 0.06, fh - 0.17, WINDOW_PAINT.frame);
        if (opening.shutter > 0) {
          const covered = (fh - 0.17) * opening.shutter;
          box(
            opening.x,
            opening.y + (fh - 0.17) / 2 - covered / 2,
            fw - 0.17,
            covered,
            WINDOW_PAINT.shutter,
          );
        }
      }
      box(
        ENTRANCE_X,
        DOOR.bottom + DOOR.height / 2,
        DOOR.width + 0.2,
        DOOR.height + 0.1,
        "#585e62",
      );
      box(
        ENTRANCE_X,
        DOOR.bottom + DOOR.height / 2,
        DOOR.width,
        DOOR.height,
        "#2f4a3d",
      );
      box(ENTRANCE_X + 0.95, 2.2, 0.3, 0.23, "#1f4e9c");
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(0.18 * PIXELS_PER_METRE)}px Arial, Helvetica, sans-serif`;
      ctx.fillText(number, px(ENTRANCE_X + 0.95), py(2.2));
    },
  );

export const DistantBlock: React.FC<{
  readonly x: number;
  readonly number: string;
  readonly plaster: string;
  readonly lit?: number | undefined;
}> = ({ x, number, plaster, lit = 0 }) => {
  const on = neighbourWindowsOn(number, lit);
  return (
  <group position={[x, 0, 0]}>
    <ToonBox
      position={[0, BUILDING_HEIGHT / 2, FACADE_Z - 0.2]}
      size={[BLOCK_SPAN, BUILDING_HEIGHT, 0.4]}
      color={plaster}
    />
    <mesh position={[0, BUILDING_HEIGHT / 2, FACADE_Z + 0.003]}>
      <planeGeometry args={[BLOCK_SPAN, BUILDING_HEIGHT]} />
      <meshToonMaterial
        map={facadeTexture(number, plaster)}
        {...glowMapOf(on.length > 0 ? litTexture(number, on) : undefined)}
      />
    </mesh>
    <MirrorFilm size={[BLOCK_SPAN, BUILDING_HEIGHT]} position={[0, BUILDING_HEIGHT / 2, FACADE_Z + OPENING_LAYERS.reflection]} mask={glassMask()} />
    <PartBoxes parts={[CORNICE]} color={COPING} />
    {BALCONIES.map((b) => (
      <group key={`${b.x}-${b.y}`} position={[b.x, b.y, FACADE_Z]}>
        <PartBoxes
          parts={balconyParts(b.y)}
          color={(part) => (part.name === "slab" ? "#a9a59c" : RAILING)}
        />
      </group>
    ))}
  </group>
  );
};
