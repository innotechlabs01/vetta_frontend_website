"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type AnimatedHeightProps = {
  children: ReactNode;
  className?: string;
  durationMs?: number;
};

export default function AnimatedHeight({
  children,
  className,
  durationMs = 240,
}: AnimatedHeightProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const setHeight = () => {
      frameRef.current = window.requestAnimationFrame(() => {
        const nextHeight = content.getBoundingClientRect().height;
        setMeasuredHeight(nextHeight);
      });
    };

    setHeight();

    const resizeObserver = new ResizeObserver(() => {
      setHeight();
    });

    resizeObserver.observe(content);

    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      resizeObserver.disconnect();
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "overflow-hidden transition-[height] ease-in-out",
        className,
      )}
      style={{
        height: measuredHeight != null ? `${measuredHeight}px` : undefined,
        transitionDuration: `${durationMs}ms`,
      }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
