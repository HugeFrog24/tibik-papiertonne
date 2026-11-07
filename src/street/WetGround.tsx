import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AddEquation, Color, CustomBlending, DataTexture, LinearFilter, Matrix4, Mesh, OneFactor, PerspectiveCamera, Plane, RedFormat, ShaderMaterial, SrcColorFactor, UnsignedByteType, Vector3, Vector4, WebGLRenderTarget, ZeroFactor } from "three";
import { NO_INK } from "../toon/inkWidth";
import { withClearColor } from "../toon/renderState";
import { aimLens } from "../toon/shots";
import { PUDDLES } from "../weather/overcast";
import type { WeatherLook } from "../weather/overcast";
import { RAIN_SHADOW, rainShadowMask, wetShade } from "../weather/rainShadow";
import { DRY_PITS, MIRROR_HEIGHTS, SHEEN, WATER_F0, WET_FILM, WET_LAYERS, WET_SURFACES, mirrorCamera, wetness } from "../weather/wetGround";

const OPEN_SKY = `
uniform sampler2D shadow;
uniform vec4 shadowBox;
float openSky(vec2 p) {
  vec2 uv = (p - shadowBox.xy) / (shadowBox.zw - shadowBox.xy);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
  return texture2D(shadow, uv).r;
}
`;

const VERTEX = `
uniform mat4 mirrorMatrix;
varying vec4 vMirror;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vMirror = mirrorMatrix * world;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
uniform sampler2D mirror;
uniform float wet;
uniform float f0;
uniform vec2 sheenFilm;
uniform vec2 sheenPuddle;
uniform vec3 skyTop;
uniform vec3 skyBottom;
uniform vec4 puddles[${PUDDLES.length}];
uniform vec4 pits[${DRY_PITS.length}];
uniform float time;
uniform float smear;
${OPEN_SKY}
varying vec4 vMirror;
varying vec3 vWorld;
void main() {
  float open = openSky(vWorld.xz);
  if (open <= 0.0) discard;
  for (int i = 0; i < ${DRY_PITS.length}; i++) {
    vec4 p = pits[i];
    if (vWorld.x > p.x && vWorld.x < p.z && vWorld.z > p.y && vWorld.z < p.w) discard;
  }
  float puddle = 0.0;
  for (int i = 0; i < ${PUDDLES.length}; i++) {
    vec4 q = puddles[i];
    puddle = max(puddle, 1.0 - smoothstep(0.75, 1.0, length((vWorld.xz - q.xy) / q.zw)));
  }
  float c = clamp(normalize(cameraPosition - vWorld).y, 0.0, 1.0);
  float f = f0 + (1.0 - f0) * pow(1.0 - c, 5.0);
  float film = sheenFilm.x + (sheenFilm.y - sheenFilm.x) * f;
  float pool = sheenPuddle.x + (sheenPuddle.y - sheenPuddle.x) * f;
  float r = wet * open * mix(film, pool, puddle);
  vec2 uv = vMirror.xy / vMirror.w;
  uv += puddle * 0.002 * vec2(sin(vWorld.x * 31.0 + time * 11.0), cos(vWorld.z * 27.0 + time * 9.0));
  float spread = smear * (1.0 - puddle);
  vec4 sum = vec4(0.0);
  for (int k = -3; k <= 3; k++) sum += texture2D(mirror, uv + vec2(0.0, float(k) * spread));
  vec4 seen = sum / 7.0;
  vec3 colour = seen.rgb + mix(skyBottom, skyTop, c) * (1.0 - seen.a);
  gl_FragColor = vec4(colour, r);
}
`;


