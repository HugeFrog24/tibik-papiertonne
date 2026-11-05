import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Matrix4, Mesh, PerspectiveCamera, Plane, ShaderMaterial, Vector3, Vector4, WebGLRenderTarget } from "three";
import { NO_INK } from "../toon/inkWidth";
import { PUDDLES } from "../weather/overcast";
import { DRY_PITS, MIRROR_HEIGHTS, SHEEN, WATER_F0, WET_FILM, WET_SURFACES, mirrorCamera } from "../weather/wetGround";

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
varying vec4 vMirror;
varying vec3 vWorld;
void main() {
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
  float r = wet * mix(film, pool, puddle);
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
    },
  });

export const WetGround: React.FC<{ readonly wet: number; readonly sky: readonly [string, string]; readonly time: number }> = ({ wet, sky, time }) => {
  const mirrors = useMemo<Mirror[]>(
    () => MIRROR_HEIGHTS.map((y) => ({ y, target: new WebGLRenderTarget(1, 1), matrix: new Matrix4(), lens: new PerspectiveCamera() })),
    [],
  );
  const materials = useMemo(() => new Map(mirrors.map((m) => [m.y, filmMaterial(m)])), [mirrors]);
  const films = useRef<Mesh[]>([]);
  useEffect(
    () => () => {
      mirrors.forEach((m) => m.target.dispose());
      materials.forEach((m) => m.dispose());
    },
    [mirrors, materials],
  );
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
    const clear = gl.getClearColor(new Color());
    const alpha = gl.getClearAlpha();
    const before = gl.getRenderTarget();
    films.current.forEach((film) => {
      film.visible = false;
    });
    gl.setClearColor(new Color(0, 0, 0), 0);
    for (const mirror of mirrors) {
      const view = mirrorCamera({ position: camera.position.toArray(), target: ahead.toArray(), up: camera.up.toArray() }, mirror.y);
      const lens = mirror.lens;
      lens.fov = camera.fov;
      lens.aspect = camera.aspect;
      lens.near = camera.near;
      lens.far = camera.far;
      lens.position.set(...view.position);
      lens.up.set(...view.up);
      lens.lookAt(...view.target);
      lens.updateProjectionMatrix();
      lens.updateMatrixWorld();
      mirror.matrix.copy(BIAS).multiply(lens.projectionMatrix).multiply(lens.matrixWorldInverse);
      mirror.target.setSize(width, height);
      gl.clippingPlanes = [new Plane(new Vector3(0, 1, 0), -(mirror.y + 0.002))];
      gl.setRenderTarget(mirror.target);
      gl.clear();
      gl.render(scene, lens);
    }
    gl.clippingPlanes = clipping;
    gl.setClearColor(clear, alpha);
    gl.setRenderTarget(before);
    films.current.forEach((film) => {
      film.visible = true;
    });
  }, 0);
  if (wet <= 0) return null;
  return (
    <>
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
