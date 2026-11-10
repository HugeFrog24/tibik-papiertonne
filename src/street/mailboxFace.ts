import { fitText } from "../toon/primitives";
import { MAILBOX_GRID, mailboxLockPx, mailboxTagPx } from "./layout";

export const MAILBOX_COLOURS = {
  steel: "#53595f",
  border: "#2c3034",
  slot: "#1e2124",
  strip: "#f4f1e8",
  text: "#222222",
  inside: "#17191b",
  lock: "#b8b3a6",
  flap: "#5d646a",
  lip: "#6a7279",
  highlight: "#7d868d",
};

type Cell = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

const drawFlap = (ctx: CanvasRenderingContext2D, { x, y, w }: Cell) => {
  const { flap } = MAILBOX_GRID;
  const left = x + (w - flap.width) / 2;
  const top = y + flap.top;
  ctx.fillStyle = MAILBOX_COLOURS.flap;
  ctx.fillRect(left, top, flap.width, flap.height);
  ctx.fillStyle = MAILBOX_COLOURS.highlight;
  ctx.fillRect(left, top, flap.width, 1.5);
  ctx.fillRect(left, top + flap.height - flap.lip.height - 1.5, flap.width, 1.5);
  ctx.fillStyle = MAILBOX_COLOURS.lip;
  ctx.fillRect(left, top + flap.height - flap.lip.height, flap.width, flap.lip.height);
  ctx.fillStyle = MAILBOX_COLOURS.border;
  ctx.fillRect(left, top + flap.height, flap.width, 2.5);
};

export const drawMailboxCell = (
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  name: string,
  noAds: boolean,
  flapLifted = false,
) => {
  const { x, y, w, h } = cell;
  const { slot, lock } = MAILBOX_GRID;
  ctx.strokeStyle = MAILBOX_COLOURS.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = MAILBOX_COLOURS.slot;
  ctx.fillRect(x + (w - slot.width) / 2, y + slot.top, slot.width, slot.height);
  if (!flapLifted) drawFlap(ctx, cell);
  const key = mailboxLockPx(cell);
  ctx.fillStyle = MAILBOX_COLOURS.lock;
  ctx.beginPath();
  ctx.arc(key.x, key.y, lock.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = MAILBOX_COLOURS.slot;
  ctx.fillRect(key.x - 1.5, key.y - lock.radius * 0.6, 3, lock.radius * 1.2);
  const tag = mailboxTagPx(cell);
  ctx.fillStyle = MAILBOX_COLOURS.strip;
  ctx.fillRect(tag.x, tag.y, tag.w, tag.h);
  ctx.fillStyle = MAILBOX_COLOURS.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, name, tag.x + tag.w / 2, tag.y + tag.h / 2 + 1, tag.w - 8, 16, "normal");
  if (noAds) {
    const left = tag.x + tag.w + 12;
    const right = key.x - lock.radius - 12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(left, tag.y - 4, right - left, tag.h + 8);
    ctx.fillStyle = "#c8102e";
    fitText(ctx, "Bitte keine Werbung!", (left + right) / 2, tag.y + tag.h / 2 + 1, right - left - 10, 15);
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
