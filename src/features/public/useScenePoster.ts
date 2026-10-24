import { useEffect, useRef, useState } from "react";

export function useScenePoster() {
  const poster = useRef<HTMLImageElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const image = poster.current;
    if (!image) return;
    let frame = 0;
    // Give the poster a paint before WebGL setup and shader compilation.
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPainted(true));
      });
    };
    if (image.complete) start();
    else {
      image.addEventListener("load", start);
      image.addEventListener("error", start);
    }
    return () => {
      cancelAnimationFrame(frame);
      image.removeEventListener("load", start);
      image.removeEventListener("error", start);
    };
  }, []);

  return { poster, painted };
}
