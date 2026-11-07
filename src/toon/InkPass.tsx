import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  CustomBlending,
  FloatType,
  FogExp2,
  HalfFloatType,
  Mesh,
  NearestFilter,
  OneFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type WebGLRenderer,
  type Object3D,
} from "three";
import { FISHEYE, fisheyeTargetSize } from "./fisheye";
import { INK_PASS, inkIdsOf, inkOf, inkRadius, skipsInkIds } from "./inkWidth";
import { OUTLINE, aimCamera } from "./primitives";
import type { CameraSetup } from "./shots";

const QUAD_VERTEX =
  "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const ID_VERTEX = [
  "#include <common>",
  "varying float vDepth;",
  "varying vec3 vLocal;",
  "void main() {",
  "#include <begin_vertex>",
  "#include <project_vertex>",
  "  vDepth = -mvPosition.z;",
  "  vLocal = transformed;",
  "}",
].join("\n");

const ID_FRAGMENT = [
  "uniform float uId;",
  "uniform float uJoinId;",
  "uniform float uJoinReach;",
  "uniform float uInk;",
  "varying float vDepth;",
  "varying vec3 vLocal;",
  "void main() { gl_FragColor = vec4(uId, vDepth, uInk, length(vLocal) < uJoinReach ? uJoinId : 0.0); }",
].join("\n");

const ACCUMULATE = [
  "uniform sampler2D map;",
  "uniform float weight;",
  "varying vec2 vUv;",
  "void main() { gl_FragColor = texture2D(map, vUv) * weight; }",
].join("\n");

const PRESENT = [
  "uniform sampler2D map;",
  "varying vec2 vUv;",
  "void main() {",
  "  gl_FragColor = texture2D(map, vUv);",
  "#include <colorspace_fragment>",
  "}",
].join("\n");

const RINGS = INK_PASS.rings.map((r) => r.toFixed(2)).join(", ");

const COMPOSITE = [
  "uniform sampler2D colourMap;",
  "uniform sampler2D idMap;",
  "uniform vec2 texel;",
  "uniform float inkPerDepth;",
  "uniform float maxRadius;",
  "uniform float jump;",
  "uniform float outline;",
  "uniform vec3 ink;",
  "uniform vec3 haze;",
  "uniform float hazeDensity;",
  "uniform bool fisheye;",
  "uniform float strength;",
  "uniform float vignette;",
  "uniform float aspect;",
  "varying vec2 vUv;",
  `const int RINGS = ${INK_PASS.rings.length};`,
  `const float RING[${INK_PASS.rings.length}] = float[](${RINGS});`,
  `const int TURNS = ${INK_PASS.turns};`,
  "void main() {",
  "  vec2 uv = vUv;",
  "  float rim = 1.0;",
  "  if (fisheye) {",
  "    vec2 p = vec2((vUv.x * 2.0 - 1.0) * aspect, vUv.y * 2.0 - 1.0);",
  "    float r2 = dot(p, p);",
  "    vec2 q = p * (1.0 - strength * (1.0 - r2));",
  "    uv = vec2(q.x / aspect, q.y) * 0.5 + 0.5;",
  "    rim = 1.0 - smoothstep(1.0 - vignette, 1.0, sqrt(r2));",
  "  }",
  "  vec4 here = texture2D(idMap, uv);",
  "  float depth = here.r > 0.5 ? here.g : 1.0e9;",
  "  float inked = 0.0;",
  "  float inkDepth = 1.0e9;",
  "  for (int ring = 0; ring < RINGS; ring++) {",
  "    float reach = RING[ring] * maxRadius;",
  "    for (int k = 0; k < TURNS; k++) {",
  "      float a = 6.2831853 * (float(k) + 0.5 * float(ring)) / float(TURNS);",
  "      vec4 there = texture2D(idMap, uv + vec2(cos(a), sin(a)) * reach * texel);",
  "      if (there.r < 0.5 || abs(there.r - here.r) < 0.5 || there.b < 0.0) continue;",
  "      if ((there.a > 0.5 && abs(there.a - here.r) < 0.5) || (here.a > 0.5 && abs(here.a - there.r) < 0.5)) continue;",
  "      if (there.g > depth - jump) continue;",
  "      float own = there.b > 0.0 ? there.b / outline : 1.0;",
  "      if (reach <= min(maxRadius, own * inkPerDepth / there.g)) {",
  "        inked = 1.0;",
  "        inkDepth = min(inkDepth, there.g);",
  "      }",
  "    }",
  "  }",
  "  if (here.b < 0.0) inked = 0.0;",
  "  vec4 base = texture2D(colourMap, uv);",
  "  float hazed = 1.0 - exp(-hazeDensity * hazeDensity * inkDepth * inkDepth);",
  "  vec3 colour = mix(base.rgb, mix(ink, haze, hazed), inked);",
  "  gl_FragColor = vec4(colour * rim, fisheye ? 1.0 : max(base.a, inked));",
  "#include <colorspace_fragment>",
  "}",
].join("\n");

