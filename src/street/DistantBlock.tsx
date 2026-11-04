import { ToonBox, drawnTexture } from "../toon/primitives";
import {
  BALCONIES,
  balconyParts,
  BLOCK_SPAN,
  BUILDING_HEIGHT,
  ENTRANCE_X,
  FACADE_Z,
  OPENINGS,
  openingFrame,
} from "./building";
import { HAUSTUER } from "./facade";

const PIXELS_PER_METRE = 40;
const FRAME = "#f6f5f0";
const GLASS = "#6d8ba3";
const SHUTTER = "#c9c6bf";
const RAILING = "#4d5257";
const DOOR = {
  width: HAUSTUER.width,
  height: HAUSTUER.height,
  bottom: HAUSTUER.hinge[1],
};

const facadeTexture = (number: string, plaster: string) =>
  drawnTexture(
    `distant-facade-${number}-${plaster}`,
    BLOCK_SPAN * PIXELS_PER_METRE,
    Math.round(BUILDING_HEIGHT * PIXELS_PER_METRE),
    (ctx, w, h) => {
      const px = (x: number) => (x + BLOCK_SPAN / 2) * PIXELS_PER_METRE;
      const py = (y: number) => h - y * PIXELS_PER_METRE;
      const box = (
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
      ) => {
        ctx.fillStyle = color;
        ctx.fillRect(
          px(x - width / 2),
          py(y + height / 2),
          width * PIXELS_PER_METRE,
          height * PIXELS_PER_METRE,
        );
      };
      ctx.fillStyle = plaster;
      ctx.fillRect(0, 0, w, h);
      box(0, 0.275, BLOCK_SPAN, 0.55, "#8f877b");
      box(0, 3.45, BLOCK_SPAN, 0.12, "#d9caa9");
      for (const opening of OPENINGS) {
        const [fw, fh] = openingFrame(opening);
        box(opening.x, opening.y, fw, fh, FRAME);
        box(opening.x, opening.y, fw - 0.17, fh - 0.17, GLASS);
        box(opening.x, opening.y, 0.06, fh - 0.17, FRAME);
        if (opening.shutter > 0) {
          const covered = (fh - 0.17) * opening.shutter;
          box(
            opening.x,
            opening.y + (fh - 0.17) / 2 - covered / 2,
            fw - 0.17,
            covered,
            SHUTTER,
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
}> = ({ x, number, plaster }) => (
  <group position={[x, 0, 0]}>
    <ToonBox
      position={[0, BUILDING_HEIGHT / 2, FACADE_Z - 0.2]}
      size={[BLOCK_SPAN, BUILDING_HEIGHT, 0.4]}
      color={plaster}
    />
    <mesh position={[0, BUILDING_HEIGHT / 2, FACADE_Z + 0.003]}>
      <planeGeometry args={[BLOCK_SPAN, BUILDING_HEIGHT]} />
      <meshToonMaterial map={facadeTexture(number, plaster)} />
    </mesh>
    <ToonBox
      position={[0, BUILDING_HEIGHT + 0.1, FACADE_Z - 0.15]}
      size={[BLOCK_SPAN, 0.2, 0.5]}
      color="#b9b2a3"
    />
    {BALCONIES.map((b) => (
      <group key={`${b.x}-${b.y}`} position={[b.x, b.y, FACADE_Z]}>
        {balconyParts(b.y).map((part, i) => (
          <ToonBox
            key={i}
            position={part.center}
            size={part.size}
            color={part.name === "slab" ? "#a9a59c" : RAILING}
          />
        ))}
      </group>
    ))}
  </group>
);
