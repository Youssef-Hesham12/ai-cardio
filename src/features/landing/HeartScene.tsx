import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createAmbientField } from "../public/AmbientField";
import { useScenePoster } from "../public/useScenePoster";
import { useSceneEnvironment } from "../public/useSceneEnvironment";

export type HeartView = "surface" | "structure";
interface Props {
  paused: boolean;
  view: HeartView;
  resetKey: number;
  presentation?: "hero" | "login";
}

function createHeart() {
  const group = new THREE.Group();
  const tissue = new THREE.MeshPhysicalMaterial({
    color: "#721424",
    roughness: 0.5,
    metalness: 0.08,
    clearcoat: 0.1,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.7,
  });
  const artery = new THREE.MeshPhysicalMaterial({
    color: "#416ea9",
    roughness: 0.38,
    metalness: 0.15,
    envMapIntensity: 0.65,
    side: THREE.DoubleSide,
  });
  const coronary = new THREE.MeshStandardMaterial({
    color: "#edb0a6",
    roughness: 0.55,
    envMapIntensity: 0.5,
  });
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const taper = 0.8 + 0.2 * y;
    positions.setXYZ(
      i,
      x * 1.12 * taper - 0.17 * (1 - y),
      y * 1.4,
      z * 0.84 * taper,
    );
  }
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, tissue));

  for (const [x, y, z, sx, sy, sz] of [
    [-0.69, 0.93, -0.12, 0.42, 0.48, 0.43],
    [0.55, 1.02, -0.15, 0.39, 0.42, 0.41],
  ]) {
    const atrium = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), tissue);
    atrium.position.set(x, y, z);
    atrium.scale.set(sx, sy, sz);
    group.add(atrium);
  }
  const tube = (
    points: number[][],
    radius: number,
    material: THREE.Material,
    segments = 40,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, radius, 12, false),
      material,
    );
    group.add(mesh);
    return mesh;
  };
  // Sculptural anatomy, not a clinical or anatomically validated reference model.
  tube(
    [
      [0.02, 0.92, -0.03],
      [0.05, 1.47, -0.04],
      [0.36, 1.83, -0.03],
      [0.78, 1.81, -0.12],
      [0.96, 1.46, -0.33],
      [0.76, 1.04, -0.47],
    ],
    0.22,
    artery,
  );
  tube(
    [
      [0.28, 1.76, -0.03],
      [0.19, 2.05, -0.02],
      [0.17, 2.27, 0.02],
    ],
    0.085,
    artery,
    28,
  );
  tube(
    [
      [0.51, 1.84, -0.05],
      [0.54, 2.06, -0.09],
      [0.64, 2.26, -0.12],
    ],
    0.082,
    artery,
    28,
  );
  tube(
    [
      [0.74, 1.82, -0.12],
      [0.9, 2.05, -0.15],
      [1.07, 2.17, -0.18],
    ],
    0.078,
    artery,
    28,
  );
  tube(
    [
      [0.28, 0.89, 0.24],
      [0.03, 1.27, 0.39],
      [-0.41, 1.43, 0.36],
      [-0.88, 1.45, 0.12],
    ],
    0.18,
    artery,
  );
  tube(
    [
      [-0.46, 1.03, -0.21],
      [-0.57, 1.46, -0.23],
      [-0.47, 1.91, -0.23],
    ],
    0.18,
    tissue,
  );

  const front = (x: number, y: number) => {
    const yn = y / 1.4,
      taper = 0.8 + 0.2 * yn,
      center = -0.17 * (1 - yn);
    return [
      x,
      y,
      0.84 *
        taper *
        Math.sqrt(
          Math.max(0.015, 1 - ((x - center) / (1.12 * taper)) ** 2 - yn ** 2),
        ) +
        0.025,
    ];
  };
  const vessels = new THREE.Group();
  const branches = [
    [
      [0.04, 1.03],
      [-0.03, 0.75],
      [-0.18, 0.36],
      [-0.25, -0.12],
      [-0.26, -0.63],
      [-0.31, -1.18],
    ],
    [
      [-0.12, 0.52],
      [0.16, 0.45],
      [0.46, 0.24],
      [0.69, -0.04],
    ],
    [
      [-0.21, 0.1],
      [-0.51, -0.05],
      [-0.76, -0.34],
    ],
    [
      [-0.25, -0.4],
      [0.02, -0.57],
      [0.28, -0.84],
    ],
    [
      [-0.27, -0.77],
      [-0.49, -0.94],
      [-0.53, -1.12],
    ],
    [
      [0.15, 0.92],
      [0.44, 0.76],
      [0.72, 0.48],
      [0.87, 0.15],
    ],
    [
      [0.54, 0.65],
      [0.31, 0.16],
      [0.22, -0.34],
    ],
    [
      [-0.54, 0.79],
      [-0.73, 0.43],
      [-0.84, -0.03],
    ],
    [
      [-0.71, 0.42],
      [-0.46, 0.2],
      [-0.2, 0.04],
    ],
  ];
  branches.forEach((branch, i) => {
    const mesh = tube(
      branch.map(([x, y]) => front(x, y)),
      i === 0 ? 0.035 : 0.019,
      coronary,
    );
    vessels.attach(mesh);
  });
  group.add(vessels);
  const scan = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: "#8eb5ff",
      size: 0.022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    }),
  );
  scan.visible = false;
  group.add(scan);
  group.rotation.z = -0.2;
  return { group, tissue, artery, vessels, scan };
}

