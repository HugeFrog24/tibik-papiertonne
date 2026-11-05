import {
  CircleGeometry,
  Float32BufferAttribute,
  type Matrix4,
  type Texture,
} from "three";
import { WET, WetMaterial } from "../Karen/WetSpot";
import { NO_INK } from "../toon/inkWidth";
import { lerp } from "../characters/scalar";
import { useDisposable } from "../toon/useDisposable";
import { LETTER_FAMILY, useLetterTexture } from "./letterFont";
import { A4, CREASES, LETTER_LAYOUT, PT, letterPanels, sheetBow, type Panel } from "./letterShape";
import { paperRamp } from "../toon/paperRamp";
import { bentPlane } from "./bentPlane";

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
  const g = bentPlane(panel.size, [SEGMENTS.across, SEGMENTS.down], (x) => face + bow * sheetBow(x), back);
  const h = panel.size[1];
  const top = 1 - panel.fromTop / A4[1];
  const bottom = 1 - (panel.fromTop + h) / A4[1];
  const uv = g.getAttribute("uv");
  const mapped: number[] = [];
  for (let i = 0; i < uv.count; i++)
    mapped.push(uv.getX(i), bottom + uv.getY(i) * (top - bottom));
  g.setAttribute("uv", new Float32BufferAttribute(mapped, 2));
  return g;
};

type Spot = { readonly u: number; readonly v: number; readonly r: number };

const sheetHeight = (panel: Panel, x: number, face: number, bow: number) => {
  const step = panel.size[0] / SEGMENTS.across;
  const k = Math.min(SEGMENTS.across - 1, Math.max(0, Math.floor(x / step)));
  return face + bow * lerp(sheetBow(k * step), sheetBow((k + 1) * step), x / step - k);
};

const spotCentre = (spot: Spot, panel: Panel) =>
  [spot.u * panel.size[0], panel.size[1] - (spot.v * A4[1] - panel.fromTop)] as const;

export const spotOnPanel = (spot: Spot, panel: Panel) => {
  const [, y] = spotCentre(spot, panel);
  return y > -spot.r && y < panel.size[1] + spot.r;
};

export const paperSpotGeometry = (spot: Spot, panel: Panel, bow: number) => {
  const [cx, cy] = spotCentre(spot, panel);
  const g = new CircleGeometry(spot.r, WET.segments);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = Math.min(panel.size[0], Math.max(0, cx + p.getX(i)));
    const y = Math.min(panel.size[1], Math.max(0, cy + p.getY(i)));
    p.setXYZ(i, x, y, sheetHeight(panel, x, PAPER.face, bow) + PAPER.spotLift);
  }
  return g;
};

const PaperSpot: React.FC<{ readonly spot: Spot; readonly panel: Panel; readonly bow: number }> = ({ spot, panel, bow }) => {
  const geometry = useDisposable(() => paperSpotGeometry(spot, panel, bow), [spot.u, spot.v, spot.r, panel.fromTop, bow]);
  return (
    <mesh geometry={geometry} userData={NO_INK}>
      <WetMaterial opacity={1} />
    </mesh>
  );
};

const PanelView: React.FC<{
  readonly panel: Panel;
  readonly texture: Texture | null;
  readonly spots: readonly Spot[];
  readonly bow: number;
}> = ({ panel, texture, spots, bow }) => {
  const geometry = useDisposable(() => panelGeometry(panel, PAPER.face, false, bow), [panel.fromTop, bow]);
  const back = useDisposable(() => panelGeometry(panel, -PAPER.face, true, bow), [panel.fromTop, bow]);
  return (
    <group matrixAutoUpdate={false} matrix={panel.matrix}>
      <mesh geometry={geometry} receiveShadow>
        <meshToonMaterial color="#ffffff" map={texture} gradientMap={paperRamp()} />
      </mesh>
      <mesh geometry={back} receiveShadow>
        <meshToonMaterial color={PAPER.colour} gradientMap={paperRamp()} />
      </mesh>
      {spots.filter((s) => spotOnPanel(s, panel)).map((s, i) => (
        <PaperSpot key={i} spot={s} panel={panel} bow={bow} />
      ))}
    </group>
  );
};

export const Letter: React.FC<{
  readonly matrix: Matrix4;
  readonly fold: number;
  readonly spots?: readonly Spot[];
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