const SHADE_VERTEX = `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SHADE_FRAGMENT = `
uniform vec3 tint;
${OPEN_SKY}
varying vec3 vWorld;
void main() {
  gl_FragColor = vec4(mix(vec3(1.0), tint, openSky(vWorld.xz)), 1.0);
}
`;

let shadowTexture: DataTexture | null = null;
const rainShadowTexture = () => {
  if (shadowTexture) return shadowTexture;
  const { width, height, data } = rainShadowMask();
  const texture = new DataTexture(data, width, height, RedFormat, UnsignedByteType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  shadowTexture = texture;
  return texture;
};

const half = RAIN_SHADOW.step / 2;
const SHADOW_BOX = new Vector4(RAIN_SHADOW.x[0] - half, RAIN_SHADOW.z[0] - half, RAIN_SHADOW.x[1] + half, RAIN_SHADOW.z[1] + half);

const shadeMaterial = () =>
  new ShaderMaterial({
    vertexShader: SHADE_VERTEX,
    fragmentShader: SHADE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: WET_FILM.polygonOffsetFactor,
    polygonOffsetUnits: WET_FILM.polygonOffsetUnits,
    uniforms: { tint: { value: new Color(1, 1, 1) }, shadow: { value: rainShadowTexture() }, shadowBox: { value: SHADOW_BOX } },
  });

const BIAS = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const SMEAR = 0.004;

type Mirror = { readonly y: number; readonly target: WebGLRenderTarget; readonly matrix: Matrix4; readonly lens: PerspectiveCamera };

const filmMaterial = (mirror: Mirror) =>
  new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: WET_FILM.polygonOffsetFactor,
    polygonOffsetUnits: WET_FILM.polygonOffsetUnits,
    uniforms: {
      mirror: { value: mirror.target.texture },
      mirrorMatrix: { value: mirror.matrix },
      wet: { value: 0 },
      f0: { value: WATER_F0 },
      sheenFilm: { value: [SHEEN.film.least, SHEEN.film.most] },
      sheenPuddle: { value: [SHEEN.puddle.least, SHEEN.puddle.most] },
      skyTop: { value: new Color() },
      skyBottom: { value: new Color() },
      puddles: { value: PUDDLES.map((p) => new Vector4(p.x, p.z, p.rx, p.rz)) },
      pits: { value: DRY_PITS.map((p) => new Vector4(p.x[0], p.z[0], p.x[1], p.z[1])) },
      time: { value: 0 },
      smear: { value: SMEAR },
      shadow: { value: rainShadowTexture() },
      shadowBox: { value: SHADOW_BOX },
    },
  });

export const WetGround: React.FC<{ readonly look: WeatherLook; readonly time: number }> = ({ look, time }) => {
  const wet = wetness(look);
  const { sky } = look;
  const mirrors = useMemo<Mirror[]>(
    () => MIRROR_HEIGHTS.map((y) => ({ y, target: new WebGLRenderTarget(1, 1), matrix: new Matrix4(), lens: new PerspectiveCamera() })),
    [],
  );
  const materials = useMemo(() => new Map(mirrors.map((m) => [m.y, filmMaterial(m)])), [mirrors]);
  const shade = useMemo(shadeMaterial, []);
  const films = useRef<Mesh[]>([]);
  useEffect(
    () => () => {
      mirrors.forEach((m) => m.target.dispose());
      materials.forEach((m) => m.dispose());
      shade.dispose();
    },
    [mirrors, materials, shade],
  );
  (shade.uniforms.tint.value as Color).set(...wetShade(look, 1));
  materials.forEach((m) => {
    m.uniforms.wet.value = wet;
    m.uniforms.time.value = time;
    (m.uniforms.skyTop.value as Color).set(sky[0]);
    (m.uniforms.skyBottom.value as Color).set(sky[1]);
  });
  useFrame(({ gl, scene, camera, size }) => {
    if (wet <= 0 || !(camera instanceof PerspectiveCamera)) return;
    const width = Math.max(1, Math.round(size.width * gl.getPixelRatio() * WET_FILM.resolution));
    const height = Math.max(1, Math.round(size.height * gl.getPixelRatio() * WET_FILM.resolution));
    const ahead = camera.getWorldDirection(new Vector3()).add(camera.position);
    const clipping = gl.clippingPlanes;
    const before = gl.getRenderTarget();
    films.current.forEach((film) => {
      film.visible = false;
    });
    withClearColor(gl, new Color(0, 0, 0), 0, () => {
      for (const mirror of mirrors) {
        const view = mirrorCamera({ position: camera.position.toArray(), target: ahead.toArray(), up: camera.up.toArray() }, mirror.y);
        const lens = aimLens(mirror.lens, { ...view, fov: camera.fov }, { aspect: camera.aspect, near: camera.near, far: camera.far });
        mirror.matrix.copy(BIAS).multiply(lens.projectionMatrix).multiply(lens.matrixWorldInverse);
        mirror.target.setSize(width, height);
        gl.clippingPlanes = [new Plane(new Vector3(0, 1, 0), -(mirror.y + 0.002))];
        gl.setRenderTarget(mirror.target);
        gl.clear();
        gl.render(scene, lens);
      }
    });
    gl.clippingPlanes = clipping;
    gl.setRenderTarget(before);
    films.current.forEach((film) => {
      film.visible = true;
    });
  }, 0);
  if (wet <= 0) return null;
  return (
    <>
      {WET_SURFACES.map((s) => (
        <mesh
          key={`${s.name} darkened`}
          position={[(s.x[0] + s.x[1]) / 2, s.y, (s.z[0] + s.z[1]) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={shade}
          userData={NO_INK}
          renderOrder={WET_LAYERS.shade}
        >
          <planeGeometry args={[s.x[1] - s.x[0], s.z[1] - s.z[0]]} />
        </mesh>
      ))}
      {WET_SURFACES.map((s, i) => (
        <mesh
          key={s.name}
          ref={(mesh) => {
            if (mesh) films.current[i] = mesh;
          }}
          position={[(s.x[0] + s.x[1]) / 2, s.y, (s.z[0] + s.z[1]) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={materials.get(s.y)}
          userData={NO_INK}
          renderOrder={WET_FILM.renderOrder}
        >
          <planeGeometry args={[s.x[1] - s.x[0], s.z[1] - s.z[0]]} />
        </mesh>
      ))}
    </>
  );
};
