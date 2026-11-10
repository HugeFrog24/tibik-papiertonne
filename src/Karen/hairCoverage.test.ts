import {
  DoubleSide,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  SphereGeometry,
  Vector3,
} from "three";
import { expect, test } from "vitest";
import { headRotation, torsoDepthAt } from "../characters/skeleton";
import { frame } from "../physics/collision";
import { clumpGeometry } from "./clumpShape";
import { rootSignOf } from "./HairClump";
import { KAREN_REST, KAREN_SKELETON as K } from "./rig";
import { SCALP, hairlinePolar, scalpGeometry } from "./scalpShape";
import { faces } from "../toon/geometryChecks";

const headSphere = () => {
  const head = new Mesh(
    new SphereGeometry(1, 48, 32),
    new MeshBasicMaterial({ side: DoubleSide }),
  );
  head.position.set(...K.headCenter);
  head.scale.set(...K.headSize);
  head.updateMatrixWorld(true);
  return head;
};

const scalp = () => {
  const [cx, cy, cz] = K.headCenter;
  const [rx, ry, rz] = K.headSize;
  const points: { at: string; point: Vector3; normal: Vector3 }[] = [];
  for (let a = -Math.PI; a < Math.PI - 1e-6; a += Math.PI / 24)
    for (let p = 0.05; p <= hairlinePolar(a); p += 0.05) {
      const s = new Vector3(
        Math.sin(p) * Math.sin(a),
        Math.cos(p),
        Math.sin(p) * Math.cos(a),
      );
      points.push({
        at: `${Math.round((a * 180) / Math.PI)}°/${p.toFixed(2)}`,
        point: new Vector3(cx + rx * s.x, cy + ry * s.y, cz + rz * s.z),
        normal: new Vector3(s.x / rx, s.y / ry, s.z / rz).normalize(),
      });
    }
  return points;
};

const hairMeshes = () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const group = new Group();
  for (const piece of K.hair) {
    const holder = new Group();
    holder.position.set(...piece.center);
    holder.rotation.copy(new Euler(...piece.rotation));
    const geometry =
      piece.name === "cap"
        ? new SphereGeometry(1, 48, 32)
        : piece.name === "scalp"
          ? scalpGeometry()
          : clumpGeometry(rootSignOf(piece));
    const mesh = new Mesh(geometry, material);
    mesh.scale.set(...piece.size);
    holder.add(mesh);
    group.add(holder);
  }
  group.updateMatrixWorld(true);
  return group;
};

test("her hair has no holes: no bare scalp shows anywhere above her hairline", () => {
  const hair = hairMeshes();
  const ray = new Raycaster();
  const bare = scalp()
    .filter(({ point, normal }) => {
      ray.set(
        point.clone().addScaledVector(normal, 0.2),
        normal.clone().negate(),
      );
      return !ray.intersectObject(hair, true).some((h) => h.distance < 0.202);
    })
    .map(({ at }) => at);
  expect(bare.slice(0, 12)).toEqual([]);
});

test("her locks are spread evenly: no stretch of plain cap wider than a lock", () => {
  const [cx, cy, cz] = K.headCenter;
  const locks = K.hair
    .filter((piece) => piece.name !== "cap" && piece.name !== "scalp")
    .map((piece) =>
      new Vector3(...piece.center).sub(new Vector3(cx, cy, cz)).normalize(),
    );
  const far = scalp()
    .map(({ at, point }) => {
      const direction = point
        .clone()
        .sub(new Vector3(cx, cy, cz))
        .normalize();
      const nearest = Math.min(...locks.map((l) => l.angleTo(direction)));
      return { at, nearest };
    })
    .filter(({ nearest }) => nearest > 0.4)
    .map(({ at, nearest }) => `${at}: nearest lock ${nearest.toFixed(2)} rad`);
  expect(far.slice(0, 12)).toEqual([]);
});

test("the scalp layer faces outward, so its toon fill is drawn", () => {
  const inward = faces(scalpGeometry()).filter(
    ({ a, b, c, normal }) => normal.dot(a.clone().add(b).add(c)) < 0,
  );
  expect(inward.length).toBe(0);
});

const rootOf = (piece: (typeof K.hair)[number]) => {
  const reach = new Vector3(0, piece.size[1], 0).applyEuler(
    new Euler(...piece.rotation),
  );
  const center = new Vector3(...piece.center);
  return reach.y >= 0 ? center.add(reach) : center.sub(reach);
};

const scalpEdge = (point: Vector3) => {
  const [cx, cy, cz] = K.headCenter;
  const [rx, ry, rz] = K.headSize;
  const d = new Vector3(
    (point.x - cx) / rx,
    (point.y - cy) / ry,
    (point.z - cz) / rz,
  ).normalize();
  const polar = Math.acos(d.y);
  const azimuth = Math.atan2(d.x, d.z);
  return { polar, edge: hairlinePolar(azimuth) + SCALP.beyond };
};

