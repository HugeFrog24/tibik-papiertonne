import { DECAL, drawnTexture, fitText, framedCard } from "../toon/primitives";
import { Decal } from "./Drains";
import { PAVEMENT_DECAL_Y } from "./decalPlane";
import { HYDRANT, HYDRANT_SIGN, hydrantCap, metres } from "./layout";
import { useSignColor } from "../weather/DayLight";

const RED = "#c8102e";

const signTexture = () =>
  drawnTexture("hydrant-sign", 256, 200, (ctx, w, h) => {
    framedCard(ctx, w, h, "#ffffff", RED, 14);
    ctx.fillStyle = RED;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, `H ${HYDRANT.bore}`, w / 2, 56, w - 40, 60);
    ctx.fillRect(w / 2 - 3, 92, 6, 50);
    ctx.fillRect(34, 140, w - 68, 6);
    ctx.fillStyle = "#222222";
    fitText(
      ctx,
      metres(HYDRANT.side),
      w / 2 + HYDRANT.toward * 48,
      118,
      70,
      30,
    );
    fitText(ctx, metres(HYDRANT.ahead), w / 2, 166, 90, 30);
  });

const capTexture = () =>
  drawnTexture("hydrant-cap", 160, 120, (ctx, w, h) => {
    ctx.fillStyle = "#2f3134";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#46494d";
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#5c6064";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, "HYDRANT", w / 2, h / 2, w - 50, 16);
  });

export const Hydrant: React.FC = () => {
  const signColor = useSignColor();
  const cap = hydrantCap();
  return (
    <>
      <mesh position={HYDRANT_SIGN.center}>
        <planeGeometry args={[HYDRANT_SIGN.size[0], HYDRANT_SIGN.size[1]]} />
        <meshBasicMaterial color={signColor} map={signTexture()} />
      </mesh>
      <Decal
        x={cap.x}
        y={PAVEMENT_DECAL_Y}
        z={cap.z}
        scale={[HYDRANT.cap[0], HYDRANT.cap[1], 1]}
      >
        <circleGeometry args={[0.5, 40]} />
        <meshToonMaterial map={capTexture()} {...DECAL} />
      </Decal>
    </>
  );
};
