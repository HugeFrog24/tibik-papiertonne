import { Matrix4, Vector3 } from "three";
import { random } from "remotion";
import { obb } from "../physics/collision";
import { textWidth } from "../dialogue/bubbleText";
import { LETTER_LINES, type LetterRole } from "../scenes/rundschreiben/letter";

export const A4 = [0.21, 0.297] as const;
export const FOLD_MARKS = [0.105, 0.21] as const;
export const CREASES = [0.1035, 0.209] as const;
const CREASE_MEMORY = { top: 0.12, bottom: 0.09 };
export const DL = [0.22, 0.11] as const;
export const PT = 0.0254 / 72;
export const LETTER_FONT = "arimo" as const;

const STYLE: Record<LetterRole, { readonly pt: number; readonly bold: boolean }> = {
  head: { pt: 14, bold: true },
  date: { pt: 11, bold: false },
  address: { pt: 11, bold: false },
  subject: { pt: 11, bold: true },
  body: { pt: 11, bold: false },
  thanks: { pt: 11, bold: false },
  signature: { pt: 11, bold: false },
};
const BOLD_WIDEN = 1.1;
const LEADING = 1.25 * 11 * PT;

const MARGINS = { left: 0.025, right: 0.02, top: 0.027 } as const;
const ROWS = {
  head: MARGINS.top,
  address: 0.0627,
  subject: 0.0985,
  salutation: 0.1085,
};

export type LetterLine = {
  readonly text: string;
  readonly role: LetterRole;
  readonly pt: number;
  readonly bold: boolean;
  readonly x: number;
  readonly y: number;
};

export const letterLineWidth = (line: {
  readonly text: string;
  readonly pt: number;
  readonly bold: boolean;
}) =>
  textWidth(line.text, LETTER_FONT, line.pt * PT, 0) *
  (line.bold ? BOLD_WIDEN : 1);

const GAP = { afterSalutation: 2, body: 1, beforeThanks: 2, beforeSignature: 2, signature: 3 };

const gapAfter = (role: LetterRole, next: LetterRole | undefined, first: boolean) =>
  first
    ? GAP.afterSalutation
    : role === "body" && next === "thanks"
      ? GAP.beforeThanks
      : role === "thanks"
        ? GAP.beforeSignature
        : role === "signature"
          ? GAP.signature
          : GAP.body;

const layout = (): LetterLine[] => {
  let next = ROWS.salutation;
  let flowing = 0;
  return LETTER_LINES.map(({ text, role }, i) => {
    const style = STYLE[role];
    const base = { text, role, ...style };
    if (role === "date") {
      const width = letterLineWidth(base);
      return { ...base, x: A4[0] - MARGINS.right - width, y: ROWS.address };
    }
    const fixed =
      role === "head" || role === "address" || role === "subject"
        ? ROWS[role]
        : null;
    if (fixed !== null) return { ...base, x: MARGINS.left, y: fixed };
    const y = next;
    next += gapAfter(role, LETTER_LINES[i + 1]?.role, flowing++ === 0) * LEADING;
    return { ...base, x: MARGINS.left, y };
  });
};

export const LETTER_LAYOUT = { margins: MARGINS, lines: layout() };

