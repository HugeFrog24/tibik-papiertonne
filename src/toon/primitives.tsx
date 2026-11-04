import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { useDisposable } from "./useDisposable";
import { useThree } from "@react-three/fiber";
import { random } from "remotion";
import {
  BackSide,
  BoxGeometry,
  CatmullRomCurve3,
  CanvasTexture,
  Color,
  Euler,
  type PerspectiveCamera,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TubeGeometry,
  Vector3,
} from "three";

export type Vec3 = [number, number, number];
export const addVec = (a: readonly number[], b: readonly number[]): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export type Paint = string | Color;

export const OUTLINE = 0.014;
export const ANISOTROPY = 8;

const toonCanvasTexture = (canvas: HTMLCanvasElement) => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
};
export const INK = "#151515";

export const DECAL = {
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -4,
} as const;

export type Speckle = {
  readonly seed: string;
  readonly count: number;
  readonly base: readonly number[];
  readonly lightShare: number;
  readonly light: readonly [number, number];
  readonly dark: readonly [number, number];
};

export const speckle = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  { seed, count, base, lightShare, light, dark }: Speckle,
) => {
  for (let i = 0; i < count; i++) {
    const x = random(`${seed}-x-${i}`) * w;
    const y = random(`${seed}-y-${i}`) * h;
    const r = random(`${seed}-r-${i}`);
    const size = 1 + Math.floor(random(`${seed}-s-${i}`) * 3);
    const shift =
      r < lightShare
        ? light[0] + r * light[1]
        : -dark[0] - (r - lightShare) * dark[1];
    ctx.fillStyle = `rgb(${base.map((c) => Math.round(c + shift)).join(",")})`;
    for (const dx of [0, -w])
      for (const dy of [0, -h]) ctx.fillRect(x + dx, y + dy, size, size);
  }
};

export const alongSegment = (axis: Vector3, from: Vector3, to: Vector3) => {
  const along = to.clone().sub(from);
  return {
    length: along.length(),
    turn: new Quaternion().setFromUnitVectors(axis, along.normalize()),
  };
};

export const euler = (x: number, y: number, z: number, order: "XYZ" | "YXZ") =>
  new Euler(x, y, z, order);

export const InkHull: React.FC = () => (
  <meshBasicMaterial color={INK} side={BackSide} />
);

type MeshLook = {
  readonly detail?: readonly [number, number];
  readonly castShadow?: boolean;
  readonly userData?: Record<string, unknown>;
};

const InkedMesh: React.FC<{
  readonly position?: Vec3 | Vector3;
  readonly rotation?: Vec3 | Euler;
  readonly color: Paint;
  readonly map?: Texture;
  readonly ink: number;
  readonly outline?: boolean;
  readonly castShadow?: boolean;
  readonly receiveShadow?: boolean;
  readonly userData?: Record<string, unknown>;
  readonly shape: (grow: number) => ReactNode;
  readonly scaleOf?: (grow: number) => Vec3;
}> = ({
  position,
  rotation,
  color,
  map,
  ink,
  outline = true,
  castShadow = true,
  receiveShadow = true,
  userData,
  shape,
  scaleOf,
}) => (
  <group position={position} rotation={rotation}>
    <mesh
      scale={scaleOf?.(0)}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      userData={userData}
    >
      {shape(0)}
      <meshToonMaterial color={color} map={map} />
    </mesh>
    {outline ? (
      <mesh scale={scaleOf?.(ink)}>
        {shape(ink)}
        <InkHull />
      </mesh>
    ) : null}
  </group>
);

export const Blob: React.FC<
  {
    readonly position?: Vec3 | Vector3;
    readonly rotation?: Vec3 | Euler;
    readonly scale: Vec3 | number;
    readonly color: Paint;
    readonly outline?: boolean;
    readonly ink?: number;
  } & MeshLook
