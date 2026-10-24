import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createAmbientField } from "../public/AmbientField";
import { useScenePoster } from "../public/useScenePoster";
import { useSceneEnvironment } from "../public/useSceneEnvironment";

interface Props {
  paused: boolean;
  resetKey: number;
}

function createVesselStudy() {
  const group = new THREE.Group();
  const tubularSegments = 64;
  const radialSegments = 24;
  const stride = radialSegments + 1;
  const shell = new THREE.MeshPhysicalMaterial({
    color: "#b6e5e3",
    transparent: true,
    opacity: 0.2,
    roughness: 0.25,
    metalness: 0.03,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wall = new THREE.MeshPhysicalMaterial({
    color: "#873343",
    roughness: 0.5,
    metalness: 0.04,
    clearcoat: 0.2,
    side: THREE.DoubleSide,
  });
  const lumen = new THREE.MeshStandardMaterial({
    color: "#4a273c",
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.MeshStandardMaterial({
    color: "#cd8c8b",
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  // Conceptual coronary-vessel cutaway, not an anatomically validated model.
  const branches = [
    {
      radius: 0.39,
      points: [
        [-0.6, -2.05, 0],
        [-0.47, -1.3, 0.08],
        [-0.06, -0.45, 0],
        [0.16, 0.44, -0.12],
        [0.02, 1.28, -0.12],
        [0.26, 2.04, -0.04],
      ],
    },
    {
      radius: 0.25,
      points: [
        [0.04, -0.15, -0.03],
        [0.65, 0.18, 0.05],
        [1.11, 0.74, 0.17],
        [1.44, 1.43, 0.38],
      ],
    },
    {
      radius: 0.19,
      points: [
        [-0.38, -1.05, 0.05],
        [-0.95, -0.78, 0.16],
        [-1.39, -0.26, 0.23],
        [-1.53, 0.35, 0.32],
      ],
    },
  ];
  for (const branch of branches) {
    const curve = new THREE.CatmullRomCurve3(
      branch.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const meshFor = (radius: number, material: THREE.Material) => {
      const geometry = new THREE.TubeGeometry(
        curve,
        tubularSegments,
        radius,
        radialSegments,
        false,
      );
      const positions = geometry.attributes.position;
      for (let ring = 0; ring <= tubularSegments; ring++) {
        const t = ring / tubularSegments,
          center = curve.getPointAt(t),
          taper = 1 - t * 0.17;
        for (let side = 0; side <= radialSegments; side++) {
          const i = ring * stride + side;
          positions.setXYZ(
            i,
            center.x + (positions.getX(i) - center.x) * taper,
            center.y + (positions.getY(i) - center.y) * taper,
            center.z + (positions.getZ(i) - center.z) * taper,
          );
        }
      }
      geometry.computeVertexNormals();
      if (material === wall && branch === branches[0]) {
        // Reveal the lumen along the front of the main vessel.
        const index = geometry.index!;
        const normals = geometry.attributes.normal;
        const kept: number[] = [];
        for (let i = 0; i < index.count; i += 6) {
          const a = index.getX(i);
          const t = Math.floor(a / stride) / tubularSegments;
          const side = a % stride;
          const middle = (tubularSegments / 2) * stride + side;
          const facing = (normals.getZ(middle) + normals.getZ(middle + 1)) / 2;
          if (t > 0.24 && t < 0.74 && facing > 0.3) continue;
          for (let vertex = 0; vertex < 6; vertex++)
            kept.push(index.getX(i + vertex));
        }
        geometry.setIndex(kept);
      }
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
    };
    meshFor(branch.radius, shell);
    meshFor(branch.radius * 0.73, wall);
    meshFor(branch.radius * 0.53, lumen);
    for (const end of [0, 1]) {
      const taper = 1 - end * 0.17;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          branch.radius * 0.53 * taper,
          branch.radius * 0.73 * taper,
          48,
        ),
        rim,
      );
      ring.position.copy(curve.getPointAt(end));
      ring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        curve.getTangentAt(end),
      );
      group.add(ring);
    }
  }
  group.rotation.z = -0.21;
  return group;
}

export default function CoronaryScene({ paused, resetKey }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { poster, painted } = useScenePoster();
  const environment = useSceneEnvironment();
  const settings = useRef({ paused, resetKey });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    settings.current = { paused, resetKey };
  }, [paused, resetKey]);
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
    renderer.toneMappingExposure = 0.85;
    renderer.domElement.dataset.scene = "coronary-study";
    renderer.domElement.dataset.background = "spatial-field";
    renderer.domElement.dataset.lighting = environment ? "baked" : "direct";
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const ambient = createAmbientField(scene, 0, element);
    scene.environment = environment;
    scene.add(new THREE.HemisphereLight("#ecffff", "#113445", 1.5));
    const key = new THREE.DirectionalLight("#ffffff", 2.8);
    key.position.set(-4, 4, 5);
    scene.add(key);
    const edge = new THREE.DirectionalLight("#7bded6", 2.4);
    edge.position.set(3, 1, -3);
    scene.add(edge);
    const fill = new THREE.DirectionalLight("#b0d6e2", 1);
    fill.position.set(-3, -2, 2);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 0.2, 8);
    camera.lookAt(0, 0, 0);
    const group = createVesselStudy();
    scene.add(group);
    const bounds = new THREE.Box3().setFromObject(group),
      size = bounds.getSize(new THREE.Vector3()),
      center = bounds.getCenter(new THREE.Vector3());
    const pointer = new THREE.Vector2(),
      currentPointer = new THREE.Vector2();
    let width = 1,
      height = 1,
      frame = 0,
      elapsed = 0,
      lastTime = 0,
      visible = true,
      dirty = true,
      lost = false;
    let previousPaused = settings.current.paused,
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
      const scale = Math.min(
        (vertical * 0.76) / size.y,
        (vertical * camera.aspect * 0.72) / size.x,
      );
      group.scale.setScalar(scale);
      group.userData.baseScale = scale;
      group.position.set(-center.x * scale, -center.y * scale, 0);
      dirty = true;
    };
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set(
        (event.clientX - rect.left) / width - 0.5,
        (event.clientY - rect.top) / height - 0.5,
      );
      if (dragging) rotation += (event.clientX - lastX) * 0.006;
      lastX = event.clientX;
      dirty = true;
    };
    const down = (event: PointerEvent) => {
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
      lost = true;
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
      if (
        lost ||
        document.hidden ||
        (!visible && !dirty) ||
        (state.paused && !dirty)
      )
        return;
      if (!state.paused) elapsed += dt;
      ambient.update(elapsed);
      currentPointer.lerp(pointer, 0.06);
      group.rotation.y =
        0.35 +
        rotation +
        Math.sin(elapsed * 0.21) * 0.14 +
        currentPointer.x * 0.18;
      group.rotation.x =
        0.22 + Math.sin(elapsed * 0.16) * 0.025 + currentPointer.y * 0.08;
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
      const materials = new Set<THREE.Material>();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material))
            object.material.forEach((material) => materials.add(material));
          else materials.add(object.material);
        }
      });
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [painted, environment]);
  return (
    <div
      ref={host}
      className={`coronary-scene ${ready && !unavailable ? "is-ready" : ""} ${unavailable ? "is-fallback" : ""}`}
      role="img"
      aria-label="Interactive translucent coronary-vessel cutaway, an illustrative nonclinical 3D study"
    >
      <img
        ref={poster}
        className="coronary-fallback"
        src="/images/coronary-study.png"
        alt="Illustrative translucent coronary-vessel study"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
}
