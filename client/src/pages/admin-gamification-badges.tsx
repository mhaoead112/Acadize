import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { useAdminBadges, useCreateBadge, useUpdateBadge } from '@/hooks/useAdminGamification';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoint } from '@/lib/config';
import { Shield, Plus, Archive, Edit, ArchiveRestore, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GamificationBadge } from '@shared/gamification.types';

// Courses fetcher
function useAdminCourses() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const res = await fetch(apiEndpoint('/api/admin/courses'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      return data.courses || [];
    },
    enabled: !!token
  });
}

export default function AdminGamificationBadges() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: badges, isLoading } = useAdminBadges(includeArchived);
  const createBadgeMutation = useCreateBadge();
  const updateBadgeMutation = useUpdateBadge();
  const { data: courses } = useAdminCourses();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<GamificationBadge | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [badgeToArchive, setBadgeToArchive] = useState<GamificationBadge | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emoji: '🏆',
    criteriaType: 'completion',
    criteriaValue: 1,
    courseId: 'global',
  });

  const openCreateSheet = () => {
    setEditingBadge(null);
    setFormData({
      name: '',
      description: '',
      emoji: '🏆',
      criteriaType: 'completion',
      criteriaValue: 1,
      courseId: 'global',
    });
    setIsSheetOpen(true);
  };

  const openEditSheet = (badge: GamificationBadge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description || '',
      emoji: badge.emoji || '🏆',
      criteriaType: badge.criteriaType,
      criteriaValue: badge.criteriaValue,
      courseId: badge.courseId || 'global',
    });
    setIsSheetOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: formData.name,
      description: formData.description,
      emoji: formData.emoji,
      criteriaType: formData.criteriaType as GamificationBadge['criteriaType'],
      criteriaValue: Number(formData.criteriaValue),
      courseId: formData.courseId === 'global' ? null : formData.courseId,
    };

    if (editingBadge) {
      updateBadgeMutation.mutate({ id: editingBadge.id, payload }, {
        onSuccess: () => setIsSheetOpen(false)
      });
    } else {
      createBadgeMutation.mutate(payload, {
        onSuccess: () => setIsSheetOpen(false)
      });
    }
  };

  const confirmArchive = () => {
    if (!badgeToArchive) return;
    updateBadgeMutation.mutate({
      id: badgeToArchive.id,
      payload: { archived: !badgeToArchive.archivedAt }
    }, {
      onSuccess: () => {
        setArchiveDialogOpen(false);
        setBadgeToArchive(null);
      }
    });
  };

  const activeBadges = badges?.filter(b => !b.archivedAt) || [];
  const archivedBadges = badges?.filter(b => !!b.archivedAt) || [];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Badges
              <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">
                {badges?.length || 0} Total
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage badges awarded to students for achievements.
            </p>
          </div>
          
          <Button onClick={openCreateSheet} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Badge
          </Button>
        </div>

        {/* Tabs and Grid */}
        <Tabs defaultValue="active" onValueChange={(val) => setIncludeArchived(val === 'archived')}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({activeBadges.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedBadges.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : activeBadges.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No active badges</p>
                <p className="text-sm mt-1">Click "Create Badge" to add one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeBadges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} onEdit={() => openEditSheet(badge)} onArchive={() => {
                    setBadgeToArchive(badge);
                    setArchiveDialogOpen(true);
                  }} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1,2].map(i => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : archivedBadges.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No archived badges</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {archivedBadges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} onEdit={() => openEditSheet(badge)} onArchive={() => {
                    setBadgeToArchive(badge);
                    setArchiveDialogOpen(true);
                  }} isArchived />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Editor Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="overflow-y-auto sm:max-w-lg">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingBadge ? 'Edit Badge' : 'Create New Badge'}</SheetTitle>
              <SheetDescription>
                Design a badge and define the criteria required to earn it.
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input 
                    className="w-16 text-center text-2xl" 
                    value={formData.emoji} 
                    onChange={e => setFormData({...formData, emoji: e.target.value})}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Badge Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Perfect Scorer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Explain what this badge represents..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Criteria Type</Label>
                <Select value={formData.criteriaType} onValueChange={v => setFormData({...formData, criteriaType: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completion">Course Completion</SelectItem>
                    <SelectItem value="perfect_score">Perfect Score</SelectItem>
                    <SelectItem value="streak">Login Streak (Days)</SelectItem>
                    <SelectItem value="points">Total Points</SelectItem>
                    <SelectItem value="level">Reach Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Required Value</Label>
                <Input 
                  type="number" 
                  min={1}
                  value={formData.criteriaValue} 
                  onChange={e => setFormData({...formData, criteriaValue: parseInt(e.target.value) || 1})}
                />
                <p className="text-xs text-muted-foreground">
                  The target number required to unlock this badge (e.g. 7 for a 7-day streak).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Course Scope (Optional)</Label>
                <Select value={formData.courseId} onValueChange={v => setFormData({...formData, courseId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Global (Any Course)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Any Course)</SelectItem>
                    {courses?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If selected, this badge can only be earned within the specific course.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.name || !formData.emoji || createBadgeMutation.isPending || updateBadgeMutation.isPending}
                >
                  {editingBadge ? 'Save Changes' : 'Create Badge'}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Archive Dialog */}
        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {badgeToArchive?.archivedAt ? 'Restore Badge?' : 'Archive Badge?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {badgeToArchive?.archivedAt 
                  ? 'This badge will be active again and students can earn it.'
                  : 'Archiving this badge will stop new students from earning it. Students who already have it will keep it.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmArchive} className={!badgeToArchive?.archivedAt ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}>
                {badgeToArchive?.archivedAt ? 'Restore' : 'Archive'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
}

function BadgeCard({ badge, onEdit, onArchive, isArchived = false }: { 
  badge: GamificationBadge, 
  onEdit: () => void, 
  onArchive: () => void,
  isArchived?: boolean
}) {
  return (
    <Card className={`relative overflow-hidden group transition-all duration-200 hover:shadow-md ${isArchived ? 'opacity-70 bg-muted/50' : ''}`}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant={isArchived ? "default" : "destructive"} className="h-7 w-7" onClick={onArchive}>
          {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </Button>
      </div>
      
      <CardContent className="p-5 flex flex-col items-center text-center">
        <div className="h-16 w-16 mb-3 rounded-full bg-secondary/30 flex items-center justify-center text-4xl shadow-inner">
          {badge.emoji || '🏆'}
        </div>
        <h3 className="font-semibold line-clamp-1 w-full" title={badge.name}>{badge.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
          {badge.description}
        </p>
        
        <div className="mt-4 pt-4 border-t border-border/50 w-full flex flex-col gap-2">
          <Badge variant="outline" className="text-[10px] uppercase justify-center bg-background">
            {badge.criteriaType.replace('_', ' ')}: {badge.criteriaValue}
          </Badge>
          {badge.courseId && (
            <Badge variant="secondary" className="text-[10px] uppercase justify-center">
              Course Specific
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