const PANEL_HEIGHTS = [
  CREASES[0],
  CREASES[1] - CREASES[0],
  A4[1] - CREASES[1],
] as const;
const STACK = { bottom: 0.00015, top: 0.0003 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type Panel = {
  readonly matrix: Matrix4;
  readonly size: readonly [number, number];
  readonly fromTop: number;
};

export const pointOnLetter = (
  letter: { readonly matrix: Matrix4; readonly fold: number },
  x: number,
  fromTop: number,
) => {
  const panel = letterPanels(letter.fold).find(
    (p) => fromTop >= p.fromTop && fromTop <= p.fromTop + p.size[1],
  )!;
  return new Vector3(x, panel.size[1] - (fromTop - panel.fromTop), 0)
    .applyMatrix4(panel.matrix)
    .applyMatrix4(letter.matrix);
};

const SHEET_THICKNESS = 0.0005;
const BOW = 0.0022;

export const sheetBow = (x: number) => {
  const u = (2 * x) / A4[0] - 1;
  return BOW * (1 - u * u);
};

export const letterSolids = (letter: { readonly matrix: Matrix4; readonly fold: number }) =>
  letterPanels(letter.fold).map((panel, i) =>
    obb(
      `letter panel ${i}`,
      letter.matrix.clone().multiply(panel.matrix),
      [panel.size[0], panel.size[1], SHEET_THICKNESS],
      [panel.size[0] / 2, panel.size[1] / 2, 0],
    ),
  );

export const letterPanels = (fold: number): Panel[] => {
  const [topH, middleH, bottomH] = PANEL_HEIGHTS;
  const topAngle = Math.max(CREASE_MEMORY.top, Math.PI * (1 - clamp01(2 * fold)));
  const bottomAngle = Math.max(CREASE_MEMORY.bottom, Math.PI * (1 - clamp01(2 * fold - 1)));
  const top = new Matrix4()
    .makeTranslation(0, middleH, STACK.top)
    .multiply(new Matrix4().makeRotationX(topAngle))
    .multiply(new Matrix4().makeTranslation(0, 0, -STACK.top));
  const bottom = new Matrix4()
    .makeTranslation(0, 0, STACK.bottom)
    .multiply(new Matrix4().makeRotationX(-bottomAngle))
    .multiply(new Matrix4().makeTranslation(0, -bottomH, -STACK.bottom));
  return [
    { matrix: top, size: [A4[0], topH], fromTop: 0 },
    { matrix: new Matrix4(), size: [A4[0], middleH], fromTop: CREASES[0] },
    { matrix: bottom, size: [A4[0], bottomH], fromTop: CREASES[1] },
  ];
};

export const ENVELOPE = {
  thickness: 0.0005,
  flapDepth: 0.04,
  flapChamfer: 0.004,
  gap: 0.0002,
  ink: 0,
};

export const FLAP_SWING = 1.25;

export const flapOutline = (): [number, number][] => [
  [0, 0],
  [DL[0], 0],
  [DL[0] - ENVELOPE.flapChamfer, -ENVELOPE.flapDepth],
  [ENVELOPE.flapChamfer, -ENVELOPE.flapDepth],
];

const TEAR = { depth: 0.026, slant: 0.006, jag: 0.0016, wander: 0.0015, points: 24 };

const flapSides = (y: number) => {
  const inset = (ENVELOPE.flapChamfer * -y) / ENVELOPE.flapDepth;
  return [inset, DL[0] - inset] as const;
};

const tearSpacing = () => {
  const widths = Array.from({ length: TEAR.points }, (_, i) => 0.25 + 1.75 * random(`flap-tear-gap/${i}`) ** 2);
  const total = widths.reduce((a, b) => a + b, 0);
  return widths.reduce<number[]>((at, w) => [...at, at[at.length - 1] + w / total], [0]);
};

const tearLine = (): [number, number][] =>
  tearSpacing().map((u, i) => {
    const end = i === 0 || i === TEAR.points;
    const ragged = end ? 0 : TEAR.jag * (2 * random(`flap-tear/${i}`) - 1);
    const wander = TEAR.wander * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * (1.3 * u + random("flap-tear-wander")));
    const y = -(TEAR.depth + TEAR.slant * (u - 0.5)) + ragged + wander;
    const [left, right] = flapSides(y);
    return [left + (right - left) * u, y];
  });

export const flapPieces = () => {
  const tear = tearLine();
  return {
    lifted: [[0, 0], [DL[0], 0], ...[...tear].reverse()] as [number, number][],
    glued: [
      ...tear,
      [DL[0] - ENVELOPE.flapChamfer, -ENVELOPE.flapDepth],
      [ENVELOPE.flapChamfer, -ENVELOPE.flapDepth],
    ] as [number, number][],
  };
};

export const tearY = (x: number) => {
  const tear = tearLine();
  const i = Math.max(1, tear.findIndex(([tx]) => tx >= x));
  const [x0, y0] = tear[i - 1];
  const [x1, y1] = tear[Math.min(i, tear.length - 1)];
  return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};

export const envelopeFlap = (open: number) =>
  new Matrix4()
    .makeTranslation(0, DL[1], -ENVELOPE.thickness - ENVELOPE.gap)
    .multiply(
      new Matrix4().makeRotationX(
        Math.PI * Math.min(FLAP_SWING, Math.max(0, open)),
      ),
    );

export const envelopeSag = (
  x: number,
  y: number,
  bow: number,
  twist: number,
) => {
  const u = (2 * x) / DL[0] - 1;
  const down = Math.max(0, 1 - y / DL[1]);
  return bow * (1 - u * u) * down + (twist * (1 + u) * down) / 2;
};

export const RAIN_ON_PAPER = {
  perSecond: 1.2,
  radius: [0.0015, 0.0035] as const,
  most: 120,
};

export const paperSpotsAt = (
  t: number,
  wetFrom: number,
): readonly { u: number; v: number; r: number }[] => {
  const spots: { u: number; v: number; r: number }[] = [];
  for (let k = 0; k < RAIN_ON_PAPER.most; k++) {
    const r = (key: string) => random(`paper-spot/${k}/${key}`);
    if (wetFrom + (k + r("when")) / RAIN_ON_PAPER.perSecond > t) break;
    const [small, large] = RAIN_ON_PAPER.radius;
    const radius = small + (large - small) * r("size");
    const u = radius / A4[0] + (1 - (2 * radius) / A4[0]) * r("u");
    const v = radius / A4[1] + (1 - (2 * radius) / A4[1]) * r("v");
    spots.push({ u, v, r: radius });
  }
  return spots;
};
