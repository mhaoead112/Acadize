import { useState, useEffect, useMemo } from 'react';
import { GamificationPointRule, GamificationEventType } from '@shared/gamification.types';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RuleEditorTableProps {
  rules: GamificationPointRule[];
  onSave: (rules: GamificationPointRule[]) => void;
  isSaving: boolean;
}

const EVENT_TYPE_LABELS: Record<GamificationEventType, string> = {
  lesson_completion: 'Lesson Completion',
  quiz_completion: 'Quiz Completion',
  exam_completion: 'Exam Completion',
  assignment_submission: 'Assignment Submission',
  assignment_graded_pass: 'Assignment: Passing Grade',
  course_completion: 'Course Completion',
};

const DEFAULT_POINTS: Record<GamificationEventType, number> = {
  lesson_completion: 10,
  quiz_completion: 25,
  exam_completion: 50,
  assignment_submission: 15,
  assignment_graded_pass: 20,
  course_completion: 100,
};

export default function RuleEditorTable({ rules, onSave, isSaving }: RuleEditorTableProps) {
  const [editedRules, setEditedRules] = useState<GamificationPointRule[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Deep copy to avoid mutating original props directly
    setEditedRules(JSON.parse(JSON.stringify(rules)));
  }, [rules]);

  const hasUnsavedChanges = useMemo(() => {
    if (!rules.length || !editedRules.length) return false;
    return editedRules.some((editedRule) => {
      const original = rules.find((r) => r.id === editedRule.id);
      if (!original) return true;
      return original.points !== editedRule.points || original.isActive !== editedRule.isActive;
    });
  }, [rules, editedRules]);

  const hasHighValues = useMemo(() => {
    return editedRules.some((r) => r.points > 500 && r.isActive);
  }, [editedRules]);

  const validatePoints = (value: string): string | null => {
    const num = Number(value);
    if (!value || isNaN(num)) return 'Must be a number';
    if (!Number.isInteger(num)) return 'Must be an integer';
    if (num < 0 || num > 10000) return 'Must be between 0 and 10000';
    return null;
  };

  const handlePointChange = (ruleId: string, value: string) => {
    const error = validatePoints(value);
    
    setErrors((prev) => ({
      ...prev,
      [ruleId]: error || '',
    }));

    setEditedRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, points: Number(value) || 0 } : r))
    );
  };

  const handleActiveToggle = (ruleId: string, checked: boolean) => {
    setEditedRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: checked } : r))
    );
  };

  const handleResetToDefaults = () => {
    setEditedRules((prev) =>
      prev.map((r) => ({
        ...r,
        points: DEFAULT_POINTS[r.eventType] ?? r.points,
        isActive: true,
      }))
    );
    setErrors({});
  };

  const handleSave = () => {
    // Prevent save if there are validation errors
    if (Object.values(errors).some((e) => e !== '')) return;
    onSave(editedRules);
  };

  const getImpactLabel = (points: number) => {
    if (points === 0) return { label: 'None', color: 'bg-muted text-muted-foreground' };
    if (points <= 20) return { label: 'Low', color: 'bg-blue-500/10 text-blue-500' };
    if (points <= 100) return { label: 'Medium', color: 'bg-green-500/10 text-green-500' };
    if (points <= 500) return { label: 'High', color: 'bg-orange-500/10 text-orange-500' };
    return { label: 'Extreme', color: 'bg-red-500/10 text-red-500' };
  };

  const isValid = Object.values(errors).every((e) => e === '');

  return (
    <div className="space-y-6">
      {hasUnsavedChanges && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">Unsaved changes</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You have modified rules that haven't been saved yet.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditedRules(JSON.parse(JSON.stringify(rules)))} disabled={isSaving}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !isValid}>
                {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasHighValues && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            High point values (> 500) may encourage behavior farming and unbalance the gamification system.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Type</TableHead>
              <TableHead className="w-[150px]">Points</TableHead>
              <TableHead className="text-center w-[100px]">Active</TableHead>
              <TableHead className="text-right w-[150px]">Impact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editedRules.map((rule) => {
              const impact = getImpactLabel(rule.points);
              return (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {EVENT_TYPE_LABELS[rule.eventType] || rule.eventType}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        min="0"
                        max="10000"
                        value={rule.points}
                        onChange={(e) => handlePointChange(rule.id, e.target.value)}
                        className={errors[rule.id] ? 'border-destructive focus-visible:ring-destructive' : ''}
                        disabled={!rule.isActive || isSaving}
                      />
                      {errors[rule.id] && (
                        <p className="text-xs text-destructive">{errors[rule.id]}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(c) => handleActiveToggle(rule.id, c)}
                      disabled={isSaving}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={`border-transparent ${impact.color} ${!rule.isActive && 'opacity-50 grayscale'}`}>
                      {impact.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {editedRules.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No gamification rules found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={handleResetToDefaults} disabled={isSaving}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
