import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export default function ParallaxBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Create smooth spring animations for parallax
  const springConfig = { stiffness: 50, damping: 20 };
  const x1 = useSpring(useTransform(mouseX, [0, 1], [-30, 30]), springConfig);
  const y1 = useSpring(useTransform(mouseY, [0, 1], [-30, 30]), springConfig);
  const x2 = useSpring(useTransform(mouseX, [0, 1], [-50, 50]), springConfig);
  const y2 = useSpring(useTransform(mouseY, [0, 1], [-50, 50]), springConfig);
  const x3 = useSpring(useTransform(mouseX, [0, 1], [-20, 20]), springConfig);
  const y3 = useSpring(useTransform(mouseY, [0, 1], [-20, 20]), springConfig);
  const x4 = useSpring(useTransform(mouseX, [0, 1], [-40, 40]), springConfig);
  const y4 = useSpring(useTransform(mouseY, [0, 1], [-40, 40]), springConfig);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Normalize mouse position to 0-1 range
      mouseX.set(clientX / innerWidth);
      mouseY.set(clientY / innerHeight);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient Overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20" />
      <div className="absolute inset-0 bg-gradient-to-tl from-cyan-50/20 via-transparent to-pink-50/20 dark:from-cyan-950/10 dark:via-transparent dark:to-pink-950/10" />

      {/* Glowing Blob 1 - Large Blue */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 dark:opacity-30"
        style={{
          x: x1,
          y: y1,
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0) 70%)",
          top: "10%",
          left: "15%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Glowing Blob 2 - Medium Purple */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[90px] opacity-20 dark:opacity-25"
        style={{
          x: x2,
          y: y2,
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(168, 85, 247, 0) 70%)",
          top: "50%",
          right: "10%",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Glowing Blob 3 - Small Cyan */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-15 dark:opacity-20"
        style={{
          x: x3,
          y: y3,
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, rgba(6, 182, 212, 0) 70%)",
          bottom: "15%",
          left: "30%",
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Glowing Blob 4 - Gold (for dark mode accent) */}
      <motion.div
        className="absolute w-[350px] h-[350px] rounded-full blur-[70px] opacity-10 dark:opacity-25"
        style={{
          x: x4,
          y: y4,
          background: "radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 215, 0, 0) 70%)",
          top: "70%",
          right: "35%",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 dark:bg-blue-300/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Mesh Gradient Overlay (subtle) */}
      <div 
        className="absolute inset-0 opacity-50 dark:opacity-40"
        style={{
          background: `
            radial-gradient(at 20% 30%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(at 80% 70%, rgba(168, 85, 247, 0.08) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(6, 182, 212, 0.08) 0px, transparent 50%)
          `,
        }}
      />
    </div>
  );
}