test("her side hair hangs from her scalp, not from bare skin below it", () => {
  const loose = K.hair
    .filter((piece) => piece.name === "curtain" || piece.name === "strand")
    .map((piece) => ({ piece, ...scalpEdge(rootOf(piece)) }))
    .filter(({ polar, edge }) => polar > edge)
    .map(
      ({ piece, polar, edge }) =>
        `${piece.name} rooted ${(polar - edge).toFixed(2)} rad below the scalp's edge`,
    );
  expect(loose).toEqual([]);
});

test("seen from the side, her side hair is one sheet: no skin shows between its strands", () => {
  const hair = hairMeshes();
  const ray = new Raycaster();
  const head = headSphere();
  const gaps: string[] = [];
  for (const side of [1, -1]) {
    const curtain = K.hair.find(
      (p) => p.name === "curtain" && Math.sign(p.center[0]) === side,
    )!;
    const top = rootOf(curtain);
    const bottom = new Vector3(...curtain.center).multiplyScalar(2).sub(top);
    for (let k = 0.05; k <= 0.66; k += 0.05) {
      const along = top.clone().lerp(bottom, k);
      for (let w = -0.6; w <= 0.6; w += 0.3) {
        const origin = new Vector3(
          side * 0.5,
          along.y,
          along.z + w * curtain.size[2],
        );
        ray.set(origin, new Vector3(-side, 0, 0));
        const skin = ray.intersectObject(head).at(0);
        if (!skin) continue;
        const first = ray.intersectObject(hair, true).at(0);
        if (!first || first.distance > skin.distance)
          gaps.push(
            `side ${side}: skin at ${(k * 100).toFixed(0)} % down, ${w.toFixed(1)} across`,
          );
      }
    }
  }
  expect(gaps.slice(0, 10)).toEqual([]);
});

const curtainAzimuths = () => {
  const [cx, , cz] = K.headCenter;
  return K.hair
    .filter((p) => p.name === "curtain")
    .map((p) => {
      const degrees =
        (Math.atan2(p.center[0] - cx, p.center[2] - cz) * 180) / Math.PI;
      return degrees < 0 ? degrees + 360 : degrees;
    })
    .sort((a, b) => a - b);
};

test("her long hair hangs in curtains evenly all around her head, leaving only her face open", () => {
  const around = curtainAzimuths();
  expect(around.length).toBeGreaterThanOrEqual(8);
  for (const a of around) {
    expect(a, "a curtain over her face").toBeGreaterThan(60);
    expect(a, "a curtain over her face").toBeLessThan(300);
  }
  const gaps = around.slice(1).map((a, i) => a - around[i]);
  expect(Math.max(...gaps)).toBeLessThan(36);
  expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.25);
  expect(360 - around[around.length - 1] + around[0]).toBeLessThan(160);
});

const VIEWS: readonly {
  readonly name: string;
  readonly turn: number;
  readonly drop: number;
}[] = [
  { name: "from behind", turn: 0, drop: 0 },
  { name: "from behind and above", turn: 0, drop: 0.45 },
  { name: "from behind on her left", turn: 0.8, drop: 0.3 },
  { name: "from behind on her right", turn: -0.8, drop: 0.3 },
];

test("from behind, wherever her head shows above her body, it shows hair, not skin", () => {
  const hair = hairMeshes();
  const ray = new Raycaster();
  const head = headSphere();
  const toTorso = frame(
    new Matrix4(),
    [0, K.neckHeight, 0],
    headRotation(KAREN_REST),
  );
  const inBody = (p: Vector3) =>
    torsoDepthAt(K, p.clone().applyMatrix4(toTorso)) > 0;
  const centre = new Vector3(...K.headCenter);
  const gaps: string[] = [];
  for (const view of VIEWS) {
    const look = new Vector3(0, 0, 1)
      .applyAxisAngle(new Vector3(1, 0, 0), view.drop)
      .applyAxisAngle(new Vector3(0, 1, 0), view.turn)
      .normalize();
    const right = new Vector3(0, 1, 0).cross(look).normalize();
    const up = look.clone().cross(right).normalize();
    for (let u = -0.17; u <= 0.17 + 1e-9; u += 0.017)
      for (let v = -0.2; v <= 0.2 + 1e-9; v += 0.02) {
        const origin = centre
          .clone()
          .addScaledVector(right, u)
          .addScaledVector(up, v)
          .addScaledVector(look, -0.6);
        ray.set(origin, look);
        const skin = ray.intersectObject(head).at(0);
        if (!skin) continue;
        const first = ray.intersectObject(hair, true).at(0);
        if (first && first.distance <= skin.distance) continue;
        let hidden = false;
        for (let d = 0; d < skin.distance && !hidden; d += 0.003)
          hidden = inBody(origin.clone().addScaledVector(look, d));
        if (!hidden)
          gaps.push(
            `${view.name}: skin at ${(u * 100).toFixed(0)} cm across, ${(v * 100).toFixed(0)} cm up`,
          );
      }
  }
  expect(gaps.slice(0, 10)).toEqual([]);
});
