import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  BackSide,
  BoxGeometry,
  CatmullRomCurve3,
  CanvasTexture,
  Color,
  Euler,
  type PerspectiveCamera,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TubeGeometry,
  Vector3,
} from "three";

export type Vec3 = [number, number, number];
export type Paint = string | Color;

export const OUTLINE = 0.014;
export const INK = "#151515";

export const euler = (x: number, y: number, z: number, order: "XYZ" | "YXZ") =>
  new Euler(x, y, z, order);

const InkHull: React.FC = () => (
  <meshBasicMaterial color={INK} side={BackSide} />
);

export const Blob: React.FC<{
  readonly position?: Vec3;
  readonly rotation?: Vec3 | Euler;
  readonly scale: Vec3 | number;
  readonly color: Paint;
  readonly outline?: boolean;
}> = ({ position, rotation, scale, color, outline = true }) => {
  const s: Vec3 = typeof scale === "number" ? [scale, scale, scale] : scale;
  return (
    <group position={position} rotation={rotation}>
      <mesh scale={s} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 32]} />
        <meshToonMaterial color={color} />
      </mesh>
      {outline ? (
        <mesh scale={[s[0] + OUTLINE, s[1] + OUTLINE, s[2] + OUTLINE]}>
          <sphereGeometry args={[1, 48, 32]} />
          <InkHull />
        </mesh>
      ) : null}
    </group>
  );
};

export const Segment: React.FC<{
  readonly length: number;
  readonly radius: number;
  readonly color: Paint;
}> = ({ length, radius, color }) => {
  return (
    <group position={[0, -length / 2, 0]}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[radius, length, 8, 24]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh>
        <capsuleGeometry args={[radius + OUTLINE, length, 8, 24]} />
        <InkHull />
      </mesh>
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
}> = ({ position, rotation, size, color, outline = true, map }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshToonMaterial color={color} map={map} />
      </mesh>
      {outline ? (
        <mesh>
          <boxGeometry
            args={[size[0] + OUTLINE * 2, size[1] + OUTLINE * 2, size[2] + OUTLINE * 2]}
          />
          <InkHull />
        </mesh>
      ) : null}
    </group>
  );
};

export const useTaperedBox = (
  width: number,
  height: number,
  depth: number,
  taper: number,
  openTop: boolean,
) => {
  return useMemo(() => {
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
  const geometry = useMemo(() => {
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
          vertex.fromBufferAttribute(position, index).sub(center).multiplyScalar(width).add(center);
          position.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
      }
    }
    return tube;
  }, [points, radius, caps]);
  const ends = caps === "both" ? [points[0], points[points.length - 1]] : [points[0]];
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
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = foreground;
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, width - 24, height - 24);
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
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
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
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  drawnTextures.set(key, texture);
  return texture;
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
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }, [repeatX, repeatY]);
};

export const CameraRig: React.FC<{
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
}> = ({ position, target, fov }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.fov = fov;
    camera.near = 0.03;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};
