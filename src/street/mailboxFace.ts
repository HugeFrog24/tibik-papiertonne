import { fitText } from "../toon/primitives";
import { MAILBOX_GRID } from "./layout";

export const MAILBOX_COLOURS = {
  steel: "#53595f",
  border: "#2c3034",
  slot: "#1e2124",
  strip: "#f4f1e8",
  text: "#222222",
  inside: "#17191b",
};

type Cell = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export const drawMailboxCell = (
  ctx: CanvasRenderingContext2D,
  { x, y, w, h }: Cell,
  name: string,
  noAds: boolean,
) => {
  const { slot } = MAILBOX_GRID;
  ctx.strokeStyle = MAILBOX_COLOURS.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = MAILBOX_COLOURS.slot;
  ctx.fillRect(x + slot.x, y + slot.y, w - 2 * slot.x, slot.height);
  ctx.fillStyle = MAILBOX_COLOURS.strip;
  ctx.fillRect(x + 30, y + h - 40, w - 60, 22);
  ctx.fillStyle = MAILBOX_COLOURS.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, name, x + w / 2, y + h - 28, w - 70, 18, "normal");
  if (noAds) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 22, y + 44, w - 44, 38);
    ctx.fillStyle = "#c8102e";
    fitText(ctx, "Bitte keine Werbung!", x + w / 2, y + 63, w - 54, 16);
  }
};

export const drawMailboxInside = (
  ctx: CanvasRenderingContext2D,
  { x, y, w, h }: Cell,
) => {
  ctx.fillStyle = MAILBOX_COLOURS.inside;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = MAILBOX_COLOURS.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
};
