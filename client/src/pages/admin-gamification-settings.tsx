import { useState, useEffect, useMemo } from 'react';
import { Shield, Save, RefreshCw, AlertTriangle, Eye, Award, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { useGamificationSettings, useUpdateGamificationSettings } from '@/hooks/useAdminGamification';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GamificationSettings } from '@shared/gamification.types';
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
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function AdminGamificationSettings() {
  const { data: settings, isLoading } = useGamificationSettings();
  const updateSettingsMutation = useUpdateGamificationSettings();
  
  // Local state for edits
  const [editedSettings, setEditedSettings] = useState<GamificationSettings | null>(null);
  const [showDisableWarning, setShowDisableWarning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize local state when data loads
  useEffect(() => {
    if (settings && !editedSettings) {
      setEditedSettings(settings);
    }
  }, [settings, editedSettings]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!settings || !editedSettings) return false;
    return (
      settings.enabled !== editedSettings.enabled ||
      settings.pointsEnabled !== editedSettings.pointsEnabled ||
      settings.levelsEnabled !== editedSettings.levelsEnabled ||
      settings.badgesEnabled !== editedSettings.badgesEnabled ||
      settings.leaderboardEnabled !== editedSettings.leaderboardEnabled ||
      settings.pointNaming !== editedSettings.pointNaming ||
      settings.levelNaming !== editedSettings.levelNaming
    );
  }, [settings, editedSettings]);

  // Prevent navigation if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Validation
  const namingErrors = useMemo(() => {
    if (!editedSettings) return { pointNaming: '', levelNaming: '' };
    return {
      pointNaming: editedSettings.pointNaming.length > 20 ? 'Maximum 20 characters' : '',
      levelNaming: editedSettings.levelNaming.length > 20 ? 'Maximum 20 characters' : '',
    };
  }, [editedSettings]);

  const isValid = !namingErrors.pointNaming && !namingErrors.levelNaming;

  const handleSave = () => {
    if (!editedSettings || !isValid) return;

    updateSettingsMutation.mutate({
      enabled: editedSettings.enabled,
      pointsEnabled: editedSettings.pointsEnabled,
      levelsEnabled: editedSettings.levelsEnabled,
      badgesEnabled: editedSettings.badgesEnabled,
      leaderboardEnabled: editedSettings.leaderboardEnabled,
      pointNaming: editedSettings.pointNaming,
      levelNaming: editedSettings.levelNaming,
    }, {
      onSuccess: () => {
        setLastSaved(new Date());
      }
    });
  };

  const handleMasterToggle = (checked: boolean) => {
    if (!checked) {
      setShowDisableWarning(true);
    } else {
      setEditedSettings(prev => prev ? { ...prev, enabled: true } : null);
    }
  };

  const confirmDisable = () => {
    setEditedSettings(prev => prev ? { ...prev, enabled: false } : null);
    setShowDisableWarning(false);
  };

  if (isLoading || !editedSettings) {
    return (
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          <Skeleton className="h-12 w-[300px]" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  const isMasterEnabled = editedSettings.enabled;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Gamification Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure points, levels, badges, and leaderboards for your organization.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {isDirty && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                Unsaved changes
              </Badge>
            )}
            {lastSaved && !isDirty && (
              <span className="text-xs text-muted-foreground">
                Last saved: {format(lastSaved, 'HH:mm:ss')}
              </span>
            )}
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || !isValid || updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Master Toggle */}
            <Card className={`border-2 ${isMasterEnabled ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Master Gamification Switch</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Enable or disable all gamification features globally. Disabling this will hide all gamification UI from students, but their data will be preserved.
                  </p>
                </div>
                <Switch 
                  checked={isMasterEnabled} 
                  onCheckedChange={handleMasterToggle}
                  className="data-[state=checked]:bg-primary scale-125"
                />
              </CardContent>
            </Card>

            {/* 2. Feature Toggles Grid */}
            <Card className={!isMasterEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
                <CardDescription>Individually enable or disable gamification components.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex items-start space-x-4 p-4 rounded-lg border bg-card/50">
                  <Switch 
                    id="points" 
                    checked={editedSettings.pointsEnabled} 
                    onCheckedChange={(c) => setEditedSettings({...editedSettings, pointsEnabled: c})}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="points" className="font-medium text-base">Points System</Label>
                    <p className="text-sm text-muted-foreground">
                      Award points to students for completing actions like passing exams or finishing courses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg border bg-card/50">
                  <Switch 
                    id="levels" 
                    checked={editedSettings.levelsEnabled} 
                    onCheckedChange={(c) => setEditedSettings({...editedSettings, levelsEnabled: c})}
                    disabled={!editedSettings.pointsEnabled}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="levels" className="font-medium text-base flex items-center gap-2">
                      Levels
                      {!editedSettings.pointsEnabled && <Badge variant="secondary" className="text-[10px] uppercase">Requires Points</Badge>}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Students level up as they accumulate points.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg border bg-card/50">
                  <Switch 
                    id="badges" 
                    checked={editedSettings.badgesEnabled} 
                    onCheckedChange={(c) => setEditedSettings({...editedSettings, badgesEnabled: c})}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="badges" className="font-medium text-base">Badges & Achievements</Label>
                    <p className="text-sm text-muted-foreground">
                      Award visual badges for specific accomplishments or milestones.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-lg border bg-card/50">
                  <Switch 
                    id="leaderboard" 
                    checked={editedSettings.leaderboardEnabled} 
                    onCheckedChange={(c) => setEditedSettings({...editedSettings, leaderboardEnabled: c})}
                    disabled={!editedSettings.pointsEnabled}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="leaderboard" className="font-medium text-base flex items-center gap-2">
                      Leaderboard
                      {!editedSettings.pointsEnabled && <Badge variant="secondary" className="text-[10px] uppercase">Requires Points</Badge>}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show students how they rank against their peers in courses.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 3. Naming Controls */}
            <Card className={!isMasterEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader>
                <CardTitle>Naming & Branding</CardTitle>
                <CardDescription>Customize the terminology used for gamification features in your organization.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <Label htmlFor="pointNaming">Point Unit Name</Label>
                  <Input 
                    id="pointNaming" 
                    value={editedSettings.pointNaming} 
                    onChange={(e) => setEditedSettings({...editedSettings, pointNaming: e.target.value})}
                    placeholder="e.g., XP, Points, Stars"
                    className={namingErrors.pointNaming ? 'border-destructive' : ''}
                  />
                  {namingErrors.pointNaming ? (
                    <p className="text-xs text-destructive">{namingErrors.pointNaming}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Default: XP</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levelNaming">Level Prefix</Label>
                  <Input 
                    id="levelNaming" 
                    value={editedSettings.levelNaming} 
                    onChange={(e) => setEditedSettings({...editedSettings, levelNaming: e.target.value})}
                    placeholder="e.g., Level, Rank, Tier"
                    className={namingErrors.levelNaming ? 'border-destructive' : ''}
                  />
                  {namingErrors.levelNaming ? (
                    <p className="text-xs text-destructive">{namingErrors.levelNaming}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Default: Level</p>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* 4. Level Thresholds Table */}
            <Card className={!isMasterEnabled || !editedSettings.levelsEnabled ? 'opacity-50 pointer-events-none' : ''}>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>Level Thresholds</CardTitle>
                  <CardDescription>The points required to reach each level.</CardDescription>
                </div>
                <Badge variant="secondary">V1 Feature</Badge>
              </CardHeader>
              <CardContent>
                <Alert className="bg-muted/50 border-border mb-6">
                  <AlertTitle className="text-sm font-semibold">Read-only view</AlertTitle>
                  <AlertDescription className="text-xs">
                    Custom level thresholds are currently managed by the platform administrators. Contact support to customize the progression curve for your organization.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5, 10, 20, 50, 99, 100].map(level => {
                    // Simple mocked progression representation based on standard config
                    const points = level === 1 ? 0 : Math.floor(100 * Math.pow(level, 1.5));
                    return (
                      <div key={level} className="p-3 border rounded-md bg-card/50 text-center">
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          {editedSettings.levelNaming || 'Level'} {level}
                        </div>
                        <div className="font-bold mt-1">
                          {points.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{editedSettings.pointNaming || 'XP'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5. Preview Panel (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card className="border-primary/20 shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    Student View Preview
                  </CardTitle>
                  <CardDescription className="text-xs">
                    How it looks to a student based on current settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  
                  {!isMasterEnabled ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Gamification Disabled</p>
                      <p className="text-xs mt-1">Students will not see any gamification UI.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Points & Level Preview */}
                      {(editedSettings.pointsEnabled || editedSettings.levelsEnabled) && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                              <Star className="h-6 w-6 text-primary fill-primary/20" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg leading-none">Alex Student</p>
                              {editedSettings.levelsEnabled && (
                                <p className="text-sm text-primary font-medium mt-1">
                                  {editedSettings.levelNaming || 'Level'} 12
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {editedSettings.pointsEnabled && (
                            <div className="bg-secondary/30 rounded-lg p-3">
                              <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Earned</span>
                                <span className="font-bold text-primary">
                                  4,250 {editedSettings.pointNaming || 'XP'}
                                </span>
                              </div>
                              {editedSettings.levelsEnabled && (
                                <>
                                  <Progress value={65} className="h-2" />
                                  <p className="text-[10px] text-right text-muted-foreground mt-1">
                                    850 {editedSettings.pointNaming || 'XP'} to next {editedSettings.levelNaming.toLowerCase() || 'level'}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Badges Preview */}
                      {editedSettings.badgesEnabled && (
                        <div className="space-y-2 pt-4 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Badges</p>
                          <div className="flex gap-2">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg" title="First Steps">🚀</div>
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg" title="Perfect Score">💯</div>
                            <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg" title="7 Day Streak">🔥</div>
                          </div>
                        </div>
                      )}

                      {/* Leaderboard Preview */}
                      {editedSettings.leaderboardEnabled && (
                        <div className="space-y-2 pt-4 border-t border-border">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Rank</p>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                              <Trophy className="h-3 w-3 mr-1" />
                              Rank #3
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground border rounded bg-card/50 p-2">
                            Leaderboard is visible in courses
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Disable Warning Dialog */}
      <AlertDialog open={showDisableWarning} onOpenChange={setShowDisableWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Disable Gamification?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will hide all gamification features (points, levels, badges, leaderboards) from students immediately. 
              <br/><br/>
              <strong>Points and badges are not deleted</strong>, they are just hidden. You can safely re-enable gamification later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisable} className="bg-amber-600 hover:bg-amber-700 text-white">
              Disable Globally
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AdminLayout>
  );
}
