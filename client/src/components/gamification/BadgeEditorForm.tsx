import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GamificationBadge, GamificationCriteriaType } from '@shared/gamification.types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const badgeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(300, 'Max 300 characters').optional().default(''),
  emoji: z.string().min(1, 'Emoji is required').max(5, 'Too long (emojis only)').regex(/\p{Emoji}/u, 'Must contain an emoji'),
  criteriaType: z.enum([
    'lesson_count',
    'course_completion',
    'exam_score',
    'assignment_count',
    'streak',
    'level_reached',
    'first_action',
  ]),
  criteriaValue: z.number().int().min(1, 'Must be at least 1'),
  courseId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type BadgeFormValues = z.infer<typeof badgeSchema>;

interface BadgeEditorFormProps {
  badge?: GamificationBadge;
  onSave: (badge: Partial<GamificationBadge>) => void;
  onCancel: () => void;
  isSaving: boolean;
  courses: { id: string; title: string }[];
}

export default function BadgeEditorForm({
  badge,
  onSave,
  onCancel,
  isSaving,
  courses,
}: BadgeEditorFormProps) {
  const isEditMode = !!badge;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<BadgeFormValues>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: badge?.name || '',
      description: badge?.description || '',
      emoji: badge?.emoji || '🎖️',
      criteriaType: badge?.criteriaType || 'lesson_count',
      criteriaValue: badge?.criteriaValue || 1,
      courseId: badge?.courseId || '',
      isActive: badge?.isActive ?? true,
    },
  });

  const previewName = watch('name') || 'New Badge';
  const previewDesc = watch('description') || 'A short description of how to earn this badge.';
  const previewEmoji = watch('emoji') || '🎖️';
  const previewIsActive = watch('isActive');
  const criteriaType = watch('criteriaType');

  const getCriteriaValueLabel = () => {
    switch (criteriaType) {
      case 'lesson_count':
        return 'Number of lessons';
      case 'course_completion':
        return 'Course Count (1)';
      case 'exam_score':
        return 'Minimum Exam Score (%)';
      case 'assignment_count':
        return 'Number of Assignments';
      case 'streak':
        return 'Days in Streak';
      case 'level_reached':
        return 'Level Number';
      case 'first_action':
        return 'Action Count (1)';
      default:
        return 'Criteria Value';
    }
  };

  const onSubmit = (data: BadgeFormValues) => {
    onSave({
      ...data,
      courseId: data.courseId || null,
      emoji: data.emoji || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Badge Name <span className="text-destructive">*</span></label>
          <Input placeholder="e.g., Fast Learner" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea 
            placeholder="Describe how to earn this badge..." 
            className="resize-none h-24"
            {...register('description')} 
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Emoji <span className="text-destructive">*</span></label>
            <Input className="text-xl h-12" placeholder="🔥" {...register('emoji')} />
            {errors.emoji && <p className="text-xs text-destructive">{errors.emoji.message}</p>}
          </div>
          <div className="flex flex-col justify-end pb-2">
            <div className="h-12 w-12 rounded-full border bg-secondary/50 flex items-center justify-center text-2xl">
              {previewEmoji}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Criteria Type <span className="text-destructive">*</span></label>
            <select
              {...register('criteriaType')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="lesson_count">Lesson Count</option>
              <option value="course_completion">Course Completion</option>
              <option value="exam_score">Exam Score</option>
              <option value="assignment_count">Assignment Count</option>
              <option value="streak">Streak</option>
              <option value="level_reached">Level Reached</option>
              <option value="first_action">First Action</option>
            </select>
            {errors.criteriaType && <p className="text-xs text-destructive">{errors.criteriaType.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{getCriteriaValueLabel()} <span className="text-destructive">*</span></label>
            <Input 
              type="number" 
              {...register('criteriaValue', { valueAsNumber: true })} 
              min={1}
            />
            {errors.criteriaValue && <p className="text-xs text-destructive">{errors.criteriaValue.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Limit to course (optional)</label>
          <select
            {...register('courseId')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">-- All Courses (Global) --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Active Status</label>
            <p className="text-xs text-muted-foreground">
              Inactive badges cannot be earned.
            </p>
          </div>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Badge')}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="flex flex-col">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Live Preview</h3>
        <Card
          className={cn(
            'group relative flex flex-col items-center justify-center p-6 text-center transition-all duration-300 mx-auto w-full max-w-sm',
            'bg-card dark:bg-[#112240] dark:border-white/10 overflow-hidden',
            !previewIsActive && 'opacity-70 grayscale'
          )}
        >
          {/* Icon Container */}
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-secondary/30">
            <div className="text-6xl transition-transform duration-300 group-hover:scale-110">
              {previewEmoji}
            </div>
            
            {/* Mock Earned Indicator overlay */}
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-emerald-500">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Badge Info */}
          <h4 className="mb-2 text-lg font-bold tracking-tight">
            {previewName}
          </h4>
          <p className="text-sm text-muted-foreground">
            {previewDesc}
          </p>
          
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            {previewIsActive ? 'Preview (Active)' : 'Preview (Inactive)'}
          </div>
        </Card>
        
        <div className="mt-4 text-center text-xs text-muted-foreground max-w-sm mx-auto">
          This is how the badge will appear to users in their gamification hub and profiles when earned.
        </div>
      </div>
    </form>
  );
}
