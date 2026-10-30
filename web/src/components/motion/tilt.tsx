"use client";

import { motion, useSpring } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { canRunRichMotion } from "@/lib/motion/tokens";

const subscribe = () => () => {};
const canTilt = () => canRunRichMotion() && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const tiltSpring = { stiffness: 180, damping: 22, mass: 0.6 };

/**
 * Pointer-following 3D tilt driven by motion values (no React re-renders per frame).
 * Disabled on touch screens, low-power devices and when reduced motion is requested.
 */
export function Tilt({ children, className, max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const enabled = useSyncExternalStore(subscribe, canTilt, () => false);
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        rotateY.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
        rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
