import { useEffect, useState } from "react";
import {
  CubeUVReflectionMapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  LinearSRGBColorSpace,
  RGBAFormat,
} from "three";

interface EnvironmentData {
  width: number;
  height: number;
  pixels: Uint16Array;
}

let cached: Promise<EnvironmentData | null> | undefined;

async function loadEnvironment(): Promise<EnvironmentData | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("/3d/studio-environment.json", {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload.encoding !== "gzip-base64" || typeof payload.data !== "string")
      return null;
    const compressed = Uint8Array.from(atob(payload.data), (byte) =>
      byte.charCodeAt(0),
    );
    const buffer = await new Response(
      new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x31565543) return null;
    const width = header.getUint32(4, true);
    const height = header.getUint32(8, true);
    if (!width || !height || buffer.byteLength !== 12 + width * height * 8)
      return null;
    return { width, height, pixels: new Uint16Array(buffer, 12) };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useSceneEnvironment() {
  const [environment, setEnvironment] = useState<DataTexture | null>();
  useEffect(() => {
    let active = true;
    let texture: DataTexture | null = null;
    cached ??= loadEnvironment();
    void cached.then((data) => {
      if (!active) return;
      if (data) {
        texture = new DataTexture(
          data.pixels,
          data.width,
          data.height,
          RGBAFormat,
          HalfFloatType,
        );
        texture.mapping = CubeUVReflectionMapping;
        texture.colorSpace = LinearSRGBColorSpace;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
      }
      setEnvironment(texture);
    });
    return () => {
      active = false;
      texture?.dispose();
    };
  }, []);
  return environment;
}
