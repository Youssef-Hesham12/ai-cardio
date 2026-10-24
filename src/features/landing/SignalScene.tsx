import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Props {
  paused: boolean;
  view: "ribbon" | "layers";
}

const SAMPLES = 480;

// A stylized repeating wave, not a measured or diagnostic ECG.
function signal(x: number, time: number) {
  const phase = ((x + time * 1.8 + 20) % 3.4) - 1.7;
  const peak = (center: number, width: number, amplitude: number) =>
    amplitude * Math.exp(-(((phase - center) / width) ** 2));
  return (
    peak(-0.8, 0.21, 0.13) -
    peak(-0.16, 0.07, 0.17) +
    peak(0, 0.08, 1.05) -
    peak(0.16, 0.09, 0.28) +
    peak(0.68, 0.27, 0.25)
  );
}

export default function SignalScene({ paused, view }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useRef({ paused, view });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    settings.current = { paused, view };
  }, [paused, view]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
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
    renderer.domElement.dataset.scene = "cardiac-signal";
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#1c2c46", 2));
    const light = new THREE.DirectionalLight("#ffffff", 3.2);
    light.position.set(-2, 5, 4);
    scene.add(light);
    const rim = new THREE.DirectionalLight("#8eb5ff", 2.2);
    rim.position.set(4, 1, -3);
    scene.add(rim);
    const camera = new THREE.OrthographicCamera(-8, 8, 3.1, -3.1, 0.1, 40);
    camera.position.set(2, 4.5, 8);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);
    const ribbons = Array.from({ length: 7 }, (_, lane) => {
      const positions = new Float32Array((SAMPLES + 1) * 2 * 3);
      const indices = [];
      for (let i = 0; i < SAMPLES; i++) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      geometry.setIndex(indices);
      const material = new THREE.MeshStandardMaterial({
        color: lane === 3 ? "#e76e85" : lane < 3 ? "#578cff" : "#65c7ac",
        roughness: 0.36,
        metalness: 0.24,
        side: THREE.DoubleSide,
      });
      const ribbon = new THREE.Mesh(geometry, material);
      ribbon.frustumCulled = false;
      group.add(ribbon);
      return ribbon;
    });
    let width = 1,
      visible = true,
      dirty = true,
      elapsed = 0,
      lastTime = 0,
      frame = 0;
    let previousPaused = settings.current.paused,
      previousView = settings.current.view;
    let markedReady = false;
    const pointer = new THREE.Vector2();
    const resize = () => {
      width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const halfWidth = (3.1 * width) / height;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.updateProjectionMatrix();
      group.scale.setScalar(
        Math.min(
          width < 761 ? 0.74 : 1.1,
          (halfWidth * 2 - 0.8) / (width < 761 ? 10.8 : 12.8),
        ),
      );
      dirty = true;
    };
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set(
        (event.clientX - rect.left) / rect.width - 0.5,
        (event.clientY - rect.top) / rect.height - 0.5,
      );
      dirty = true;
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
    element.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      dirty = true;
    });
    intersection.observe(element);
    resize();
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const state = settings.current;
      if (state.paused !== previousPaused || state.view !== previousView) {
        previousPaused = state.paused;
        previousView = state.view;
        dirty = true;
      }
      if (document.hidden || (!visible && !dirty) || (!dirty && state.paused))
        return;
      if (!state.paused) elapsed += dt;
      const layered = state.view === "layers";
      ribbons.forEach((ribbon, lane) => {
        const positions = ribbon.geometry.attributes.position;
        for (let i = 0; i <= SAMPLES; i++) {
          const x = (i / SAMPLES - 0.5) * 12;
          const y =
            signal(x, elapsed + (layered ? lane * 0.09 : 0)) +
            (layered ? (lane - 3) * 0.2 : 0);
          for (let edge = 0; edge < 2; edge++) {
            positions.setXYZ(
              i * 2 + edge,
              x,
              y,
              (lane - 3) * 0.38 + (edge - 0.5) * 0.25,
            );
          }
        }
        positions.needsUpdate = true;
        ribbon.geometry.computeVertexNormals();
      });
      group.rotation.set(
        0,
        0.12 + Math.sin(elapsed * 0.35) * 0.08 + pointer.x * 0.12,
        width < 761 ? -0.58 : -0.05 + pointer.y * 0.06,
      );
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
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      ribbons.forEach((ribbon) => {
        ribbon.geometry.dispose();
        ribbon.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      className={`intro-signal-scene ${ready && !unavailable ? "is-ready" : ""} ${unavailable ? "is-fallback" : ""}`}
      role="img"
      aria-label="Animated sculptural cardiac signal, an illustrative nonclinical 3D study"
    >
      {(!ready || unavailable) && (
        <picture>
          <source
            media="(max-width: 760px)"
            srcSet="/images/signal-study-mobile.png"
          />
          <img
            src="/images/signal-study.png"
            alt="Illustrative layered cardiac signal"
          />
        </picture>
      )}
    </div>
  );
}