export default function HeartScene({
  paused,
  view,
  resetKey,
  presentation = "hero",
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { poster, painted } = useScenePoster();
  const environment = useSceneEnvironment();
  const settings = useRef({ paused, view, resetKey });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    settings.current = { paused, view, resetKey };
  }, [paused, view, resetKey]);

  useEffect(() => {
    const element = host.current;
    if (!element || !painted || environment === undefined) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.scene = "cardiac-study";
    renderer.domElement.dataset.background = "spatial-field";
    renderer.domElement.dataset.lighting = environment ? "baked" : "direct";
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const ambient = createAmbientField(scene, 2.1, element);
    scene.environment = environment;
    scene.add(new THREE.HemisphereLight("#ffffff", "#9ba6b8", 1.4));
    const key = new THREE.DirectionalLight("#ffffff", 2.8);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#8edcd5", 2.4);
    rim.position.set(4, 2, -3);
    scene.add(rim);
    const fill = new THREE.DirectionalLight("#c5d5e8", 1.1);
    fill.position.set(-4, 0, -1);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 40);
    camera.position.set(0, 0.55, 7.4);
    camera.lookAt(0, 0.35, 0);
    const { group, tissue, artery, vessels, scan } = createHeart();
    const studyBounds =
      presentation === "login" ? new THREE.Box3().setFromObject(group) : null;
    const studySize = studyBounds?.getSize(new THREE.Vector3());
    const studyCenter = studyBounds?.getCenter(new THREE.Vector3());
    scene.add(group);
    const pointer = new THREE.Vector2();
    const currentPointer = new THREE.Vector2();
    let width = 1,
      height = 1,
      frame = 0,
      lastTime = 0,
      elapsed = 0,
      visible = true,
      dirty = true;
    let lastView: HeartView = "surface",
      previousPaused = settings.current.paused,
      previousReset = settings.current.resetKey,
      rotation = 0,
      dragging = false,
      lastX = 0,
      markedReady = false,
      disposed = false;
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const vertical =
        2 *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        camera.position.z;
      const horizontal = vertical * camera.aspect;
      if (studySize && studyCenter) {
        const scale = Math.min(
          (vertical * 0.74) / studySize.y,
          (horizontal * 0.74) / studySize.x,
        );
        group.position.set(
          -studyCenter.x * scale,
          0.35 - studyCenter.y * scale,
          0,
        );
        group.scale.setScalar(scale);
        group.userData.baseScale = scale;
        dirty = true;
        return;
      }
      const mobile = width < 761;
      group.position.set(
        mobile ? horizontal * 0.08 : horizontal * 0.24,
        mobile ? -vertical * 0.15 : -vertical * 0.015,
        0,
      );
      const scale = mobile
        ? height < 580
          ? 0.53
          : 0.69
        : width < 901
          ? 0.96
          : width < 1100
            ? 1.07
            : 1.22;
      group.scale.setScalar(scale);
      group.userData.baseScale = scale;
      dirty = true;
    };
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / width) * 2 - 1,
        ((event.clientY - rect.top) / height) * 2 - 1,
      );
      if (dragging) rotation += (event.clientX - lastX) * 0.007;
      lastX = event.clientX;
      dirty = true;
    };
    const down = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (
        presentation !== "login" &&
        (event.clientX - rect.left) / width < (width < 761 ? 0.1 : 0.53)
      )
        return;
      dragging = true;
      lastX = event.clientX;
      element.setPointerCapture(event.pointerId);
    };
    const up = () => {
      dragging = false;
    };
    const leave = () => {
      pointer.set(0, 0);
      dirty = true;
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      dirty = true;
    });
    intersection.observe(element);
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (ambient.consumeThemeChange()) dirty = true;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const state = settings.current;
      if (state.paused !== previousPaused) {
        previousPaused = state.paused;
        dirty = true;
      }
      if (state.resetKey !== previousReset) {
        rotation = 0;
        pointer.set(0, 0);
        currentPointer.set(0, 0);
        previousReset = state.resetKey;
        dirty = true;
      }
      if (state.view !== lastView) {
        const structure = state.view === "structure";
        tissue.wireframe = structure;
        tissue.transparent = structure;
        tissue.opacity = structure ? 0.12 : 1;
        tissue.depthWrite = !structure;
        artery.wireframe = structure;
        scan.visible = structure;
        vessels.visible = true;
        lastView = state.view;
        dirty = true;
      }
      const canRender = visible || (presentation === "login" && dirty);
      if (!canRender || document.hidden || (!dirty && state.paused)) return;
      if (!state.paused) elapsed += dt * 0.7;
      ambient.update(elapsed);
      currentPointer.lerp(pointer, 0.06);
      group.rotation.y =
        0.27 +
        rotation +
        currentPointer.x * 0.14 +
        Math.sin(elapsed * 0.28) * 0.15;
      group.rotation.x =
        currentPointer.y * 0.065 + Math.sin(elapsed * 0.18) * 0.025;
      const beat = state.paused
        ? 0
        : Math.pow(Math.max(0, Math.sin(elapsed * 4.8)), 8) * 0.008;
      group.scale.setScalar(group.userData.baseScale * (1 + beat));
      renderer.render(scene, camera);
      renderer.domElement.dataset.frames = String(
        Number(renderer.domElement.dataset.frames || 0) + 1,
      );
      if (!markedReady) {
        setReady(true);
        markedReady = true;
      }
      dirty = false;
    };
    void renderer.compileAsync(scene, camera).then(
      () => {
        if (!disposed) frame = requestAnimationFrame(render);
      },
      () => {
        if (!disposed) setUnavailable(true);
      },
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ambient.dispose();
      observer.disconnect();
      intersection.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [presentation, painted, environment]);

  return (
    <div
      className={`intro-heart-scene ${ready && !unavailable ? "is-ready" : ""} ${unavailable ? "is-fallback" : ""}`}
      ref={host}
      role="img"
      aria-label="Interactive sculptural heart study, an illustrative nonclinical 3D model"
    >
      <img
        ref={poster}
        className="intro-heart-fallback"
        src="/images/heart-study.png"
        alt="Sculptural cardiac study"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
}
