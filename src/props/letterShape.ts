import { Matrix4 } from "three";
import { random } from "remotion";
import { textWidth } from "../dialogue/bubbleText";
import { LETTER_LINES, type LetterRole } from "../scenes/rundschreiben/letter";

export const A4 = [0.21, 0.297] as const;
export const FOLD_MARKS = [0.105, 0.21] as const;
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

const BELOW_SALUTATION = [2, 1, 1, 2, 2, 3];

const layout = (): LetterLine[] => {
  let next = ROWS.salutation;
  let bodyRow = 0;
  return LETTER_LINES.map(({ text, role }) => {
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
    next += (BELOW_SALUTATION[bodyRow++] ?? 1) * LEADING;
    return { ...base, x: MARGINS.left, y };
  });
};

export const LETTER_LAYOUT = { margins: MARGINS, lines: layout() };

const PANEL_HEIGHTS = [
  FOLD_MARKS[0],
  FOLD_MARKS[1] - FOLD_MARKS[0],
  A4[1] - FOLD_MARKS[1],
] as const;
const STACK = { bottom: 0.00015, top: 0.0003 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type Panel = {
  readonly matrix: Matrix4;
  readonly size: readonly [number, number];
  readonly fromTop: number;
};

export const letterPanels = (fold: number): Panel[] => {
  const [topH, middleH, bottomH] = PANEL_HEIGHTS;
  const topAngle = Math.PI * (1 - clamp01(2 * fold));
  const bottomAngle = Math.PI * (1 - clamp01(2 * fold - 1));
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
    { matrix: new Matrix4(), size: [A4[0], middleH], fromTop: FOLD_MARKS[0] },
    { matrix: bottom, size: [A4[0], bottomH], fromTop: FOLD_MARKS[1] },
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
