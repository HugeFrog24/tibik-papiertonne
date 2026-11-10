import { PaneFacingIn, type Pane } from "../building/PaneFacingIn";
import { drawnTexture } from "../toon/primitives";
import { BEAD_RIM, glassRain } from "./glassRain";

const TEXELS_PER_METRE = 1000;
const WATER = { bead: "rgba(214, 222, 230, 0.6)", rim: "rgba(70, 80, 92, 0.45)", film: "rgba(205, 215, 225, 0.3)", seal: "rgba(214, 222, 230, 0.55)" };

const drops = (pane: Pane) =>
  drawnTexture(`rain-on-glass-${pane.w}-${pane.h}`, Math.round(pane.w * TEXELS_PER_METRE), Math.round(pane.h * TEXELS_PER_METRE), (ctx, width, height) => {
    const rain = glassRain(pane);
    const u = (x: number) => (x + pane.w / 2) * TEXELS_PER_METRE;
    const v = (y: number) => (pane.h / 2 - y) * TEXELS_PER_METRE;
    const bead = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(u(x), v(y), r * TEXELS_PER_METRE, 0, 2 * Math.PI);
      ctx.fillStyle = WATER.bead;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(u(x), v(y), r * TEXELS_PER_METRE, ...BEAD_RIM);
      ctx.strokeStyle = WATER.rim;
      ctx.lineWidth = Math.max(0.6, r * TEXELS_PER_METRE * 0.35);
      ctx.stroke();
    };
    ctx.clearRect(0, 0, width, height);
    for (const run of rain.runs) {
      ctx.beginPath();
      run.path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(u(x), v(y));
        else ctx.lineTo(u(x), v(y));
      });
      ctx.strokeStyle = WATER.film;
      ctx.lineWidth = 2 * run.width * TEXELS_PER_METRE;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      bead(run.end.x, run.end.y, run.end.r);
    }
    for (const b of rain.beads) bead(b.x, b.y, b.r);
    ctx.fillStyle = WATER.seal;
    ctx.fillRect(0, height - rain.seal * TEXELS_PER_METRE, width, rain.seal * TEXELS_PER_METRE);
  });

export const RainOnGlass: React.FC<{ readonly pane: Pane; readonly wet: number }> = ({ pane, wet }) =>
  wet > 0 ? (
    <PaneFacingIn pane={pane}>
      <meshBasicMaterial map={drops(pane)} transparent opacity={wet} depthWrite={false} />
    </PaneFacingIn>
  ) : null;
