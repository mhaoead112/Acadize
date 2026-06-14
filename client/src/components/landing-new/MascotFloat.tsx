'use client';
import { motion } from "framer-motion";

interface MascotFloatProps {
  src: string;
  alt: string;
  className?: string;
  animation?: "float" | "bounce" | "spin-float" | "sway" | "pulse-float";
  delay?: number;
}

const animations: Record<string, object> = {
  float: {
    animate: { y: [0, -18, 0] },
    transition: { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
  },
  bounce: {
    animate: { y: [0, -24, 0], scaleY: [1, 1.05, 1] },
    transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" }
  },
  "spin-float": {
    animate: { y: [0, -14, 0], rotate: [-4, 4, -4] },
    transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
  },
  sway: {
    animate: { x: [-8, 8, -8], y: [0, -8, 0] },
    transition: { repeat: Infinity, duration: 3.5, ease: "easeInOut" }
  },
  "pulse-float": {
    animate: { y: [0, -12, 0], scale: [1, 1.04, 1] },
    transition: { repeat: Infinity, duration: 2.8, ease: "easeInOut" }
  }
};

export function MascotFloat({ src, alt, className, animation = "float", delay = 0 }: MascotFloatProps) {
  const anim = animations[animation];
  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, ...(anim as any).animate }}
      transition={{ opacity: { duration: 0.4, delay }, scale: { duration: 0.4, delay }, ...(anim as any).transition, delay }}
      data-testid={`mascot-${alt.replace(/\s+/g, "-").toLowerCase()}`}
    />
  );
}
