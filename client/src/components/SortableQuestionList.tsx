import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
}

interface SortableQuestionListProps {
  questions: Question[];
  activeQuestionId: string | null;
  onReorder: (questions: Question[]) => void;
  onSelect: (id: string) => void;
  typeToLabel: Record<string, string>;
}

function SortableQuestionItem({
  question,
  isActive,
  onSelect,
  typeToLabel,
  isDragging,
}: {
  question: Question;
  isActive: boolean;
  onSelect: (id: string) => void;
  typeToLabel: Record<string, string>;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(question.id)}
      className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-all ${
        isActive
          ? 'border-primary bg-white dark:bg-navy-card shadow-md'
          : 'border-transparent bg-slate-50 dark:bg-navy-card/50 hover:bg-white dark:hover:bg-navy-card hover:border-slate-200 dark:hover:border-navy-border'
      }`}
    >
      {isActive && <div className="absolute -left-[1px] top-0 bottom-0 w-1 rounded-l-xl bg-primary"></div>}
      <div className="flex justify-between items-start">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${
            isActive ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-navy-border text-slate-600 dark:text-slate-400'
          }`}
        >
          {typeToLabel[question.type]?.split(' ')[0] || 'Q'} • {question.points}pts
        </span>
        <div
          {...attributes}
          {...listeners}
          className={`flex gap-1 transition-opacity cursor-grab active:cursor-grabbing touch-none ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title="Drag to reorder"
        >
          <button className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white">
            <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
          </button>
        </div>
      </div>
      <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
        {question.text || 'New Question...'}
      </p>
    </div>
  );
}

export default function SortableQuestionList({
  questions,
  activeQuestionId,
  onReorder,
  onSelect,
  typeToLabel,
}: SortableQuestionListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      onReorder(arrayMove(questions, oldIndex, newIndex));
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeQuestion = activeId ? questions.find((q) => q.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-2">
          {questions.map((q) => (
            <SortableQuestionItem
              key={q.id}
              question={q}
              isActive={q.id === activeQuestionId}
              onSelect={onSelect}
              typeToLabel={typeToLabel}
              isDragging={q.id === activeId}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeQuestion ? (
          <div className="border-primary bg-white dark:bg-navy-card shadow-2xl border p-4 rounded-xl opacity-90">
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary">
              {typeToLabel[activeQuestion.type]?.split(' ')[0] || 'Q'} • {activeQuestion.points}pts
            </span>
            <p className="text-sm font-medium text-slate-900 dark:text-white mt-2 line-clamp-2">
              {activeQuestion.text || 'New Question...'}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
