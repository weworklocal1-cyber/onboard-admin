"use client";

import { useEffect, useRef, useState } from "react";

export function useInView(
  ref: React.RefObject<HTMLElement | null>,
  options?: { once?: boolean; margin?: string }
) {
  const [inView, setInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (options?.once && hasAnimated) return;
          setInView(true);
          setHasAnimated(true);
        } else if (!options?.once) {
          setInView(false);
        }
      },
      { threshold: 0.15, rootMargin: options?.margin ?? "0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, options?.once, options?.margin, hasAnimated]);

  return inView;
}

export function useMouseParallax(intensity = 0.015) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setOffset({
        x: (window.innerWidth / 2 - e.clientX) * intensity,
        y: (window.innerHeight / 2 - e.clientY) * intensity,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [intensity]);

  return offset;
}

export function useCountUp(end: number, duration = 2) {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setCount(Math.round((1 - Math.pow(1 - progress, 3)) * end));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [running, end, duration]);

  return { count, start: () => setRunning(true) };
}
