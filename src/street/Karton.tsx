import {
  ToonBox,
  drawnTexture,
  framedCard,
  type Vec3,
} from "../toon/primitives";
import {
  OLD_LABEL_DRAWING,
  PANEL,
  SHIPPING_LABELS,
  bottomFold,
  kartonFlaps,
  kartonPanels,
  type FlapOrder,
} from "./kartonShape";
import { useSignColor } from "../weather/DayLight";

const CARDBOARD = "#c49a6c";

const shippingLabelTexture = () =>
  drawnTexture("shipping-label", ...OLD_LABEL_DRAWING.size, (ctx, w, h) => {
    ctx.fillStyle = "#f6f3ec";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#222222";
    for (let x = 18, i = 0; x < w - 18; x += 5 + (i % 3) * 2, i++) {
      ctx.fillRect(x, 16, 2 + (i % 2), 40);
    }
    ctx.fillStyle = "#555555";
    OLD_LABEL_DRAWING.address.forEach((line) => ctx.fillRect(line.x, line.y, line.width, line.height));
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = OLD_LABEL_DRAWING.scribble.pen;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    OLD_LABEL_DRAWING.scribble.path.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  });
const freshLabelTexture = () =>
  drawnTexture("fresh-shipping-label", 296, 210, (ctx, w, h) => {
    framedCard(ctx, w, h, "#ffffff", "#1b1b1b", 2, 6);
    ctx.fillStyle = "#7a7a7a";
    [18, 30, 42].forEach((y, i) => ctx.fillRect(14, y, 70 - i * 10, 5));
    ctx.fillStyle = "#1b1b1b";
    for (let x = 140, i = 0; x < w - 14; x += 4 + (i % 4), i++)
      ctx.fillRect(x, 14, 1 + (i % 3), 44);
    ctx.fillStyle = "#3a3a3a";
    [96, 122, 148, 174].forEach((y, i) =>
      ctx.fillRect(40, y, w - 110 - i * 14, 11),
    );
  });
const CARDBOARD_DARK = "#b48a5c";

export const Karton: React.FC<{
  readonly position?: Vec3;
  readonly rotation?: Vec3;
  readonly size: Vec3;
  readonly open: number;
  readonly closed?: number;
  readonly order?: FlapOrder;
  readonly splay?: number;
  readonly relabelled?: boolean;
}> = ({
  position,
  rotation,
  size,
  open,
  closed = 0,
  order,
  splay,
  relabelled = false,
}) => {
  const signColor = useSignColor();
  const [, h, d] = size;
  const fold = bottomFold(open);
  const flaps = kartonFlaps(size, open, closed, order, splay);

  return (
    <group position={position} rotation={rotation}>
      {kartonPanels(size, open).map((panel, i) => (
        <group key={i} position={panel.center} rotation={[0, panel.angle, 0]}>
          <ToonBox
            position={[0, 0, -PANEL / 2]}
            size={[panel.length, h, PANEL]}
            color={i % 2 ? CARDBOARD_DARK : CARDBOARD}
          />
          <group position={flaps[i].hinge} rotation={[flaps[i].fold, 0, 0]}>
            <ToonBox
              position={[0, d / 4, 0]}
              size={[panel.length * 0.98, d / 2, PANEL]}
              color={CARDBOARD}
            />
          </group>
          <group
            position={[0, -h / 2, -PANEL / 2]}
            rotation={[(-Math.PI / 2 + (panel.short ? 0 : 0.05)) * fold, 0, 0]}
          >
            <ToonBox
              position={[0, -d / 4, 0]}
              size={[panel.length * 0.98, d / 2, PANEL]}
              color={CARDBOARD_DARK}
            />
          </group>
          {i === 0 ? (
            <mesh
              position={[
                panel.length * SHIPPING_LABELS.along,
                0,
                -PANEL - SHIPPING_LABELS.old.lift,
              ]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[...SHIPPING_LABELS.old.size]} />
              <meshBasicMaterial color={signColor} map={shippingLabelTexture()} />
            </mesh>
          ) : null}
          {i === 0 && relabelled ? (
            <mesh
              position={[
                panel.length * SHIPPING_LABELS.along,
                0,
                -PANEL - SHIPPING_LABELS.fresh.lift,
              ]}
              rotation={[0, Math.PI, 0]}
            >
              <planeGeometry args={[...SHIPPING_LABELS.fresh.size]} />
              <meshBasicMaterial color={signColor} map={freshLabelTexture()} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
};

export const Sheet: React.FC<{
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly size: Vec3;
  readonly material: "cardboard" | "paper";
}> = ({ position, rotation, size, material }) => (
  <ToonBox
    position={position}
    rotation={rotation}
    size={size}
    color={material === "cardboard" ? CARDBOARD : "#d9d3c3"}
    outline={material === "cardboard"}
  />
);
