import { DECAL, drawnTexture, type Vec3 } from "../toon/primitives";
import { ROAD_DECAL_Y } from "./decalPlane";
import { GULLIES, GULLY, MANHOLE, MANHOLES } from "./drainShape";

const IRON = "#3b3e42";
const WORN = "#585c61";
const SLOT = "#121314";

const gullyTexture = () =>
  drawnTexture("gully-300x500", 250, 150, (ctx, w, h) => {
    ctx.fillStyle = IRON;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = WORN;
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = SLOT;
    const slots = 9;
    const pitch = (w - 40) / slots;
    for (let i = 0; i < slots; i++)
      ctx.fillRect(24 + i * pitch, 24, pitch * 0.55, h - 48);
    ctx.strokeStyle = "#1c1d1f";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });

const manholeTexture = () =>
  drawnTexture("manhole-625", 256, 256, (ctx, w) => {
    const c = w / 2;
    const cover = c * (MANHOLE.opening / MANHOLE.frame);
    ctx.fillStyle = IRON;
    ctx.fillRect(0, 0, w, w);
    ctx.beginPath();
    ctx.arc(c, c, cover, 0, 2 * Math.PI);
    ctx.fillStyle = WORN;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = IRON;
    for (let y = c - cover; y < c + cover; y += 16)
      for (let x = c - cover; x < c + cover; x += 16)
        ctx.fillRect(x + 4, y + 4, 8, 8);
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#1c1d1f";
    ctx.beginPath();
    ctx.arc(c, c, cover, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, c - 3, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = SLOT;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(c + side * cover * 0.7, c, 9, 5, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

const UNSCALED: Vec3 = [1, 1, 1];

export const Decal: React.FC<{
  readonly x: number;
  readonly z: number;
  readonly y?: number | undefined;
  readonly scale?: Vec3;
  readonly renderOrder?: number;
  readonly children: React.ReactNode;
}> = ({ x, z, y = ROAD_DECAL_Y, scale = UNSCALED, renderOrder = 0, children }) => (
  <mesh
    position={[x, y, z]}
    rotation={[-Math.PI / 2, 0, 0]}
    scale={scale}
    renderOrder={renderOrder}
    receiveShadow
  >
    {children}
  </mesh>
);

export const Drains: React.FC = () => (
  <>
    {GULLIES.map((g) => (
      <Decal key={`${g.far}-${g.x}`} x={g.x} z={g.z}>
        <planeGeometry args={[GULLY.along, GULLY.across]} />
        <meshToonMaterial map={gullyTexture()} {...DECAL} />
      </Decal>
    ))}
    {MANHOLES.map((m) => (
      <Decal key={m.x} x={m.x} z={m.z}>
        <circleGeometry args={[MANHOLE.frame / 2, 48]} />
        <meshToonMaterial map={manholeTexture()} {...DECAL} />
      </Decal>
    ))}
  </>
);
