import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import {
  AddEquation,
  Box3,
  Color,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  Plane,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  ZeroFactor,
  type Group,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import type { Glazing } from "../building/glazedLeaf";
import { NO_INK } from "../toon/inkWidth";
import { filmsInView, filmsShowing, newMirror, reflecting, renderMirror, type Mirror } from "../toon/mirror";
import type { Vec3 } from "../toon/primitives";
import { useDisposable } from "../toon/useDisposable";
import type { WeatherLook } from "../weather/overcast";
import type { Rect } from "./facade";
import { FACADE_MIRROR_Z, GLASS_F0, GLASS_REFLECTION, ajar, doorGlassFilm, seenFromInside } from "./glassReflection";

const VERTEX = `
#include <common>
#include <fog_pars_vertex>
uniform mat4 mirrorMatrix;
varying vec4 vMirror;
varying vec3 vWorld;
varying vec3 vFacing;
varying vec2 vUv;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vFacing = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vMirror = mirrorMatrix * world;
  vUv = uv;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const RING = 8;

const FRAGMENT = `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D mirror;
uniform float f0;
uniform float fresh;
uniform vec2 texel;
uniform float spread;
uniform vec3 skyTop;
uniform vec3 skyBottom;
#ifdef USE_MASK
uniform sampler2D mask;
#endif
varying vec4 vMirror;
varying vec3 vWorld;
varying vec3 vFacing;
varying vec2 vUv;
void main() {
  float glass = fresh;
  #ifdef USE_MASK
  glass *= texture2D(mask, vUv).r;
  #endif
  if (glass <= 0.0) discard;
  vec3 toEye = normalize(cameraPosition - vWorld);
  float c = clamp(dot(toEye, vFacing), 0.0, 1.0);
  float f = f0 + (1.0 - f0) * pow(1.0 - c, 5.0);
  vec2 uv = vMirror.xy / vMirror.w;
  vec4 seen = 2.0 * texture2D(mirror, uv);
  for (int k = 0; k < ${RING}; k++) {
    float a = 6.2831853 * (float(k) + 0.5) / ${RING}.0;
    seen += texture2D(mirror, uv + vec2(cos(a), sin(a)) * spread * texel);
  }
  seen /= ${RING + 2}.0;
  vec3 bounce = reflect(-toEye, vFacing);
  vec3 colour = seen.rgb + mix(skyBottom, skyTop, clamp(bounce.y, 0.0, 1.0)) * (1.0 - seen.a);
  gl_FragColor = vec4(colour * f * glass, (f - f0) * glass);
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor * gl_FragColor.a, fogFactor);
  #endif
}
`;

type MirrorUniforms = {
  readonly mirror: { value: Texture };
  readonly mirrorMatrix: { value: Mirror["matrix"] };
  readonly fresh: { value: number };
  readonly texel: { value: Vector2 };
};

type SkyUniforms = { readonly skyTop: { value: Color }; readonly skyBottom: { value: Color } };

type Pass = { readonly mirror: Mirror; readonly uniforms: MirrorUniforms };

type Glass = { readonly pass: Pass; readonly sky: SkyUniforms; readonly views: readonly Rect[] };

const GlassContext = createContext<Glass | null>(null);

const filmMaterial = (mirror: MirrorUniforms, sky: SkyUniforms, spread: number, mask: Texture | undefined) =>
  new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: mask ? { USE_MASK: "" } : {},
    uniforms: { ...mirror, ...sky, f0: { value: GLASS_F0 }, spread: { value: spread }, mask: { value: mask ?? null }, ...UniformsUtils.clone(UniformsLib.fog) },
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  });

const planeOf = (anchor: Object3D, z: number) =>
  new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1).transformDirection(anchor.matrixWorld), new Vector3(0, 0, z).applyMatrix4(anchor.matrixWorld));

const cornersOf = (film: Mesh): Vec3[] => {
  if (!film.geometry.boundingBox) film.geometry.computeBoundingBox();
  const box = film.geometry.boundingBox ?? new Box3();
  return [box.min.x, box.max.x].flatMap((x) => [box.min.y, box.max.y].map((y) => new Vector3(x, y, box.min.z).applyMatrix4(film.matrixWorld).toArray()));
};

const useMirrorPass = (anchor: RefObject<Object3D | null>, z: number, views: readonly Rect[]): Pass => {
  const pass = useMemo(() => {
    const mirror = newMirror();
    return { mirror, uniforms: { mirror: { value: mirror.target.texture }, mirrorMatrix: { value: mirror.matrix }, fresh: { value: 0 }, texel: { value: new Vector2(1, 1) } } };
  }, []);
  useEffect(() => () => { pass.mirror.target.dispose(); }, [pass]);
  useFrame(({ gl, scene, camera }) => {
    pass.uniforms.fresh.value = 0;
    const at = anchor.current;
    if (!at || !(camera instanceof PerspectiveCamera)) return;
    at.updateWorldMatrix(true, false);
    const plane = planeOf(at, z);
    const eye = new Vector3().setFromMatrixPosition(camera.matrixWorld).toArray();
    if (!filmsInView(camera, plane, filmsShowing(at, pass.mirror)).some((film) => seenFromInside(eye, cornersOf(film), views))) return;
    renderMirror(gl, scene, camera, pass.mirror, plane, GLASS_REFLECTION);
    pass.uniforms.texel.value.set(1 / pass.mirror.target.width, 1 / pass.mirror.target.height);
    pass.uniforms.fresh.value = 1;
  }, 0);
  return pass;
};

const Film: React.FC<{
  readonly pass: Pass;
  readonly sky: SkyUniforms;
  readonly size: readonly [number, number];
  readonly position: Vec3;
  readonly spread: number;
  readonly mask?: Texture | undefined;
}> = ({ pass, sky, size, position, spread, mask }) => {
  const material = useDisposable(() => filmMaterial(pass.uniforms, sky, spread, mask), [pass, sky, spread, mask]);
  const userData = useMemo(() => ({ ...NO_INK, ...reflecting(pass.mirror) }), [pass]);
  return (
    <mesh position={position} material={material} userData={userData}>
      <planeGeometry args={[...size]} />
    </mesh>
  );
};

export const FacadeMirror: React.FC<{ readonly look: WeatherLook; readonly views: readonly Rect[]; readonly children: ReactNode }> = ({ look, views, children }) => {
  const anchor = useRef<Group>(null);
  const pass = useMirrorPass(anchor, FACADE_MIRROR_Z, views);
  const sky = useMemo<SkyUniforms>(() => ({ skyTop: { value: new Color() }, skyBottom: { value: new Color() } }), []);
  sky.skyTop.value.set(look.sky[0]);
  sky.skyBottom.value.set(look.sky[1]);
  const glass = useMemo(() => ({ pass, sky, views }), [pass, sky, views]);
  return (
    <GlassContext.Provider value={glass}>
      <group ref={anchor}>{children}</group>
    </GlassContext.Provider>
  );
};

export const MirrorFilm: React.FC<{
  readonly size: readonly [number, number];
  readonly position: Vec3;
  readonly mask?: Texture | undefined;
}> = ({ size, position, mask }) => {
  const glass = useContext(GlassContext);
  return glass ? <Film pass={glass.pass} sky={glass.sky} size={size} position={position} spread={GLASS_REFLECTION.blur.clear} mask={mask} /> : null;
};

const OwnMirrorFilm: React.FC<{ readonly glass: Glass; readonly size: readonly [number, number]; readonly position: Vec3 }> = ({ glass, size, position }) => {
  const anchor = useRef<Group>(null);
  const pass = useMirrorPass(anchor, 0, glass.views);
  return (
    <group ref={anchor} position={position}>
      <Film pass={pass} sky={glass.sky} size={size} position={[0, 0, 0]} spread={GLASS_REFLECTION.blur.patterned} />
    </group>
  );
};

export const DoorGlassFilm: React.FC<{ readonly glass: Glazing; readonly angle: number }> = ({ glass, angle }) => {
  const shared = useContext(GlassContext);
  if (!shared) return null;
  const { position, size } = doorGlassFilm(glass);
  return ajar(angle) ? (
    <OwnMirrorFilm glass={shared} size={size} position={position} />
  ) : (
    <Film pass={shared.pass} sky={shared.sky} size={size} position={position} spread={GLASS_REFLECTION.blur.patterned} />
  );
};
