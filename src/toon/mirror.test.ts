import { Color, Group, LinearMipmapLinearFilter, Mesh, PerspectiveCamera, Plane, PlaneGeometry, Scene, Vector3, type WebGLRenderer } from "three";
import { expect, test } from "vitest";
import { ROAD_Y } from "../street/building";
import { REFLECTS, aimMirrorLens, filmsInView, filmsShowing, mirrorBlur, newMirror, reflecting, renderMirror, withoutReflections } from "./mirror";

const lookingFrom = (position: Vector3, target: Vector3, up = new Vector3(0, 1, 0)) => {
  const camera = new PerspectiveCamera(50, 16 / 9, 0.03, 500);
  camera.position.copy(position);
  camera.up.copy(up);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return camera;
};

const ndc = (camera: PerspectiveCamera, p: Vector3) => p.clone().project(camera);

const planes = {
  "the facade": new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), new Vector3(0, 0, -2.165)),
  "the facade across the street": new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 0, -1), new Vector3(0, 0, 14.465)),
  "a door swung 70 degrees out": new Plane().setFromNormalAndCoplanarPoint(new Vector3(Math.sin(1.22), 0, Math.cos(1.22)), new Vector3(-1, 1.3, -2.2)),
  "the road": new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3(0, ROAD_Y, 0)),
};

test("a mirror's lens sees, where the camera's line of sight meets the glass, exactly what that line of sight hits after bouncing off it", () => {
  for (const [name, plane] of Object.entries(planes)) {
    const eye = plane.normal.clone().multiplyScalar(6).add(new Vector3(1.5, 1.7, 0.5)).add(plane.coplanarPoint(new Vector3()));
    const onGlass = plane.coplanarPoint(new Vector3()).add(new Vector3(0.4, 0.3, 0.2).projectOnPlane(plane.normal));
    const camera = lookingFrom(eye, onGlass);
    const lens = aimMirrorLens(new PerspectiveCamera(), camera, plane);
    const bounce = onGlass.clone().sub(eye).normalize().reflect(plane.normal);
    for (const far of [2, 9, 40]) {
      const hit = onGlass.clone().addScaledVector(bounce, far);
      const [a, b] = [ndc(lens, onGlass), ndc(lens, hit)];
      expect([name, a.x, a.y]).toEqual([name, expect.closeTo(b.x, 9), expect.closeTo(b.y, 9)]);
    }
  }
});

test("a mirror's lens frames every point of the glass the camera frames, so no part of the glass in shot is ever left without its reflection", () => {
  for (const [name, plane] of Object.entries(planes)) {
    const eye = plane.normal.clone().multiplyScalar(4).add(new Vector3(-2, 1.6, 1)).add(plane.coplanarPoint(new Vector3()));
    const camera = lookingFrom(eye, plane.coplanarPoint(new Vector3()));
    const lens = aimMirrorLens(new PerspectiveCamera(), camera, plane);
    for (const [x, y] of [[-0.99, -0.99], [0.99, -0.99], [-0.99, 0.99], [0.99, 0.99], [0, 0]]) {
      const ray = new Vector3(x, y, 0.5).unproject(camera).sub(eye).normalize();
      const t = -plane.distanceToPoint(eye) / plane.normal.dot(ray);
      if (!(t > 0)) continue;
      const p = ndc(lens, eye.clone().addScaledVector(ray, t));
      expect([name, Math.abs(p.x) <= 1 + 1e-9, Math.abs(p.y) <= 1 + 1e-9]).toEqual([name, true, true]);
    }
  }
});

test("a mirror in the road sees the street from as far below it as the camera stands above it, upside down", () => {
  const camera = lookingFrom(new Vector3(1, 1.6, 4), new Vector3(-2, 1.1, -1));
  const lens = aimMirrorLens(new PerspectiveCamera(), camera, planes["the road"]);
  expect(lens.position.toArray().map((v) => +v.toFixed(9))).toEqual([1, +(2 * ROAD_Y - 1.6).toFixed(9), 4]);
  expect(new Vector3(0, 1, 0).transformDirection(lens.matrixWorld).y).toBeLessThan(-0.9);
});

