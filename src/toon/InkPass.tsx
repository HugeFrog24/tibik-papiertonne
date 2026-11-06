import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  FloatType,
  FogExp2,
  HalfFloatType,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type Material,
  type Object3D,
} from "three";
import { FISHEYE, fisheyeTargetSize } from "./fisheye";
import { INK_PASS, inkOf, inkRadius, skipsInkIds } from "./inkWidth";
import { OUTLINE } from "./primitives";

const QUAD_VERTEX =
  "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const ID_VERTEX = [
  "#include <common>",
  "varying float vDepth;",
  "void main() {",
  "#include <begin_vertex>",
  "#include <project_vertex>",
  "  vDepth = -mvPosition.z;",
  "}",
].join("\n");

const ID_FRAGMENT = [
  "uniform float uId;",
  "uniform float uInk;",
  "varying float vDepth;",
  "void main() { gl_FragColor = vec4(uId, vDepth, uInk, 1.0); }",
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

const inkIdOf = (mesh: Object3D) => {
  for (let o: Object3D | null = mesh; o; o = o.parent)
    if (o.userData.inkGroup) return o.id;
  return mesh.id;
};

const idMaterialFor = (
  cache: Map<Mesh, ShaderMaterial>,
  mesh: Mesh,
  from: Material,
) => {
  const material = new ShaderMaterial({
    uniforms: { uId: { value: inkIdOf(mesh) }, uInk: { value: inkOf(mesh) } },
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
  useEffect(
    () => () => {
      colour.dispose();
      ids.dispose();
      material.dispose();
      plane.dispose();
      idMaterials.forEach((m) => m.dispose());
    },
    [colour, ids, material, plane, idMaterials],
  );
  useFrame(({ gl, size, scene, camera }) => {
    const [width, height] = fisheye
      ? fisheyeTargetSize(size.width, size.height, gl.getPixelRatio())
      : [
          Math.round(size.width * gl.getPixelRatio()),
          Math.round(size.height * gl.getPixelRatio()),
        ];
    colour.setSize(width, height);
    ids.setSize(width, height);
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
    gl.setRenderTarget(null);

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
    gl.render(quad, view);
  }, 1);
  return null;
};