> = ({
  position,
  rotation,
  scale,
  color,
  outline = true,
  ink = OUTLINE,
  detail = [48, 32],
  castShadow = true,
  userData,
}) => {
  const s: Vec3 = typeof scale === "number" ? [scale, scale, scale] : scale;
  return (
    <InkedMesh
      position={position}
      rotation={rotation}
      color={color}
      ink={ink}
      outline={outline}
      castShadow={castShadow}
      userData={userData}
      shape={() => <sphereGeometry args={[1, ...detail]} />}
      scaleOf={(grow) => [s[0] + grow, s[1] + grow, s[2] + grow]}
    />
  );
};

export const Segment: React.FC<
  {
    readonly length: number;
    readonly radius: number;
    readonly color: Paint;
    readonly ink?: number;
  } & MeshLook
> = ({
  length,
  radius,
  color,
  ink = OUTLINE,
  detail = [8, 24],
  castShadow = true,
  userData,
}) => (
  <InkedMesh
    position={[0, -length / 2, 0]}
    color={color}
    ink={ink}
    castShadow={castShadow}
    userData={userData}
    shape={(grow) => (
      <capsuleGeometry args={[radius + grow, length, ...detail]} />
    )}
  />
);

const SEGMENT_AXIS = new Vector3(0, -1, 0);

export const SegmentBetween: React.FC<
  {
    readonly from: Vector3 | Vec3;
    readonly to: Vector3 | Vec3;
    readonly radius: number;
    readonly color: Paint;
    readonly ink?: number;
  } & MeshLook
> = ({ from, to, ...look }) => {
  const a = from instanceof Vector3 ? from : new Vector3(...from);
  const b = to instanceof Vector3 ? to : new Vector3(...to);
  const { length, turn } = alongSegment(SEGMENT_AXIS, a, b);
  return (
    <group position={a} quaternion={turn}>
      <Segment length={length} {...look} />
    </group>
  );
};

export const ToonBox: React.FC<{
  readonly position?: Vec3;
  readonly rotation?: Vec3 | Euler;
  readonly size: Vec3;
  readonly color: Paint;
  readonly outline?: boolean;
  readonly map?: Texture;
  readonly ink?: number;
}> = ({
  position,
  rotation,
  size,
  color,
  outline = true,
  map,
  ink = OUTLINE,
}) => (
  <InkedMesh
    position={position}
    rotation={rotation}
    color={color}
    map={map}
    ink={ink}
    outline={outline}
    shape={(grow) => (
      <boxGeometry
        args={[size[0] + grow * 2, size[1] + grow * 2, size[2] + grow * 2]}
      />
    )}
  />
);

export const ToonTorus: React.FC<{
  readonly position?: Vec3 | Vector3;
  readonly rotation?: Vec3 | Euler;
  readonly radius: number;
  readonly tube: number;
  readonly color: Paint;
  readonly ink?: number;
  readonly segments?: readonly [number, number];
  readonly receiveShadow?: boolean;
}> = ({
  position,
  rotation,
  radius,
  tube,
  color,
  ink = OUTLINE,
  segments = [10, 40],
  receiveShadow = false,
}) => (
  <InkedMesh
    position={position}
    rotation={rotation}
    color={color}
    ink={ink}
    receiveShadow={receiveShadow}
    shape={(grow) => (
      <torusGeometry args={[radius, tube + grow, ...segments]} />
    )}
  />
);

export const ToonCylinder: React.FC<{
  readonly position?: Vec3;
  readonly rotation?: Vec3 | Euler;
  readonly radius: number | readonly [number, number];
  readonly height: number;
  readonly segments: number;
  readonly color: Paint;
  readonly capped?: boolean;
  readonly ink?: number;
}> = ({
  position,
  rotation,
  radius,
  height,
  segments,
  color,
  capped = true,
  ink = OUTLINE,
}) => {
  const [top, bottom] = typeof radius === "number" ? [radius, radius] : radius;
  return (
    <InkedMesh
      position={position}
      rotation={rotation}
      color={color}
      ink={ink}
      receiveShadow={false}
      shape={(grow) => (
        <cylinderGeometry
          args={[
            top + grow,
            bottom + grow,
            capped ? height + grow : height,
            segments,
          ]}
        />
      )}
    />
  );
};