test("while a mirror is drawn, every surface that shows a mirror is hidden, so no mirror ever shows what another drew for an earlier frame; afterwards each shows again", () => {
  const scene = new Scene();
  const films = [new Mesh(), new Mesh(), new Mesh()];
  films.forEach((f) => { f.userData = { ...REFLECTS }; });
  films[2].visible = false;
  const wall = new Mesh();
  const group = new Group();
  group.add(films[1]);
  scene.add(films[0], group, films[2], wall);
  const shown: boolean[][] = [];
  withoutReflections(scene, () => shown.push([...films.map((f) => f.visible), wall.visible]));
  expect(shown).toEqual([[false, false, false, true]]);
  expect([...films.map((f) => f.visible), wall.visible]).toEqual([true, true, false, true]);
});

const recordingRenderer = (seen: boolean[], [width, height]: readonly [number, number] = [1920, 1080]) => {
  let target: unknown = null;
  let clear = new Color(0.2, 0.4, 0.6);
  let alpha = 1;
  return {
    clippingPlanes: [] as Plane[],
    getDrawingBufferSize: (v: { set: (x: number, y: number) => unknown }) => v.set(width, height),
    getRenderTarget: () => target,
    setRenderTarget: (t: unknown) => { target = t; },
    getClearColor: (c: Color) => c.copy(clear),
    getClearAlpha: () => alpha,
    setClearColor: (c: Color, a: number) => { clear = c.clone(); alpha = a; },
    clear: () => undefined,
    render: (scene: Scene) => { scene.traverse((o) => { if (o.userData["reflects"] === true) seen.push(o.visible); }); },
  };
};

test("drawing a mirror hides the surfaces that show mirrors, clips away everything behind the glass, and leaves the renderer as it found it", () => {
  const scene = new Scene();
  const film = new Mesh(new PlaneGeometry(1, 1));
  film.userData = { ...REFLECTS };
  scene.add(film);
  const seen: boolean[] = [];
  const gl = recordingRenderer(seen);
  const before = { target: gl.getRenderTarget(), clipping: gl.clippingPlanes };
  const mirror = newMirror();
  const plane = planes["the facade"];
  const camera = lookingFrom(new Vector3(3, 1.7, 6), new Vector3(0, 2, -2.2));
  let clipped: Plane[] = [];
  const render = gl.render;
  gl.render = (s: Scene) => { clipped = gl.clippingPlanes; render(s); };
  renderMirror(gl as unknown as WebGLRenderer, scene, camera, mirror, plane, { resolution: 0.5, clearance: 0.002 });
  expect(seen).toEqual([false]);
  expect(film.visible).toBe(true);
  expect([mirror.target.width, mirror.target.height]).toEqual([960, 540]);
  expect(clipped).toHaveLength(1);
  expect(clipped[0].distanceToPoint(new Vector3(0, 0, -2.165 + 0.001))).toBeLessThan(0);
  expect(clipped[0].distanceToPoint(new Vector3(0, 0, -2.165 + 0.003))).toBeGreaterThan(0);
  expect(gl.getRenderTarget()).toBe(before.target);
  expect(gl.clippingPlanes).toBe(before.clipping);
  expect(gl.getClearAlpha()).toBe(1);
});