const idMaterialFor = (
  cache: Map<Mesh, ShaderMaterial>,
  mesh: Mesh,
  from: Material,
) => {
  const { id, join } = inkIdsOf(mesh);
  const material = new ShaderMaterial({
    uniforms: {
      uId: { value: id },
      uJoinId: { value: join?.id ?? id },
      uJoinReach: { value: join?.reach ?? 0 },
      uInk: { value: inkOf(mesh) },
    },
    vertexShader: ID_VERTEX,
    fragmentShader: ID_FRAGMENT,
    side: from.side,
  });
  cache.set(mesh, material);
  return material;
};

export const InkPass: React.FC<{ readonly fisheye?: boolean }> = ({
  fisheye = false,
}) => {
  const colour = useMemo(
    () => new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
    [],
  );
  const ids = useMemo(
    () =>
      new WebGLRenderTarget(1, 1, {
        type: FloatType,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
      }),
    [],
  );
  const { quad, view, material, plane } = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: {
        colourMap: { value: null },
        idMap: { value: null },
        texel: { value: [1, 1] },
        inkPerDepth: { value: 1 },
        maxRadius: { value: INK_PASS.maxRadius },
        jump: { value: INK_PASS.jump },
        outline: { value: OUTLINE },
        ink: { value: new Color(INK_PASS.ink) },
        haze: { value: new Color() },
        hazeDensity: { value: 0 },
        fisheye: { value: false },
        strength: { value: FISHEYE.strength },
        vignette: { value: FISHEYE.vignette },
        aspect: { value: 1 },
      },
      vertexShader: QUAD_VERTEX,
      fragmentShader: COMPOSITE,
    });
    const plane = new PlaneGeometry(2, 2);
    const quad = new Scene();
    quad.add(new Mesh(plane, material));
    return {
      quad,
      view: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
      material,
      plane,
    };
  }, []);
  const idMaterials = useMemo(() => new Map<Mesh, ShaderMaterial>(), []);
  const exposure = useMemo(() => {
    const target = () => new WebGLRenderTarget(1, 1, { type: HalfFloatType });
    const accumulate = new ShaderMaterial({
      uniforms: { map: { value: null }, weight: { value: 1 } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: ACCUMULATE,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
      depthTest: false,
      depthWrite: false,
    });
    const present = new ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: PRESENT,
    });
    const adding = new Scene();
    adding.add(new Mesh(plane, accumulate));
    const showing = new Scene();
    showing.add(new Mesh(plane, present));
    return { sample: target(), sum: target(), accumulate, present, adding, showing };
  }, [plane]);
  useEffect(
    () => () => {
      colour.dispose();
      ids.dispose();
      material.dispose();
      plane.dispose();
      idMaterials.forEach((m) => m.dispose());
      exposure.sample.dispose();
      exposure.sum.dispose();
      exposure.accumulate.dispose();
      exposure.present.dispose();
    },
    [colour, ids, material, plane, idMaterials, exposure],
  );
  const drawInked = (
    gl: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    size: { width: number; height: number },
    [width, height]: readonly [number, number],
    target: WebGLRenderTarget | null,
  ) => {
    gl.setRenderTarget(colour);
    gl.render(scene, camera);

    const swapped: { mesh: Mesh; material: Material | Material[] }[] = [];
    const hidden: Object3D[] = [];
    scene.traverse((object) => {
      if (!object.visible) return;
      if (skipsInkIds(object)) {
        object.visible = false;
        hidden.push(object);
        return;
      }
      if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
      const from = object.material as Material;
      const idMaterial =
        idMaterials.get(object) ?? idMaterialFor(idMaterials, object, from);
      idMaterial.side = from.side;
      swapped.push({ mesh: object, material: from });
      object.material = idMaterial;
    });
    const clear = gl.getClearColor(new Color());
    const alpha = gl.getClearAlpha();
    gl.setClearColor(new Color(0, 0, 0), 0);
    gl.setRenderTarget(ids);
    gl.render(scene, camera);
    gl.setClearColor(clear, alpha);
    swapped.forEach(({ mesh, material: m }) => {
      mesh.material = m;
    });
    hidden.forEach((object) => {
      object.visible = true;
    });

    const fov =
      camera instanceof PerspectiveCamera ? camera.fov : INK_PASS.fallbackFov;
    material.uniforms.colourMap.value = colour.texture;
    material.uniforms.idMap.value = ids.texture;
    material.uniforms.texel.value = [1 / width, 1 / height];
    material.uniforms.inkPerDepth.value = inkRadius(OUTLINE, height, fov, 1);
    material.uniforms.fisheye.value = fisheye;
    const fog = scene.fog;
    material.uniforms.hazeDensity.value = fog instanceof FogExp2 ? fog.density : 0;
    if (fog instanceof FogExp2) material.uniforms.haze.value.copy(fog.color);
    material.uniforms.aspect.value = size.width / size.height;
    gl.setRenderTarget(target);
    gl.render(quad, view);
  };
  useFrame(({ gl, size, scene, camera }) => {
    const pixels: readonly [number, number] = fisheye
      ? fisheyeTargetSize(size.width, size.height, gl.getPixelRatio())
      : [
          Math.round(size.width * gl.getPixelRatio()),
          Math.round(size.height * gl.getPixelRatio()),
        ];
    colour.setSize(...pixels);
    ids.setSize(...pixels);
    const poses = camera.userData.exposure as readonly CameraSetup[] | undefined;
    if (!poses || poses.length < 2 || !(camera instanceof PerspectiveCamera)) {
      drawInked(gl, scene, camera, size, pixels, null);
      return;
    }
    exposure.sample.setSize(...pixels);
    exposure.sum.setSize(...pixels);
    const frame = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), fov: camera.fov };
    const [clear, alpha, autoClear] = [gl.getClearColor(new Color()), gl.getClearAlpha(), gl.autoClear];
    gl.setRenderTarget(exposure.sum);
    gl.setClearColor(new Color(0, 0, 0), 0);
    gl.clear();
    gl.setClearColor(clear, alpha);
    exposure.accumulate.uniforms.weight.value = 1 / poses.length;
    for (const pose of poses) {
      aimCamera(camera, pose);
      drawInked(gl, scene, camera, size, pixels, exposure.sample);
      exposure.accumulate.uniforms.map.value = exposure.sample.texture;
      gl.setRenderTarget(exposure.sum);
      gl.autoClear = false;
      gl.render(exposure.adding, view);
      gl.autoClear = autoClear;
    }
    camera.position.copy(frame.position);
    camera.quaternion.copy(frame.quaternion);
    camera.up.copy(frame.up);
    camera.fov = frame.fov;
    camera.updateProjectionMatrix();
    exposure.present.uniforms.map.value = exposure.sum.texture;
    gl.setRenderTarget(null);
    gl.render(exposure.showing, view);
  }, 1);
  return null;
};
