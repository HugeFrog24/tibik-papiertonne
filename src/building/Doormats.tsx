import {
  Blob,
  DECAL,
  ToonBox,
  drawnTexture,
  fitText,
  speckle,
} from "../toon/primitives";
import { ONE_UNIT } from "../toon/inkWidth";
import {
  DOORMATS,
  MAT_THICKNESS,
  SHOE,
  SHOES,
  doormatRect,
  type Doormat,
  type MatStyle,
} from "./doormatShape";

const PX = 200;
const BORDER = 0.035;

const LOOK: Record<
  MatStyle,
  { readonly base: readonly number[]; readonly edge: string }
> = {
  coir: { base: [155, 118, 71], edge: "#6b4f2e" },
  welcome: { base: [155, 118, 71], edge: "#6b4f2e" },
  rubber: { base: [85, 88, 93], edge: "#33353a" },
  red: { base: [140, 47, 43], edge: "#5e1f1c" },
};

const matTexture = (mat: Doormat) => {
  const [depth, along] = mat.size;
  return drawnTexture(
    `doormat-${mat.style}-${along}x${depth}`,
    Math.round(PX * along),
    Math.round(PX * depth),
    (ctx, w, h) => {
      const { base, edge } = LOOK[mat.style];
      ctx.fillStyle = `rgb(${base.join(",")})`;
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, {
        seed: `doormat-${mat.style}`,
        count: Math.round((w * h) / 12),
        base,
        lightShare: 0.5,
        light: [6, 24],
        dark: [6, 24],
      });
      if (mat.style === "rubber") {
        ctx.fillStyle = edge;
        for (let y = 0.2 * h; y < 0.85 * h; y += 0.1 * h)
          ctx.fillRect(0.1 * w, y, 0.8 * w, 0.025 * h);
      }
      if (mat.style === "welcome") {
        ctx.fillStyle = "#3d2a17";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        fitText(ctx, "Willkommen", w / 2, h / 2, 0.8 * w, 0.32 * h);
      }
      const band = BORDER * PX;
      ctx.strokeStyle = edge;
      ctx.lineWidth = band;
      ctx.strokeRect(band / 2, band / 2, w - band, h - band);
    },
  );
};

export const Doormats: React.FC = () => (
  <>
    {DOORMATS.map((mat) => {
      const r = doormatRect(mat);
      const middle: [number, number, number] = [
        (r.x0 + r.x1) / 2,
        r.y + MAT_THICKNESS / 2,
        (r.z0 + r.z1) / 2,
      ];
      return (
        <group key={`${mat.storey}-${mat.side}`} userData={ONE_UNIT}>
          <ToonBox
            position={middle}
            size={[r.x1 - r.x0, MAT_THICKNESS, r.z1 - r.z0]}
            color={LOOK[mat.style].edge}
          />
          <group
            position={[middle[0], r.y + MAT_THICKNESS, middle[2]]}
            rotation={[0, mat.side === "links" ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[mat.size[1], mat.size[0]]} />
              <meshToonMaterial map={matTexture(mat)} {...DECAL} />
            </mesh>
          </group>
        </group>
      );
    })}
    {SHOES.map((shoe, i) => (
      <Blob key={i} position={shoe.position} scale={SHOE} color="#2b2b2b" />
    ))}
  </>
);