export const useTaperedBox = (
  width: number,
  height: number,
  depth: number,
  taper: number,
  openTop: boolean,
) => {
  return useDisposable(() => {
    const geometry = new BoxGeometry(width, height, depth);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      if (position.getY(i) < 0) {
        position.setX(i, position.getX(i) * taper);
        position.setZ(i, position.getZ(i) * taper);
      }
    }
    if (openTop) {
      const index = Array.from(geometry.getIndex()!.array);
      geometry.setIndex([...index.slice(0, 12), ...index.slice(18)]);
      geometry.clearGroups();
    }
    geometry.computeVertexNormals();
    geometry.translate(0, height / 2, 0);
    return geometry;
  }, [width, height, depth, taper, openTop]);
};

export const InkLine: React.FC<{
  readonly points: Vec3[];
  readonly radius: number;
  readonly caps?: "start" | "both";
}> = ({ points, radius, caps = "both" }) => {
  const geometry = useDisposable(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const segments = 48;
    const radial = 12;
    const tube = new TubeGeometry(curve, segments, radius, radial, false);
    if (caps === "start") {
      const position = tube.attributes.position;
      const vertex = new Vector3();
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const width = 0.25 + 0.75 * Math.min(1, (1 - u) / 0.35);
        const center = curve.getPointAt(u);
        for (let j = 0; j <= radial; j++) {
          const index = i * (radial + 1) + j;
          vertex
            .fromBufferAttribute(position, index)
            .sub(center)
            .multiplyScalar(width)
            .add(center);
          position.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
      }
    }
    return tube;
  }, [points, radius, caps]);
  const ends =
    caps === "both" ? [points[0], points[points.length - 1]] : [points[0]];
  return (
    <>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={INK} />
      </mesh>
      {ends.map((end, i) => (
        <mesh key={i} position={end}>
          <sphereGeometry args={[radius, 12, 8]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
    </>
  );
};

export const useLabelTexture = (
  text: string,
  background: string,
  foreground: string,
  aspect: number,
) => {
  return useMemo(() => {
    const height = 256;
    const width = Math.round(height * aspect);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    framedCard(ctx, width, height, background, foreground, 14, 12);
    ctx.fillStyle = foreground;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = 170;
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    while (ctx.measureText(text).width > width - 70) {
      fontSize -= 6;
      ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    }
    ctx.fillText(text, width / 2, height / 2 + 8);
    return toonCanvasTexture(canvas);
  }, [text, background, foreground, aspect]);
};

const drawnTextures = new Map<string, CanvasTexture>();
export const drawnTexture = (
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
) => {
  const cached = drawnTextures.get(key);
  if (cached) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!, width, height);
  const texture = toonCanvasTexture(canvas);
  drawnTextures.set(key, texture);
  return texture;
};

export const framedCard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  lineWidth: number,
  inset = lineWidth / 2,
) => {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(inset, inset, width - 2 * inset, height - 2 * inset);
};

export const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight = "bold",
  family = "Arial, Helvetica, sans-serif",
) => {
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 6) {
    fontSize -= 2;
    ctx.font = `${weight} ${fontSize}px ${family}`;
  }
  ctx.fillText(text, x, y);
};

export const usePavingTexture = (repeatX: number, repeatY: number) => {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const tiles = 4;
    const tile = size / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        const shade = 178 + ((x * 7 + y * 13) % 5) * 4;
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade - 6})`;
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    ctx.strokeStyle = "#7d7b75";
    ctx.lineWidth = 6;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, size);
      ctx.moveTo(0, i * tile);
      ctx.lineTo(size, i * tile);
      ctx.stroke();
    }
    const texture = toonCanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }, [repeatX, repeatY]);
};

export const WORLD_UP: Vec3 = [0, 1, 0];

export const CameraRig: React.FC<{
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  readonly up?: Vec3;
}> = ({ position, target, fov, up = WORLD_UP }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.03;
    camera.up.set(...up);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};
