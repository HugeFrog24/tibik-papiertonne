import { RepeatWrapping, type Texture } from "three";
import { drawnTexture } from "../toon/primitives";
import { seeded } from "../physics/seeded";

const grain = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colours: { base: string; dark: string; light: string },
  seed: number,
  knots: number,
) => {
  const random = seeded(seed);
  ctx.fillStyle = colours.base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = random() < 0.5 ? colours.dark : colours.light;
    ctx.globalAlpha = 0.25 + 0.35 * random();
    ctx.lineWidth = 0.5 + 2 * random();
    const x = random() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= h; y += h / 8)
      ctx.lineTo(x + Math.sin(y * 0.05 + i) * (3 + 6 * random()), y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let k = 0; k < knots; k++) {
    ctx.fillStyle = colours.dark;
    ctx.beginPath();
    ctx.ellipse(
      random() * w,
      random() * h,
      2 + 3 * random(),
      6 + 8 * random(),
      0,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
};

export const WALL_WHITE = "#f3f1ec";

export const WOOD = {
  oak: { base: "#a8682f", dark: "#5e3713", light: "#c98a4c" },
  alder: { base: "#d08a45", dark: "#a8642a", light: "#e3a565" },
};

export const wildOak = () =>
  drawnTexture("wild-oak", 128, 256, (ctx, w, h) => { grain(ctx, w, h, WOOD.oak, 77, 5); },
  );

export const alder = () =>
  drawnTexture("alder", 128, 256, (ctx, w, h) => { grain(ctx, w, h, WOOD.alder, 31, 0); },
  );

export const patternGlass = () =>
  drawnTexture("pattern-glass", 128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e9ecee";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#c9cfd4";
    for (let y = 2; y < h; y += 6)
      for (let x = 2; x < w; x += 6) ctx.fillRect(x, y, 3, 3);
  });

export const clockFace = () =>
  drawnTexture("clock-face", 256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b9f0a8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * 2 * Math.PI;
      ctx.font = n % 3 === 0 ? "bold 46px sans-serif" : "bold 20px sans-serif";
      ctx.fillText(
        String(n),
        w / 2 + Math.sin(a) * w * 0.36,
        h / 2 - Math.cos(a) * h * 0.36,
      );
    }
    ctx.strokeStyle = "#b9f0a8";
    ctx.lineCap = "round";
    const hand = (turn: number, length: number, width: number) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(
        w / 2 + Math.sin(turn * 2 * Math.PI) * length,
        h / 2 - Math.cos(turn * 2 * Math.PI) * length,
      );
      ctx.stroke();
    };
    hand(10.2 / 12, w * 0.2, 7);
    hand(0.6, w * 0.3, 4);
  });

export const laminate = (across: number, along: number): Texture => {
  const base = drawnTexture("laminate", 256, 512, (ctx, w, h) => {
    const random = seeded(909);
    const planks = 4;
    const tones = ["#8f7a5f", "#857055", "#9a8467", "#7d694f"];
    for (let p = 0; p < planks; p++) {
      const x = (p * w) / planks;
      const offset = random() * h;
      for (const y0 of [offset - h, offset]) {
        ctx.fillStyle = tones[Math.floor(random() * tones.length)];
        ctx.fillRect(x, y0, w / planks, h);
        ctx.strokeStyle = "#5c4b36";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y0, w / planks, h);
      }
      ctx.globalAlpha = 0.25;
      for (let g = 0; g < 10; g++) {
        ctx.strokeStyle = "#5c4b36";
        ctx.beginPath();
        const gx = x + random() * (w / planks);
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + 4 * (random() - 0.5), h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  });
  const texture = base.clone();
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(across / 0.8, along / 1.6);
  texture.needsUpdate = true;
  return texture;
};
