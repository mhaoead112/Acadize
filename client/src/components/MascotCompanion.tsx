import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// MASCOT STATE REGISTRY — swap src paths when new PNGs are ready
// ─────────────────────────────────────────────────────────────────────────────
export type MascotState = "idle" | "thinking" | "happy" | "wave";

interface StateConfig { src: string; alt: string; }

const MASCOT_STATES: Record<MascotState, StateConfig> = {
  idle:     { src: "/images/mascot.png", alt: "Aiden idle"     },
  thinking: { src: "/images/mascot.png", alt: "Aiden thinking" },
  happy:    { src: "/images/mascot.png", alt: "Aiden happy"    },
  wave:     { src: "/images/mascot.png", alt: "Aiden waving"   },
};

const stateAnimations: Record<MascotState, object> = {
  idle:     { y: [0, -6, 0], rotate: [0, 1.5, -1.5, 0],
              transition: { y: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
  thinking: { rotate: [-4, 4, -4], scale: [1, 0.96, 1],
              transition: { rotate: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } } },
  happy:    { scale: [1, 1.15, 0.95, 1.08, 1], rotate: [0, -8, 8, -4, 0],
              transition: { duration: 0.7, ease: "easeOut" } },
  wave:     { rotate: [0, -15, 10, -15, 10, 0],
              transition: { duration: 1.2, ease: "easeInOut" } },
};

// ─────────────────────────────────────────────────────────────────────────────
// EYE GEOMETRY  (% of SVG viewBox 0–100)
// ─────────────────────────────────────────────────────────────────────────────
const EYES = [
  { cx: 33, cy: 36, rx: 10, ry: 9 },   // left eye
  { cx: 63, cy: 36, rx: 10, ry: 9 },   // right eye
];
const EYELID_FILL = "#1a237e";

// ─────────────────────────────────────────────────────────────────────────────
// Blink scheduler — random interval, faster when "thinking"
// ─────────────────────────────────────────────────────────────────────────────
function useBlinkScheduler(state: MascotState) {
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 120);
      const isThinking = state === "thinking";
      const delay = isThinking
        ? 900  + Math.random() * 900
        : 2500 + Math.random() * 2500;
      t = setTimeout(blink, delay);
    };
    t = setTimeout(blink, 800 + Math.random() * 1200);
    return () => clearTimeout(t);
  }, [state]);
  return isBlinking;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyelid overlay (blink only)
// ─────────────────────────────────────────────────────────────────────────────
function BlinkOverlay({ isBlinking }: { isBlinking: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {EYES.map((eye, i) => (
        <motion.ellipse
          key={i}
          cx={eye.cx}
          cy={eye.cy}
          rx={eye.rx}
          ry={eye.ry}
          fill={EYELID_FILL}
          animate={{ scaleY: isBlinking ? 1 : 0, opacity: isBlinking ? 1 : 0 }}
          transition={
            isBlinking
              ? { duration: 0.055, ease: "easeIn"  }
              : { duration: 0.10,  ease: "easeOut" }
          }
          style={{ transformOrigin: `${eye.cx}% ${eye.cy}%` }}
        />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MascotCompanion — main export
// ─────────────────────────────────────────────────────────────────────────────
interface MascotCompanionProps {
  state?: MascotState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function MascotCompanion({
  state = "idle",
  size = 48,
  className = "",
  onClick,
}: MascotCompanionProps) {
  const config     = MASCOT_STATES[state];
  const anim       = stateAnimations[state];
  const isBlinking = useBlinkScheduler(state);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        className={`relative flex-shrink-0 cursor-default select-none ${className}`}
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1, ...(anim as object) }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25 }}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <img
          src={config.src}
          alt={config.alt}
          className="w-full h-full object-contain"
          draggable={false}
        />

        <BlinkOverlay isBlinking={isBlinking} />

        {/* Thinking dots */}
        {state === "thinking" && (
          <motion.div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span key={i}
                className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500"
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useMascotState hook
// ─────────────────────────────────────────────────────────────────────────────
export function useMascotState(defaultState: MascotState = "idle") {
  const [state, setState] = useState<MascotState>(defaultState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerState = (next: MascotState, returnAfterMs?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(next);
    if (returnAfterMs !== undefined)
      timerRef.current = setTimeout(() => setState("idle"), returnAfterMs);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return [state, triggerState] as const;
}
