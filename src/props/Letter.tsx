import {
  Float32BufferAttribute,
  PlaneGeometry,
  Vector3,
  type Matrix4,
  type Texture,
} from "three";
import { WetSpot } from "../Karen/WetSpot";
import { useDisposable } from "../toon/useDisposable";
import { LETTER_FAMILY, useLetterTexture } from "./letterFont";
import { A4, LETTER_LAYOUT, PT, letterPanels, type Panel } from "./letterShape";

export const PAPER = {
  pxPerMetre: 10_000,
  colour: "#fbfaf6",
  ink: "#1d1d1d",
  rule: "#8a8f94",
  face: 0.00005,
  spotLift: 0.00003,
};

const LETTER_PX = [
  Math.round(A4[0] * PAPER.pxPerMetre),
  Math.round(A4[1] * PAPER.pxPerMetre),
] as const;

const paintLetter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const px = PAPER.pxPerMetre;
  ctx.fillStyle = PAPER.colour;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const line of LETTER_LAYOUT.lines) {
    ctx.font = `${line.bold ? 700 : 400} ${line.pt * PT * px}px ${LETTER_FAMILY}`;
    ctx.fillText(line.text, line.x * px, line.y * px);
  }
  const head = LETTER_LAYOUT.lines.find((l) => l.role === "head")!;
  ctx.fillStyle = PAPER.rule;
  ctx.fillRect(
    LETTER_LAYOUT.margins.left * px,
    (head.y + head.pt * PT * 1.45) * px,
    (A4[0] - LETTER_LAYOUT.margins.left - LETTER_LAYOUT.margins.right) * px,
    3,
  );
};

const panelGeometry = (panel: Panel) => {
  const [w, h] = panel.size;
  const g = new PlaneGeometry(w, h);
  g.translate(w / 2, h / 2, 0);
  const top = 1 - panel.fromTop / A4[1];
  const bottom = 1 - (panel.fromTop + h) / A4[1];
  const uv = g.getAttribute("uv");
  const mapped: number[] = [];
  for (let i = 0; i < uv.count; i++)
    mapped.push(uv.getX(i), bottom + uv.getY(i) * (top - bottom));
  g.setAttribute("uv", new Float32BufferAttribute(mapped, 2));
  return g;
};

const OUT = new Vector3(0, 0, 1);

const PanelView: React.FC<{
  readonly panel: Panel;
  readonly texture: Texture | null;
  readonly spots: readonly { u: number; v: number; r: number }[];
}> = ({ panel, texture, spots }) => {
  const geometry = useDisposable(() => panelGeometry(panel), [panel.fromTop]);
  const [w, h] = panel.size;
  const mine = spots.filter((s) => {
    const y = s.v * A4[1] - panel.fromTop;
    return y >= 0 && y < h;
  });
  return (
    <group matrixAutoUpdate={false} matrix={panel.matrix}>
      <mesh geometry={geometry} position={[0, 0, PAPER.face]} receiveShadow>
        <meshToonMaterial color="#ffffff" map={texture} />
      </mesh>
      <mesh
        position={[w / 2, h / 2, -PAPER.face]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[w, h]} />
        <meshToonMaterial color={PAPER.colour} />
      </mesh>
      {mine.map((s, i) => (
        <WetSpot
          key={i}
          point={
            new Vector3(s.u * w, h - (s.v * A4[1] - panel.fromTop), PAPER.face)
          }
          normal={OUT}
          radius={s.r}
          opacity={1}
          lift={PAPER.spotLift}
        />
      ))}
    </group>
  );
};

export const Letter: React.FC<{
  readonly matrix: Matrix4;
  readonly fold: number;
  readonly spots?: readonly { u: number; v: number; r: number }[];
}> = ({ matrix, fold, spots = [] }) => {
  const texture = useLetterTexture(
    "rundschreiben-letter",
    ...LETTER_PX,
    paintLetter,
  );
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      {letterPanels(fold).map((panel) => (
        <PanelView
          key={panel.fromTop}
          panel={panel}
          texture={texture}
          spots={spots}
        />
      ))}
    </group>
  );
};
