import { Variants } from "framer-motion";

// ============================================================
// SPRING CONFIGURATIONS
// ============================================================

export const springConfigs = {
  // Gentle, smooth spring for UI elements
  gentle: {
    type: "spring" as const,
    stiffness: 120,
    damping: 14,
    mass: 0.8,
  },
  // Bouncy spring for playful interactions
  bouncy: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20,
    mass: 1,
  },
  // Stiff spring for quick, snappy responses
  snappy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 0.5,
  },
  // Smooth tween for controlled animations
  smooth: {
    type: "tween" as const,
    duration: 0.4,
    ease: [0.43, 0.13, 0.23, 0.96],
  },
  // Ultra-smooth for large content
  ultraSmooth: {
    type: "tween" as const,
    duration: 0.6,
    ease: [0.25, 0.1, 0.25, 1],
  },
};

// ============================================================
// PAGE TRANSITION VARIANTS
// ============================================================

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springConfigs.gentle,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: springConfigs.smooth,
  },
};

// ============================================================
// CARD VARIANTS
// ============================================================

export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfigs.gentle,
  },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
    transition: springConfigs.snappy,
  },
  tap: {
    scale: 0.98,
    transition: springConfigs.snappy,
  },
};

export const glowCardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springConfigs.gentle,
  },
  hover: {
    y: -12,
    scale: 1.03,
    boxShadow: "0 25px 50px rgba(59, 130, 246, 0.25)",
    filter: "brightness(1.1)",
    transition: springConfigs.bouncy,
  },
  tap: {
    scale: 0.97,
    transition: springConfigs.snappy,
  },
};

// ============================================================
// STAGGERED CONTAINER VARIANTS
// ============================================================

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// ============================================================
// ITEM VARIANTS (for use in stagger containers)
// ============================================================

export const fadeInUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfigs.gentle,
  },
};

export const fadeInVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: springConfigs.smooth,
  },
};

export const scaleInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springConfigs.bouncy,
  },
};

// ============================================================
// BUTTON VARIANTS
// ============================================================

export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: springConfigs.snappy,
  },
  tap: {
    scale: 0.95,
    transition: springConfigs.snappy,
  },
};

export const iconButtonVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: springConfigs.bouncy,
  },
  tap: {
    scale: 0.9,
    rotate: -5,
    transition: springConfigs.snappy,
  },
};

// ============================================================
// SIDEBAR VARIANTS
// ============================================================

export const sidebarVariants: Variants = {
  initial: {
    x: -280,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      ...springConfigs.gentle,
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
  exit: {
    x: -280,
    opacity: 0,
    transition: springConfigs.smooth,
  },
};

export const navItemVariants: Variants = {
  initial: {
    x: -20,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: springConfigs.gentle,
  },
  hover: {
    x: 4,
    transition: springConfigs.snappy,
  },
};

// ============================================================
// MODAL/DIALOG VARIANTS
// ============================================================

export const modalOverlayVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: springConfigs.smooth,
  },
  exit: {
    opacity: 0,
    transition: springConfigs.smooth,
  },
};

export const modalContentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 50,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfigs.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 50,
    transition: springConfigs.smooth,
  },
};

// ============================================================
// PROGRESS BAR VARIANTS
// ============================================================

export const progressBarVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: (value: number) => ({
    scaleX: value / 100,
    transition: {
      ...springConfigs.gentle,
      delay: 0.3,
      duration: 1.2,
    },
  }),
};

// ============================================================
// PULSING INDICATOR VARIANTS
// ============================================================

export const pulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.6, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export const dotPulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 0.5,
  },
  animate: {
    scale: [1, 1.5, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ============================================================
// LIST ITEM VARIANTS
// ============================================================

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springConfigs.gentle,
  },
  hover: {
    x: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    transition: springConfigs.snappy,
  },
};

// ============================================================
// TAB VARIANTS
// ============================================================

export const tabVariants: Variants = {
  initial: {
    opacity: 0.6,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springConfigs.snappy,
  },
  hover: {
    opacity: 1,
    scale: 1.05,
    transition: springConfigs.snappy,
  },
};

// ============================================================
// SLIDE VARIANTS
// ============================================================

export const slideInFromLeft: Variants = {
  initial: {
    x: -100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: springConfigs.gentle,
  },
  exit: {
    x: -100,
    opacity: 0,
    transition: springConfigs.smooth,
  },
};

export const slideInFromRight: Variants = {
  initial: {
    x: 100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: springConfigs.gentle,
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: springConfigs.smooth,
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generate stagger delay for child elements
 */
export const getStaggerDelay = (index: number, baseDelay: number = 0.05) => {
  return index * baseDelay;
};

/**
 * Create custom transition with spring physics
 */
export const createSpringTransition = (
  stiffness: number = 120,
  damping: number = 14,
  mass: number = 0.8
) => ({
  type: "spring" as const,
  stiffness,
  damping,
  mass,
});

/**
 * Generate glow effect styles
 */
export const generateGlowEffect = (color: string = "59, 130, 246") => ({
  boxShadow: `0 0 20px rgba(${color}, 0.3), 0 0 40px rgba(${color}, 0.2)`,
});
