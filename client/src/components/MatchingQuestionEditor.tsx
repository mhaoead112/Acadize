import React, { useState } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface MatchingQuestionEditorProps {
  pairs: MatchingPair[];
  onChange: (pairs: MatchingPair[]) => void;
}

function SortablePair({ 
  pair, 
  index, 
  onUpdate, 
  onDelete 
}: { 
  pair: MatchingPair; 
  index: number; 
  onUpdate: (id: string, field: 'left' | 'right', value: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pair.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-slate-50 dark:bg-navy-dark p-3 transition-all ${
        isDragging ? 'border-primary shadow-lg' : 'border-slate-200 dark:border-navy-border'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white touch-none"
        title="Drag to reorder"
      >
        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
      </button>
      
      <span className="font-mono text-sm font-bold w-6 text-slate-500 dark:text-slate-400">
        {index + 1}.
      </span>

      <input
        type="text"
        value={pair.left}
        onChange={(e) => onUpdate(pair.id, 'left', e.target.value)}
        className="flex-1 bg-white dark:bg-navy-card border border-slate-200 dark:border-navy-border rounded-lg p-2 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Left item"
      />

      <span className="text-primary font-bold text-lg">⟷</span>

      <input
        type="text"
        value={pair.right}
        onChange={(e) => onUpdate(pair.id, 'right', e.target.value)}
        className="flex-1 bg-white dark:bg-navy-card border border-slate-200 dark:border-navy-border rounded-lg p-2 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Right item"
      />

      <button
        onClick={() => onDelete(pair.id)}
        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        title="Delete pair"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  );
}

export default function MatchingQuestionEditor({ pairs, onChange }: MatchingQuestionEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pairs.findIndex((p) => p.id === active.id);
      const newIndex = pairs.findIndex((p) => p.id === over.id);
      onChange(arrayMove(pairs, oldIndex, newIndex));
    }
  };

  const handleUpdate = (id: string, field: 'left' | 'right', value: string) => {
    onChange(pairs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string) => {
    onChange(pairs.filter(p => p.id !== id));
  };

  const handleAdd = () => {
    const newPair: MatchingPair = {
      id: `pair_${Date.now()}`,
      left: '',
      right: ''
    };
    onChange([...pairs, newPair]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create matching pairs. Students will match items from the left column to the right column.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pairs.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {pairs.map((pair, index) => (
              <SortablePair
                key={pair.id}
                pair={pair}
                index={index}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {pairs.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-border rounded-xl">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">link</span>
          <p className="text-sm">No matching pairs yet. Click below to add your first pair.</p>
        </div>
      )}

      <button
        onClick={handleAdd}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-navy-border p-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Matching Pair
      </button>
    </div>
  );
}
