/**
 * SortableLessonList – drag-and-drop lesson reordering for teachers.
 *
 * Uses @dnd-kit/core + @dnd-kit/sortable (already installed).
 * On drag-end, calls POST /api/lessons/reorder with the new ranked order
 * and shows a success / error toast.
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SortableLesson {
  id: string;
  title: string;
  createdAt: string;
  order?: number;
}

interface SortableLessonItemProps {
  lesson: SortableLesson;
  index: number;
  courseId: string;
  onView: (lessonId: string) => void;
}

// ─── Single draggable row ─────────────────────────────────────────────────────

function SortableLessonItem({ lesson, index, courseId, onView }: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 flex items-center justify-between transition-colors select-none ${
        index === 0
          ? 'bg-gold/5 border-l-4 border-l-gold'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      } ${isDragging ? 'shadow-xl rounded-lg bg-white dark:bg-slate-700' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Order badge */}
        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-white shrink-0">
          {index + 1}
        </div>

        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{lesson.title}</p>
          <p className="text-xs text-slate-500">
            Published {new Date(lesson.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onView(lesson.id)}
        className="bg-white dark:bg-navy border-slate-200 dark:border-gray-800 shrink-0"
      >
        View
      </Button>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface SortableLessonListProps {
  initialLessons: SortableLesson[];
  courseId: string;
  onView: (lessonId: string) => void;
}

export function SortableLessonList({ initialLessons, courseId, onView }: SortableLessonListProps) {
  const { toast } = useToast();
  const { getAuthHeaders } = useAuth();
  const [lessons, setLessons] = useState<SortableLesson[]>(initialLessons);
  const [saving, setSaving] = useState(false);

  // Keep local state in sync when parent re-fetches
  React.useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // small deadzone to allow clicks
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persistOrder = useCallback(async (ordered: SortableLesson[]) => {
    setSaving(true);
    try {
      const payload = ordered.map((l, i) => ({ id: l.id, order: i + 1 }));
      const res = await fetch(apiEndpoint('/api/lessons/reorder'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ lessons: payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to save order.' }));
        throw new Error(err.message || 'Failed to save order.');
      }

      toast({ title: 'Order saved', description: 'Lesson order has been updated.' });
    } catch (err: any) {
      toast({
        title: 'Error saving order',
        description: err.message,
        variant: 'destructive',
      });
      // Roll back optimistic update by restoring initialLessons
      setLessons(initialLessons);
    } finally {
      setSaving(false);
    }
  }, [getAuthHeaders, toast, initialLessons]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLessons((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Fire persist after state update
      persistOrder(reordered);
      return reordered;
    });
  };

  if (lessons.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">No lessons yet. Create your first lesson.</div>
    );
  }

  return (
    <div className="relative">
      {saving && (
        <div className="absolute top-2 right-3 flex items-center gap-1 text-xs text-slate-500 z-10">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {lessons.map((lesson, i) => (
            <SortableLessonItem
              key={lesson.id}
              lesson={lesson}
              index={i}
              courseId={courseId}
              onView={onView}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
