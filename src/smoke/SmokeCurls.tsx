import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BackSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  Quaternion,
  SphereGeometry,
  type Material,
} from "three";
import { NO_INK } from "../toon/inkWidth";
import { INK } from "../toon/primitives";
import { useDisposable } from "../toon/useDisposable";
import { SMOKE, curlSize, type Curl } from "./smoke";

const MAX_CURLS = 160;
const ORDER = { shell: 4, fill: 5 };

const fadingPerCurl = <M extends Material>(material: M) => {
  material.transparent = true;
  material.depthWrite = false;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float curlOpacity;\nvarying float vCurlOpacity;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCurlOpacity = curlOpacity;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCurlOpacity;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= vCurlOpacity;");
  };
  return material;
};

const useCurlLayer = (curls: readonly Curl[], grow: number) => {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => new SphereGeometry(1, 16, 12), []);
  const opacity = useMemo(() => {
    const attribute = new InstancedBufferAttribute(new Float32Array(MAX_CURLS), 1);
    attribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute("curlOpacity", attribute);
    return attribute;
  }, [geometry]);
  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const shown = curls.slice(0, MAX_CURLS);
    const turn = new Quaternion();
    shown.forEach((curl, i) => {
      instances.setMatrixAt(i, new Matrix4().compose(curl.center, turn, curlSize(curl, grow)));
      opacity.setX(i, curl.opacity);
    });
    instances.count = shown.length;
    instances.instanceMatrix.needsUpdate = true;
    opacity.needsUpdate = true;
  }, [curls, opacity, grow]);
  return { mesh, geometry };
};

export const SmokeCurls: React.FC<{ readonly curls: readonly Curl[] }> = ({ curls }) => {
  const shell = useCurlLayer(curls, SMOKE.ink);
  const fill = useCurlLayer(curls, 0);
  const shellMaterial = useDisposable(() => fadingPerCurl(new MeshBasicMaterial({ color: INK, side: BackSide })), []);
  const fillMaterial = useDisposable(() => fadingPerCurl(new MeshToonMaterial({ color: SMOKE.colour })), []);
  return (
    <>
      <instancedMesh ref={shell.mesh} args={[shell.geometry, shellMaterial, MAX_CURLS]} userData={NO_INK} renderOrder={ORDER.shell} frustumCulled={false} />
      <instancedMesh ref={fill.mesh} args={[fill.geometry, fillMaterial, MAX_CURLS]} userData={NO_INK} renderOrder={ORDER.fill} frustumCulled={false} />
    </>
  );
};