test("a mirror is drawn only when a piece of its glass is in shot, shown, and faced from the side it mirrors", () => {
  const plane = planes["the facade"];
  const pane = (x: number, y: number) => {
    const film = new Mesh(new PlaneGeometry(1, 1.3));
    film.position.set(x, y, -2.165);
    film.updateMatrixWorld();
    return film;
  };
  const inShot = pane(0, 2);
  const outOfShot = pane(60, 2);
  const outside = lookingFrom(new Vector3(0, 1.7, 8), new Vector3(0, 2, -2.2));
  expect(filmsInView(outside, plane, [inShot, outOfShot])).toEqual([inShot]);
  expect(filmsInView(outside, plane, [outOfShot])).toEqual([]);
  const indoors = lookingFrom(new Vector3(0, 1.7, -5), new Vector3(0, 2, -2.2));
  expect(filmsInView(indoors, plane, [inShot])).toEqual([]);
  const hidden = new Group();
  hidden.visible = false;
  hidden.add(inShot);
  expect(filmsInView(outside, plane, [inShot])).toEqual([]);
});

test("a pane just outside the edge of the shot still counts, so a camera shaking within one frame's exposure never finds glass without its reflection", () => {
  const plane = planes["the facade"];
  const camera = lookingFrom(new Vector3(0, 1.7, 8), new Vector3(0, 1.7, -2.2));
  const halfWidth = Math.tan(((camera.fov / 2) * Math.PI) / 180) * camera.aspect * 10.165;
  const film = new Mesh(new PlaneGeometry(0.2, 0.2));
  film.position.set(halfWidth + 0.3, 1.7, -2.165);
  film.updateMatrixWorld();
  expect(filmsInView(camera, plane, [film])).toEqual([film]);
});

test("a mirror finds the glass that shows it in the scene as it stands when it is drawn, under its own part of the scene and nowhere else, so glass mounted that very frame already counts", () => {
  const [facade, door] = [newMirror(), newMirror()];
  const scene = new Scene();
  const side = new Group();
  const pane = new Mesh(new PlaneGeometry(1, 1));
  pane.userData = reflecting(facade);
  const doorGlass = new Mesh(new PlaneGeometry(0.3, 1.3));
  doorGlass.userData = reflecting(door);
  const elsewhere = new Mesh(new PlaneGeometry(1, 1));
  elsewhere.userData = reflecting(facade);
  const wall = new Mesh(new PlaneGeometry(1, 1));
  side.add(pane, doorGlass, wall);
  scene.add(side, elsewhere);
  expect(filmsShowing(side, facade)).toEqual([pane]);
  expect(filmsShowing(side, door)).toEqual([doorGlass]);
  expect(filmsShowing(scene, facade)).toEqual([pane, elsewhere]);
  expect(reflecting(facade)).toMatchObject(REFLECTS);
});

test("a mirror keeps pre-shrunk copies of its picture, so a blurred lookup can read it as finely as at 1080p and no finer", () => {
  const { texture } = newMirror().target;
  expect(texture.generateMipmaps).toBe(true);
  expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
});

test("a mirror's blur is measured in 1080p pixels: drawn for a 1080p frame (either format) one blur step is one of its own pixels and it reads its own picture; for 4K two of them and the copy half the size; for 8K four and the copy a quarter the size; so a reflection is blurred alike at every resolution", () => {
  const camera = lookingFrom(new Vector3(3, 1.7, 6), new Vector3(0, 2, -2.2));
  const blurAt = (size: readonly [number, number]) => {
    const mirror = newMirror();
    renderMirror(recordingRenderer([], size) as unknown as WebGLRenderer, new Scene(), camera, mirror, planes["the facade"], { resolution: 0.5, clearance: 0.002 });
    const { lod, texel } = mirrorBlur(mirror, 0.5);
    return { lod, texel: texel.map((t) => +(1 / t).toFixed(6)) };
  };
  expect(blurAt([1920, 1080])).toEqual({ lod: 0, texel: [960, 540] });
  expect(blurAt([1080, 1920])).toEqual({ lod: 0, texel: [540, 960] });
  expect(blurAt([3840, 2160])).toEqual({ lod: 1, texel: [960, 540] });
  expect(blurAt([7680, 4320])).toEqual({ lod: 2, texel: [960, 540] });
  expect(blurAt([4320, 7680])).toEqual({ lod: 2, texel: [540, 960] });
});
