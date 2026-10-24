import * as THREE from "three";

/** A single wire field shares the medical scene's renderer and motion controls. */
export function createAmbientField(
  scene: THREE.Scene,
  offsetX = 0,
  host?: HTMLElement,
) {
  const group = new THREE.Group();
  const vertices: number[] = [];
  const point = (x: number, y: number) =>
    new THREE.Vector3(x, y, Math.sin(x * 0.5) * Math.cos(y * 0.4) * 0.5);
  const segment = (a: THREE.Vector3, b: THREE.Vector3) => {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };
  for (let y = -6; y <= 6; y += 0.55) {
    for (let x = -10; x < 10; x += 0.25)
      segment(point(x, y), point(x + 0.25, y));
  }
  for (let x = -10; x <= 10; x += 0.55) {
    for (let y = -6; y < 6; y += 0.25) segment(point(x, y), point(x, y + 0.25));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  const material = new THREE.LineBasicMaterial({
    color: "#6bbdbd",
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(geometry, material));
  const traceGeometry = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 81 }, (_, i) => point(-10 + i * 0.25, 0)),
  );
  const traceMaterial = new THREE.LineBasicMaterial({
    color: "#a5e3d9",
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  const trace = new THREE.Line(traceGeometry, traceMaterial);
  group.add(trace);
  group.position.set(offsetX, 0, -3.5);
  group.rotation.set(-0.3, 0.12, 0.12);
  scene.add(group);
  let themeChanged = false;
  const syncTheme = () => {
    const dark = document.documentElement.classList.contains("dark");
    const palette = host ? getComputedStyle(host) : null;
    material.color.set(
      palette?.getPropertyValue("--p-grid").trim() ||
        (dark ? "#6bbdbd" : "#2463eb"),
    );
    traceMaterial.color.set(
      palette?.getPropertyValue("--p-trace").trim() ||
        (dark ? "#a5e3d9" : "#2463eb"),
    );
    themeChanged = true;
  };
  syncTheme();
  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return {
    consumeThemeChange() {
      const changed = themeChanged;
      themeChanged = false;
      return changed;
    },
    update(time: number) {
      group.rotation.y = 0.12 + Math.sin(time * 0.1) * 0.07;
      group.position.y = Math.sin(time * 0.13) * 0.18;
      trace.position.y = Math.sin(time * 0.18) * 3.5;
    },
    dispose() {
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      traceGeometry.dispose();
      traceMaterial.dispose();
      scene.remove(group);
    },
  };
}
