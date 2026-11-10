import { RepeatWrapping } from "three";
import { DECAL, drawnTexture, framedCard, speckle } from "../toon/primitives";
import { ROAD_Y } from "./building";
import { Decal, Drains } from "./Drains";
import type { Footprint } from "./footprint";
import { ASPHALT, JOINT, PATCHES, ROAD_PLANE } from "./roadShape";

const SEAL = "#26282b";
const FRESH = "#404348";
const BASE = [75, 78, 83];
const TILE_PX = 512;
const PATCH_PX = 200;
const SEAL_BAND = 0.08;

const grain = (seed: string, count: number) => ({
  seed,
  count,
  base: BASE,
  lightShare: 0.4,
  light: [7, 20] as const,
  dark: [6, 6] as const,
});

const asphaltTexture = () => {
  const texture = drawnTexture("asphalt", TILE_PX, TILE_PX, (ctx, w, h) => {
    ctx.fillStyle = ASPHALT.base;
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, grain("asphalt", 9000));
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(
    ROAD_PLANE.length / ASPHALT.tile,
    ROAD_PLANE.depth / ASPHALT.tile,
  );
  return texture;
};

const patchTexture = (patch: Footprint, i: number) =>
  drawnTexture(
    `asphalt-patch-${i}`,
    Math.round(PATCH_PX * (patch.x[1] - patch.x[0])),
    Math.round(PATCH_PX * (patch.z[1] - patch.z[0])),
    (ctx, w, h) => {
      framedCard(ctx, w, h, FRESH, SEAL, SEAL_BAND * PATCH_PX);
      speckle(ctx, w, h, grain(`patch-${i}`, Math.round((w * h) / 160)));
      const band = SEAL_BAND * PATCH_PX;
      ctx.strokeRect(band / 2, band / 2, w - band, h - band);
    },
  );

export const Asphalt: React.FC = () => (
  <>
    <mesh
      position={[0, ROAD_Y, ROAD_PLANE.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[ROAD_PLANE.length, ROAD_PLANE.depth]} />
      <meshToonMaterial map={asphaltTexture()} />
    </mesh>
    <Decal x={0} z={JOINT.z}>
      <planeGeometry args={[ROAD_PLANE.length, JOINT.width]} />
      <meshToonMaterial color={SEAL} {...DECAL} />
    </Decal>
    {PATCHES.map((patch, i) => (
      <Decal
        key={i}
        x={(patch.x[0] + patch.x[1]) / 2}
        z={(patch.z[0] + patch.z[1]) / 2}
      >
        <planeGeometry
          args={[patch.x[1] - patch.x[0], patch.z[1] - patch.z[0]]}
        />
        <meshToonMaterial map={patchTexture(patch, i)} {...DECAL} />
      </Decal>
    ))}
    <Drains />
  </>
);
