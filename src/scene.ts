import * as THREE from "three";

export type SceneId = "hero" | "fleet" | "node" | "slicer" | "drone";

const SIGNAL = 0x79f29b;
const PAPER = 0xf1f5f2;
const MUTED = 0x617067;
const MAGENTA = 0xea6fae;
const CYAN = 0x70d6e8;

type SceneGroup = THREE.Group & { userData: { update?: (time: number, progress: number) => void } };

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function lineMaterial(color = SIGNAL, opacity = 0.5): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function meshMaterial(
  color = SIGNAL,
  options: { wireframe?: boolean; opacity?: number } = {},
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: options.wireframe ?? true,
    transparent: true,
    opacity: options.opacity ?? 0.8,
  });
}

function makeHero(): SceneGroup {
  const group = new THREE.Group() as SceneGroup;
  const random = seededRandom(2109);
  const positions: number[] = [];
  const nodes: THREE.Vector3[] = [];

  for (let i = 0; i < 42; i += 1) {
    const point = new THREE.Vector3(
      (random() - 0.5) * 11,
      (random() - 0.5) * 7,
      (random() - 0.5) * 5,
    );
    nodes.push(point);
    positions.push(point.x, point.y, point.z);
  }

  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    color: SIGNAL,
    size: 0.09,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  group.add(points);

  const connectionPositions: number[] = [];
  nodes.forEach((a, index) => {
    nodes.slice(index + 1).forEach((b) => {
      if (a.distanceTo(b) < 2.25) {
        connectionPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    });
  });
  const connectionsGeometry = new THREE.BufferGeometry();
  connectionsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(connectionPositions, 3));
  const connectionsMaterial = lineMaterial(MUTED, 0.3);
  group.add(new THREE.LineSegments(connectionsGeometry, connectionsMaterial));

  const coreMaterial = meshMaterial(SIGNAL, { opacity: 0.46 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), coreMaterial);
  core.position.set(2.9, -0.3, 0);
  group.add(core);

  group.position.x = 2.6;
  group.userData.update = (time, progress) => {
    const collapse = THREE.MathUtils.smoothstep(progress, 0.08, 0.86);
    group.position.x = THREE.MathUtils.lerp(2.6, 0, collapse);
    group.position.y = THREE.MathUtils.lerp(0, -2.2, collapse);
    group.scale.setScalar(THREE.MathUtils.lerp(1, 0.34, collapse));
    group.rotation.y = time * 0.06 + progress * 4.2;
    group.rotation.x = Math.sin(time * 0.17) * 0.08 + progress * 0.7;
    core.rotation.x = time * 0.28 + progress * 5;
    core.rotation.y = time * 0.35 + progress * 3;
    core.scale.setScalar(1 + collapse * 5.5);
    coreMaterial.opacity = 0.46 * (1 - collapse * 0.75);
    pointsMaterial.size = 0.09 + collapse * 0.18;
    pointsMaterial.opacity = 0.95 * (1 - collapse * 0.52);
    connectionsMaterial.opacity = 0.3 * (1 - collapse * 0.82);
    points.rotation.z = time * -0.025 + progress * 3.8;
  };
  return group;
}

