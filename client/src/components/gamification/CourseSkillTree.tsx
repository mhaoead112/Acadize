/**
 * CourseSkillTree.tsx — Sprint C: Visual Mastery
 *
 * Interactive course map rendered on an SVG canvas.
 * - Completed nodes glow with an animated ring
 * - Active (unlocked) nodes pulse to invite interaction
 * - Locked nodes show a chain icon and are visually muted
 * - Animated SVG paths connect every node to its prerequisite
 * - Smooth pan & hover interactions via Framer Motion
 *
 * Psychology: Visualises the exact path to mastery, eliminating
 * "choice paralysis" by showing exactly what to do next.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, PlayCircle, BookOpen, FileText, Film, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { springConfigs } from "@/lib/animations";
import { apiEndpoint } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";

// ─────────────────────────────────────────────────────────────
// Types (mirror skill-tree.service.ts)
// ─────────────────────────────────────────────────────────────

type NodeStatus = "completed" | "active" | "locked";

interface SkillTreeNodeDto {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonFileType: string | null;
  prereqNodeId: string | null;
  position: number;
  sectionLabel: string | null;
  posX: number;
  posY: number;
  status: NodeStatus;
}

interface SkillTreeDto {
  courseId: string;
  nodes: SkillTreeNodeDto[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

interface CourseSkillTreeProps {
  courseId: string;
  onLessonClick?: (lessonId: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const NODE_W = 180;
const NODE_H = 72;
const CANVAS_PADDING = 60;
const SECTION_LABEL_HEIGHT = 36;

// ─────────────────────────────────────────────────────────────
// Status styling
// ─────────────────────────────────────────────────────────────

const statusStyles: Record<NodeStatus, {
  bg: string;
  border: string;
  text: string;
  icon: typeof CheckCircle2;
  glow: string;
  connectorStroke: string;
}> = {
  completed: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-400 dark:border-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
    glow: "0 0 0 3px rgba(52,211,153,0.25), 0 0 20px rgba(52,211,153,0.15)",
    connectorStroke: "#34d399",
  },
  active: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400 dark:border-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    icon: PlayCircle,
    glow: "0 0 0 3px rgba(96,165,250,0.25), 0 0 20px rgba(96,165,250,0.15)",
    connectorStroke: "#60a5fa",
  },
  locked: {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-400 dark:text-slate-500",
    icon: Lock,
    glow: "none",
    connectorStroke: "#475569",
  },
};

// ─────────────────────────────────────────────────────────────
// Helper — file type → icon
// ─────────────────────────────────────────────────────────────

function lessonIcon(fileType: string | null) {
  if (!fileType) return BookOpen;
  const t = fileType.toLowerCase();
  if (t.includes("video") || t.includes("mp4")) return Film;
  if (t.includes("pdf")) return FileText;
  return BookOpen;
}

// ─────────────────────────────────────────────────────────────
// SVG Edge between two nodes
// ─────────────────────────────────────────────────────────────

interface EdgeProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  status: NodeStatus;
  index: number;
}

function SkillEdge({ fromX, fromY, toX, toY, status, index }: EdgeProps) {
  const style = statusStyles[status];
  // Bezier control points — smooth S-curve
  const midY = (fromY + toY) / 2;
  const d = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
  const isDone = status === "completed";

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={style.connectorStroke}
      strokeWidth={isDone ? 3 : 2}
      strokeDasharray={status === "locked" ? "6 4" : "none"}
      strokeLinecap="round"
      opacity={status === "locked" ? 0.35 : 0.75}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: status === "locked" ? 0.35 : 0.75 }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Single Node
// ─────────────────────────────────────────────────────────────

interface SkillNodeProps {
  node: SkillTreeNodeDto;
  index: number;
  selected: boolean;
  onClick: () => void;
}

function SkillNode({ node, index, selected, onClick }: SkillNodeProps) {
  const style = statusStyles[node.status];
  const StatusIcon = style.icon;
  const LessonIcon = lessonIcon(node.lessonFileType);
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";

  return (
    <motion.div
      style={{ position: "absolute", left: node.posX, top: node.posY, width: NODE_W }}
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...springConfigs.bouncy, delay: index * 0.04 }}
    >
      <motion.button
        onClick={isLocked ? undefined : onClick}
        className={cn(
          "relative w-full rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200",
          style.bg, style.border,
          isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          selected && "ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-slate-900"
        )}
        style={{ boxShadow: selected ? style.glow : undefined }}
        whileHover={isLocked ? undefined : { scale: 1.04, boxShadow: style.glow }}
        whileTap={isLocked ? undefined : { scale: 0.97 }}
        transition={springConfigs.snappy}
        aria-disabled={isLocked}
      >
        {/* Completed glow ring */}
        {isCompleted && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400"
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Active pulse dot */}
        {node.status === "active" && (
          <motion.span
            className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-blue-400"
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="flex items-start gap-3">
          {/* Lesson type icon */}
          <div className={cn(
            "mt-0.5 flex-shrink-0 rounded-lg p-1.5",
            isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30" :
            node.status === "active" ? "bg-blue-100 dark:bg-blue-900/30" :
            "bg-slate-200 dark:bg-slate-700/50"
          )}>
            <LessonIcon className={cn("h-4 w-4", style.text)} />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className={cn("line-clamp-2 text-xs font-semibold leading-snug", style.text)}>
              {node.lessonTitle}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              Lesson {node.position + 1}
            </p>
          </div>

          {/* Status icon */}
          <StatusIcon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", style.text)} />
        </div>
      </motion.button>

      {/* Section label appears above node when present */}
      {node.sectionLabel && (
        <div className="absolute -top-8 left-0 right-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-100">
            <Zap className="h-2.5 w-2.5 text-amber-400" />
            {node.sectionLabel}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function CourseSkillTree({ courseId, onLessonClick }: CourseSkillTreeProps) {
  const { token } = useAuth();
  const [tree, setTree] = useState<SkillTreeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch tree data
  useEffect(() => {
    if (!courseId || !token) return;
    setLoading(true);
    setError(null);

    fetch(apiEndpoint(`/api/skill-tree/${courseId}`), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: SkillTreeDto) => setTree(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId, token]);

  // Canvas dimensions — derived from node positions
  const { canvasW, canvasH } = useMemo(() => {
    if (!tree?.nodes.length) return { canvasW: 900, canvasH: 400 };
    const maxX = Math.max(...tree.nodes.map((n) => n.posX)) + NODE_W + CANVAS_PADDING;
    const maxY = Math.max(...tree.nodes.map((n) => n.posY)) + NODE_H + CANVAS_PADDING + SECTION_LABEL_HEIGHT;
    return { canvasW: Math.max(maxX, 900), canvasH: Math.max(maxY, 400) };
  }, [tree]);

  // Build a node-id → node map for edge lookup
  const nodeMap = useMemo(
    () => new Map(tree?.nodes.map((n) => [n.id, n]) ?? []),
    [tree]
  );

  // Edges: pairs of (from, to) for each node with a prereq
  const edges = useMemo(() => {
    if (!tree) return [];
    return tree.nodes
      .filter((n) => n.prereqNodeId && nodeMap.has(n.prereqNodeId))
      .map((n) => {
        const from = nodeMap.get(n.prereqNodeId!)!;
        return { from, to: n };
      });
  }, [tree, nodeMap]);

  // Handle node click
  const handleNodeClick = (node: SkillTreeNodeDto) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    if (node.status !== "locked" && onLessonClick) {
      onLessonClick(node.lessonId);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Building your skill map…</p>
        </div>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {error ? `Failed to load skill map: ${error}` : "No skill tree data."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header stats */}
      <motion.div
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1b3e]"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Mastery Progress
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {tree.completedCount} / {tree.totalCount} lessons
            </span>
          </div>
          <Progress
            value={tree.progressPercent}
            className="h-2.5 bg-slate-100 dark:bg-slate-800"
            indicatorClassName="bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-700"
          />
        </div>

        <div className="flex gap-3">
          {(["completed", "active", "locked"] as NodeStatus[]).map((s) => {
            const count = tree.nodes.filter((n) => n.status === s).length;
            const style = statusStyles[s];
            const Icon = style.icon;
            return (
              <Badge
                key={s}
                variant="outline"
                className={cn("gap-1.5 capitalize", style.border, style.text)}
              >
                <Icon className="h-3 w-3" />
                {count} {s}
              </Badge>
            );
          })}
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-emerald-400 bg-emerald-100" />
          Completed — click to revisit
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-400 bg-blue-100" />
          Active — ready to learn
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400 bg-slate-200" />
          Locked — complete previous lesson
        </span>
      </div>

      {/* Canvas */}
      <motion.div
        ref={containerRef}
        className="relative overflow-auto rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:border-slate-800 dark:from-[#091428] dark:to-[#0a192f]"
        style={{ minHeight: 420, maxHeight: 700 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Subtle dot-grid background */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" className="text-slate-400 dark:text-slate-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div
          style={{
            position: "relative",
            width: canvasW,
            height: canvasH,
            minWidth: "100%",
          }}
        >
          {/* SVG edges layer */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasW}
            height={canvasH}
            overflow="visible"
          >
            {edges.map((edge, i) => {
              // Edge connects bottom-center of 'from' to top-center of 'to'
              const fromX = edge.from.posX + NODE_W / 2;
              const fromY = edge.from.posY + NODE_H;
              const toX = edge.to.posX + NODE_W / 2;
              const toY = edge.to.posY;
              return (
                <SkillEdge
                  key={`${edge.from.id}-${edge.to.id}`}
                  fromX={fromX}
                  fromY={fromY}
                  toX={toX}
                  toY={toY}
                  status={edge.to.status}
                  index={i}
                />
              );
            })}
          </svg>

          {/* Nodes layer */}
          {tree.nodes.map((node, i) => (
            <SkillNode
              key={node.id}
              node={node}
              index={i}
              selected={selectedNodeId === node.id}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </div>
      </motion.div>

      {/* Selected node detail tooltip */}
      <AnimatePresence>
        {selectedNodeId && (() => {
          const node = nodeMap.get(selectedNodeId);
          if (!node) return null;
          const style = statusStyles[node.status];
          const StatusIcon = style.icon;
          return (
            <motion.div
              key={selectedNodeId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={springConfigs.gentle}
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 p-4",
                style.bg, style.border
              )}
            >
              <StatusIcon className={cn("h-6 w-6 flex-shrink-0", style.text)} />
              <div className="flex-1">
                <p className={cn("font-bold", style.text)}>{node.lessonTitle}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {node.status === "completed"
                    ? "✅ You've mastered this lesson!"
                    : node.status === "active"
                    ? "🎯 This lesson is ready for you. Click to start!"
                    : "🔒 Complete the previous lesson to unlock this one."}
                </p>
              </div>
              {node.status !== "locked" && onLessonClick && (
                <button
                  onClick={() => onLessonClick(node.lessonId)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-[#FFD700] dark:text-slate-900 dark:hover:bg-yellow-400"
                >
                  {node.status === "completed" ? "Revisit" : "Start →"}
                </button>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
