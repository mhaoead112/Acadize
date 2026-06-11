'use client';
import { motion } from "framer-motion";

interface ShapeProps {
  variant?: "hero" | "cta" | "section" | "dark";
}

export function GeometricShapes({ variant = "section" }: ShapeProps) {
  if (variant === "hero") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Large blurred circle top-right */}
        <motion.div
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />
        {/* Accent circle bottom-left */}
        <motion.div
          className="absolute -bottom-24 -left-24 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
        />
        {/* Floating ring top-left */}
        <motion.div
          className="absolute top-20 left-10 w-16 h-16 rounded-full border-2 border-primary/20"
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        />
        {/* Small dot cluster */}
        <motion.div
          className="absolute top-40 right-[20%] w-3 h-3 rounded-full bg-primary/30"
          animate={{ y: [0, -12, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-52 right-[22%] w-2 h-2 rounded-full bg-accent/50"
          animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute top-48 right-[18%] w-4 h-4 rounded-full bg-primary/20"
          animate={{ y: [0, -16, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
        />
        {/* Floating square bottom-right */}
        <motion.div
          className="absolute bottom-20 right-20 w-10 h-10 rounded-lg bg-accent/20 border border-accent/30"
          animate={{ rotate: [0, 45, 0], y: [0, -14, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        {/* Triangle-ish shape */}
        <motion.div
          className="absolute bottom-40 left-[15%] w-6 h-6 rotate-45 bg-primary/15 rounded-sm"
          animate={{ rotate: [45, 90, 45], y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1.5 }}
        />
        {/* Dotted grid pattern */}
        <div className="absolute right-0 top-1/4 w-40 h-40 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)",
            backgroundSize: "16px 16px"
          }}
        />
        <div className="absolute left-0 bottom-1/3 w-32 h-32 opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--accent)) 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px"
          }}
        />
      </div>
    );
  }

  if (variant === "cta") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-accent/10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 9, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-10 left-1/4 w-8 h-8 rounded-full border-2 border-white/20"
          animate={{ y: [0, -20, 0], rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-10 right-1/4 w-5 h-5 rotate-45 bg-accent/30 rounded-sm"
          animate={{ rotate: [45, 135, 45], y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        />
        <div className="absolute left-10 top-1/3 w-32 h-32 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "16px 16px"
          }}
        />
        <div className="absolute right-10 bottom-1/3 w-32 h-32 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "14px 14px"
          }}
        />
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-accent/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 11, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute top-16 left-10 w-12 h-12 rounded-full border border-white/10"
          animate={{ y: [0, -18, 0], rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-16 right-16 w-8 h-8 rotate-45 border border-accent/30"
          animate={{ rotate: [45, 90, 45], y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        <div className="absolute right-12 top-1/4 w-36 h-36 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)",
            backgroundSize: "18px 18px"
          }}
        />
      </div>
    );
  }

  // section (default)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-2xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-10 right-[10%] w-5 h-5 rounded-full bg-primary/20"
        animate={{ y: [0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 left-[8%] w-8 h-8 rotate-45 bg-accent/15 rounded-sm"
        animate={{ rotate: [45, 90, 45] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
      />
      <div className="absolute right-6 bottom-1/4 w-28 h-28 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)",
          backgroundSize: "14px 14px"
        }}
      />
    </div>
  );
}
