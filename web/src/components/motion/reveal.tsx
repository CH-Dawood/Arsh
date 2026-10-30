"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { motionTokens } from "@/lib/motion/tokens";

/**
 * Fades content up once when it scrolls into view. Use below the fold only: the hidden
 * start state is part of the server HTML, so above-the-fold content would flash in late.
 * Text stays in the HTML either way, so crawlers still read it.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: motionTokens.distance.lg }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.luxe, delay }}
    >
      {children}
    </motion.div>
  );
}
