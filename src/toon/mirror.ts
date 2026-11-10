import { Color, Frustum, Matrix4, Mesh, PerspectiveCamera, Vector2, Vector3, WebGLRenderTarget, type Object3D, type Plane, type Scene, type WebGLRenderer } from "three";
import { withClearColor } from "./renderState";

export const REFLECTS = { reflects: true } as const;

const showsAMirror = (object: Object3D) => object.userData["reflects"] === true;

export const withoutReflections = (scene: Object3D, draw: () => void) => {
  const hidden: Object3D[] = [];
  scene.traverse((object) => {
    if (object.visible && showsAMirror(object)) {
      object.visible = false;
      hidden.push(object);
    }
  });
  draw();
  hidden.forEach((object) => {
    object.visible = true;
  });
};

const across = (plane: Plane, point: Vector3) => point.clone().addScaledVector(plane.normal, -2 * plane.distanceToPoint(point));

const turnedAcross = (plane: Plane, direction: Vector3) => direction.clone().addScaledVector(plane.normal, -2 * plane.normal.dot(direction));

export const aimMirrorLens = (lens: PerspectiveCamera, camera: PerspectiveCamera, plane: Plane) => {
  camera.updateMatrixWorld();
  const eye = new Vector3().setFromMatrixPosition(camera.matrixWorld);
  const ahead = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
  const up = new Vector3(0, 1, 0).transformDirection(camera.matrixWorld);
  lens.fov = camera.fov;
  lens.aspect = camera.aspect;
  lens.near = camera.near;
  lens.far = camera.far;
  lens.position.copy(across(plane, eye));
  lens.up.copy(turnedAcross(plane, up));
  lens.lookAt(across(plane, eye.add(ahead)));
  lens.updateProjectionMatrix();
  lens.updateMatrixWorld();
  return lens;
};

const TO_TEXTURE = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
const NOTHING = new Color(0, 0, 0);

export type Mirror = { readonly target: WebGLRenderTarget; readonly matrix: Matrix4; readonly lens: PerspectiveCamera };

export const newMirror = (): Mirror => ({ target: new WebGLRenderTarget(1, 1), matrix: new Matrix4(), lens: new PerspectiveCamera() });

export const renderMirror = (
  gl: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  mirror: Mirror,
  plane: Plane,
  { resolution, clearance }: { readonly resolution: number; readonly clearance: number },
) => {
  const pixels = gl.getDrawingBufferSize(new Vector2());
  const lens = aimMirrorLens(mirror.lens, camera, plane);
  mirror.matrix.copy(TO_TEXTURE).multiply(lens.projectionMatrix).multiply(lens.matrixWorldInverse);
  mirror.target.setSize(Math.max(1, Math.round(pixels.x * resolution)), Math.max(1, Math.round(pixels.y * resolution)));
  const [clipping, before] = [gl.clippingPlanes, gl.getRenderTarget()];
  gl.clippingPlanes = [plane.clone().translate(plane.normal.clone().multiplyScalar(clearance))];
  withoutReflections(scene, () => {
    withClearColor(gl, NOTHING, 0, () => {
      gl.setRenderTarget(mirror.target);
      gl.clear();
      gl.render(scene, lens);
    });
  });
  gl.clippingPlanes = clipping;
  gl.setRenderTarget(before);
};

export const reflecting = (mirror: Mirror) => ({ ...REFLECTS, mirror });

export const filmsShowing = (root: Object3D, mirror: Mirror) => {
  const films: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && object.userData["mirror"] === mirror) films.push(object as Mesh);
  });
  return films;
};

const MARGIN = 1.25;

const shown = (object: Object3D | null): boolean => object === null || (object.visible && shown(object.parent));

export const filmsInView = (camera: PerspectiveCamera, plane: Plane, films: Iterable<Mesh>) => {
  camera.updateMatrixWorld();
  if (plane.distanceToPoint(new Vector3().setFromMatrixPosition(camera.matrixWorld)) <= 0) return [];
  const wider = new PerspectiveCamera(Math.min(170, camera.fov * MARGIN), camera.aspect, camera.near, camera.far);
  const frustum = new Frustum().setFromProjectionMatrix(wider.projectionMatrix.clone().multiply(camera.matrixWorldInverse));
  return [...films].filter((film) => {
    if (!shown(film)) return false;
    film.updateWorldMatrix(true, false);
    return frustum.intersectsObject(film);
  });
};