function makeFleet(): SceneGroup {
  const group = new THREE.Group() as SceneGroup;
  const grid = new THREE.GridHelper(12, 18, SIGNAL, MUTED);
  grid.rotation.x = Math.PI / 2;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  group.add(grid);

  const boundaryShape = [
    new THREE.Vector3(-4.8, -2.6, 0),
    new THREE.Vector3(-3.2, 2.5, 0),
    new THREE.Vector3(1.3, 3.1, 0),
    new THREE.Vector3(4.7, 1.8, 0),
    new THREE.Vector3(4.1, -2.2, 0),
    new THREE.Vector3(0.4, -3.1, 0),
    new THREE.Vector3(-4.8, -2.6, 0),
  ];
  const boundaryGeometry = new THREE.BufferGeometry().setFromPoints(boundaryShape);
  group.add(new THREE.Line(boundaryGeometry, lineMaterial(PAPER, 0.62)));

  const robotGeometry = new THREE.OctahedronGeometry(0.28, 0);
  const robots = [
    new THREE.Mesh(robotGeometry, meshMaterial(SIGNAL, { wireframe: false, opacity: 1 })),
    new THREE.Mesh(robotGeometry, meshMaterial(CYAN, { wireframe: false, opacity: 1 })),
    new THREE.Mesh(robotGeometry, meshMaterial(PAPER, { wireframe: false, opacity: 1 })),
  ];
  robots.forEach((robot) => group.add(robot));

  const routePoints = [
    new THREE.Vector3(-3.8, -1.8, 0.05),
    new THREE.Vector3(-1.5, 0.6, 0.05),
    new THREE.Vector3(1.2, 1.5, 0.05),
    new THREE.Vector3(3.4, -1.2, 0.05),
  ];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePoints), lineMaterial(SIGNAL, 0.9)));
  group.position.x = 3.8;
  group.rotation.z = -0.08;

  group.userData.update = (time, progress) => {
    const phase = progress * 2.5 + time * 0.05;
    robots[0].position.lerpVectors(routePoints[0], routePoints[1], Math.min(1, phase));
    robots[1].position.lerpVectors(routePoints[1], routePoints[2], Math.max(0, Math.min(1, phase - 0.75)));
    robots[2].position.lerpVectors(routePoints[2], routePoints[3], Math.max(0, Math.min(1, phase - 1.5)));
    robots.forEach((robot, index) => {
      robot.rotation.x = time * (0.5 + index * 0.15);
      robot.rotation.y = time * (0.35 + index * 0.1);
    });
  };
  return group;
}

function makeNode(): SceneGroup {
  const group = new THREE.Group() as SceneGroup;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 4.8, 8, 3), meshMaterial(PAPER));
  tower.position.y = -0.6;
  group.add(tower);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 8), meshMaterial(SIGNAL, {
    wireframe: false,
    opacity: 1,
  }));
  antenna.position.y = 3.2;
  group.add(antenna);

  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 + i * 0.65, 0.018, 6, 96),
      meshMaterial(i === 3 ? SIGNAL : MUTED, { wireframe: false, opacity: 0.42 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4.2;
    group.add(ring);
    rings.push(ring);
  }

  const packet = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    meshMaterial(SIGNAL, { wireframe: false, opacity: 1 }),
  );
  group.add(packet);

  const dataLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4.5, -2.7, 0),
      new THREE.Vector3(0, -2.7, 0),
      new THREE.Vector3(-3.6, -3.15, 0),
      new THREE.Vector3(0, -3.15, 0),
      new THREE.Vector3(-2.8, -3.6, 0),
      new THREE.Vector3(0, -3.6, 0),
    ]),
    lineMaterial(SIGNAL, 0.65),
  );
  group.add(dataLines);
  group.position.x = 4;

  group.userData.update = (time, progress) => {
    const cycle = (time * 0.22 + progress * 0.8) % 1;
    packet.position.set(Math.sin(cycle * Math.PI * 2) * 2.8, -2.7 + cycle * 7, Math.cos(cycle * Math.PI * 2));
    rings.forEach((ring, index) => {
      const pulse = 1 + Math.sin(time * 2 - index * 0.65) * 0.035;
      ring.scale.setScalar(pulse);
    });
    tower.rotation.y = time * 0.08;
  };
  return group;
}

function makeSlicer(): SceneGroup {
  const group = new THREE.Group() as SceneGroup;
  const layers: THREE.Mesh[] = [];
  const colors = [SIGNAL, CYAN, MAGENTA, PAPER];

  for (let row = 0; row < 22; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const width = 1.45 + ((row + column) % 4) * 0.3;
      const layer = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.08, 0.14),
        meshMaterial(colors[(row + column) % colors.length], { wireframe: false, opacity: 0.9 }),
      );
      layer.position.set(-2.3 + column * 2.2, -2.5 + row * 0.24, Math.sin(row * 0.45) * 0.4);
      layer.rotation.z = Math.sin(row * 0.3 + column) * 0.16;
      group.add(layer);
      layers.push(layer);
    }
  }

  const frame = new THREE.Mesh(new THREE.BoxGeometry(8.8, 6.6, 1.5), meshMaterial(MUTED, { opacity: 0.25 }));
  group.add(frame);
  group.position.x = 3.7;
  group.rotation.z = -0.05;

  group.userData.update = (time, progress) => {
    layers.forEach((layer, index) => {
      layer.position.z = Math.sin(time * 1.1 + index * 0.22 + progress * 4) * 0.45;
      layer.scale.x = 0.75 + Math.sin(time * 0.6 + index * 0.4) * 0.15 + progress * 0.18;
    });
    frame.rotation.y = Math.sin(time * 0.22) * 0.08;
  };
  return group;
}

