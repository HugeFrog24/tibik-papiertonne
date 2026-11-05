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
import { A4, CREASES, LETTER_LAYOUT, PT, letterPanels, sheetBow, type Panel } from "./letterShape";
import { paperRamp } from "../toon/paperRamp";

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
  for (const crease of CREASES) {
    for (const [width, alpha] of [[0.004, 0.035], [0.0012, 0.06]] as const) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, (crease - width / 2) * px, w, width * px);
    }
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

const SEGMENTS = { across: 16, down: 4 };

const OPENED_OUT = 0.8;

export const bowOf = (fold: number) => Math.max(0, (fold - OPENED_OUT) / (1 - OPENED_OUT));

export const panelGeometry = (panel: Panel, face: number, back: boolean, bow = 1) => {
  const [w, h] = panel.size;
  const g = new PlaneGeometry(w, h, SEGMENTS.across, SEGMENTS.down);
  g.translate(w / 2, h / 2, 0);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) p.setZ(i, face + bow * sheetBow(p.getX(i)));
  if (back) {
    const index = g.getIndex()!;
    for (let k = 0; k < index.count; k += 3) {
      const second = index.getX(k + 1);
      index.setX(k + 1, index.getX(k + 2));
      index.setX(k + 2, second);
    }
    index.needsUpdate = true;
  }
  g.computeVertexNormals();
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
  readonly bow: number;
}> = ({ panel, texture, spots, bow }) => {
  const geometry = useDisposable(() => panelGeometry(panel, PAPER.face, false, bow), [panel.fromTop, bow]);
  const back = useDisposable(() => panelGeometry(panel, -PAPER.face, true, bow), [panel.fromTop, bow]);
  const [w, h] = panel.size;
  const mine = spots.filter((s) => {
    const y = s.v * A4[1] - panel.fromTop;
    return y >= 0 && y < h;
  });
  return (
    <group matrixAutoUpdate={false} matrix={panel.matrix}>
      <mesh geometry={geometry} receiveShadow>
        <meshToonMaterial color="#ffffff" map={texture} gradientMap={paperRamp()} />
      </mesh>
      <mesh geometry={back} receiveShadow>
        <meshToonMaterial color={PAPER.colour} gradientMap={paperRamp()} />
      </mesh>
      {mine.map((s, i) => (
        <WetSpot
          key={i}
          point={
            new Vector3(s.u * w, h - (s.v * A4[1] - panel.fromTop), PAPER.face + bow * sheetBow(s.u * w))
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
          bow={bowOf(fold)}
        />
      ))}
    </group>
  );
};
