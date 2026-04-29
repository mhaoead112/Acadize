import { useState } from 'react';
import { useQuestTemplates, useUpdateQuestTemplate } from '@/hooks/useAdminGamification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Edit2, Save, X, RotateCcw } from 'lucide-react';

export default function QuestTemplateEditor() {
  const { data: templates, isLoading } = useQuestTemplates();
  const updateMutation = useUpdateQuestTemplate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const startEditing = (template: any) => {
    setEditingId(template.id);
    setEditForm({ ...template });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = () => {
    if (!editingId || !editForm) return;
    updateMutation.mutate({
      id: editingId,
      payload: {
        title: editForm.title,
        description: editForm.description,
        xpReward: Number(editForm.xpReward),
        conditionValue: Number(editForm.conditionValue),
        isActive: editForm.isActive,
      }
    }, {
      onSuccess: () => {
        setEditingId(null);
        setEditForm(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Quest Templates</CardTitle>
        <CardDescription>
          Configure active daily and weekly quests for your students.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quest</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Goal</TableHead>
              <TableHead>Reward (XP)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates?.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  {editingId === template.id ? (
                    <div className="space-y-2">
                      <Input 
                        value={editForm.title} 
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="h-8 font-medium"
                      />
                      <Input 
                        value={editForm.description} 
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="h-8 text-xs text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{template.title}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {template.questType}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingId === template.id ? (
                    <Input 
                      type="number"
                      value={editForm.conditionValue} 
                      onChange={(e) => setEditForm({ ...editForm, conditionValue: e.target.value })}
                      className="h-8 w-20"
                    />
                  ) : (
                    <span className="text-sm">
                      {template.conditionValue} {template.conditionType.replace('_', ' ')}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === template.id ? (
                    <Input 
                      type="number"
                      value={editForm.xpReward} 
                      onChange={(e) => setEditForm({ ...editForm, xpReward: e.target.value })}
                      className="h-8 w-20"
                    />
                  ) : (
                    <span className="font-bold text-primary">{template.xpReward} XP</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === template.id ? (
                    <Switch 
                      checked={editForm.isActive} 
                      onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                    />
                  ) : (
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === template.id ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEditing(template)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
