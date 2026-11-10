import { Euler } from "three";
import { ToonBox, drawnTexture, fitText } from "../toon/primitives";
import {
  DIGITS,
  FACE,
  KEY,
  PHONE,
  SCREEN,
  keyPixel,
  type PhonePlace,
} from "./phoneShape";

const BODY = "#8e1b1b";
const CALL_KEYS = [
  { key: "call", color: "#3f9b4a" },
  { key: "end", color: "#c8402f" },
] as const;

const face = (screen: string) =>
  drawnTexture(
    `senior-phone-${screen}`,
    FACE.width,
    FACE.height,
    (ctx, w, h) => {
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#b9dcc5";
      ctx.fillRect(SCREEN.left, SCREEN.top, SCREEN.width, SCREEN.height);
      ctx.fillStyle = "#1d2b22";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (screen)
        fitText(
          ctx,
          screen,
          SCREEN.left + SCREEN.width / 2,
          SCREEN.top + SCREEN.height / 2,
          SCREEN.width - 8,
          30,
        );
      for (const { key, color } of CALL_KEYS) {
        const [x, y] = keyPixel(key);
        ctx.fillStyle = color;
        ctx.fillRect(x - 18, y - 10, 36, 20);
      }
      for (const key of DIGITS) {
        const [x, y] = keyPixel(key);
        ctx.fillStyle = "#e9e6dd";
        ctx.fillRect(
          x - KEY.width / 2,
          y - KEY.height / 2,
          KEY.width,
          KEY.height,
        );
        ctx.fillStyle = "#151515";
        fitText(ctx, key, x, y + 1, 20, 22);
      }
    },
  );

export const Phone: React.FC<{
  readonly place: PhonePlace;
  readonly screen: string;
}> = ({ place, screen }) => {
  return (
    <group position={place.position} rotation={new Euler(...place.rotation)}>
      <ToonBox size={PHONE.size} color={BODY} ink={PHONE.ink} />
      <mesh position={[0, 0, PHONE.size[2] / 2 + 0.0008]}>
        <planeGeometry
          args={[PHONE.size[0] * FACE.cover[0], PHONE.size[1] * FACE.cover[1]]}
        />
        <meshBasicMaterial map={face(screen)} />
      </mesh>
    </group>
  );
};