function makeDrone(): SceneGroup {
  const group = new THREE.Group() as SceneGroup;
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), meshMaterial(SIGNAL, { opacity: 0.9 }));
  group.add(body);

  const rotors: THREE.Mesh[] = [];
  const arms: THREE.Line[] = [];
  const positions = [
    new THREE.Vector3(-2.3, 1.65, 0),
    new THREE.Vector3(2.3, 1.65, 0),
    new THREE.Vector3(-2.3, -1.65, 0),
    new THREE.Vector3(2.3, -1.65, 0),
  ];

  positions.forEach((position) => {
    const arm = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), position]),
      lineMaterial(PAPER, 0.65),
    );
    const rotor = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.035, 8, 64),
      meshMaterial(SIGNAL, { wireframe: false, opacity: 0.85 }),
    );
    rotor.position.copy(position);
    group.add(arm, rotor);
    arms.push(arm);
    rotors.push(rotor);
  });

  const target = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.32, 64), meshMaterial(PAPER, {
    wireframe: false,
    opacity: 0.45,
  }));
  target.position.y = -3.5;
  target.rotation.x = -0.45;
  group.add(target);
  group.position.x = 3.7;

  group.userData.update = (time, progress) => {
    group.position.y = Math.sin(time * 1.4) * 0.15 + progress * -0.55;
    group.rotation.z = Math.sin(time * 0.7) * 0.045;
    body.rotation.x = time * 0.22;
    body.rotation.y = time * 0.36;
    rotors.forEach((rotor, index) => {
      rotor.rotation.z = time * (3.8 + index * 0.4);
    });
    target.scale.setScalar(0.85 + Math.sin(time * 2.4) * 0.08);
    arms.forEach((arm) => {
      (arm.material as THREE.LineBasicMaterial).opacity = 0.5 + Math.sin(time * 1.5) * 0.12;
    });
  };
  return group;
}

export class SceneController {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly groups: Record<SceneId, SceneGroup>;
  private active: SceneId = "hero";
  private progress = 0;
  private pointer = new THREE.Vector2();
  private targetPointer = new THREE.Vector2();
  private frame = 0;
  private visible = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 12.5);

    this.groups = {
      hero: makeHero(),
      fleet: makeFleet(),
      node: makeNode(),
      slicer: makeSlicer(),
      drone: makeDrone(),
    };

    Object.entries(this.groups).forEach(([id, group]) => {
      group.visible = id === this.active;
      this.scene.add(group);
    });

    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.frame = requestAnimationFrame(this.render);
  }

  setScene(id: SceneId): void {
    if (id === this.active) return;
    this.groups[this.active].visible = false;
    this.active = id;
    this.groups[this.active].visible = true;
    this.progress = 0;
  }

  setProgress(progress: number): void {
    this.progress = THREE.MathUtils.clamp(progress, 0, 1);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.renderer.dispose();
  }

  private resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, width < 900 ? 1.15 : 1.55);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.targetPointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  };

  private onVisibility = (): void => {
    this.visible = document.visibilityState === "visible";
  };

  private render = (timestamp: number): void => {
    this.frame = requestAnimationFrame(this.render);
    if (!this.visible) return;
    const time = timestamp / 1000;
    this.pointer.lerp(this.targetPointer, 0.055);
    this.camera.position.x = this.pointer.x * 0.65;
    this.camera.position.y = this.pointer.y * 0.4;
    this.camera.lookAt(0, 0, 0);
    this.groups[this.active].userData.update?.(time, this.progress);
    this.renderer.render(this.scene, this.camera);
  };
}
