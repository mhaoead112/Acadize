import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { useGamificationRules, useUpdateGamificationRules } from '@/hooks/useAdminGamification';
import RuleEditorTable from '@/components/gamification/RuleEditorTable';
import QuestTemplateEditor from '@/components/gamification/QuestTemplateEditor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Info, Settings, BarChart2, Target, Trophy } from 'lucide-react';
import { GamificationPointRule } from '@shared/gamification.types';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminGamificationRules() {
  const { data: rules, isLoading, error } = useGamificationRules();
  const updateRulesMutation = useUpdateGamificationRules();

  const handleSave = (updatedRules: GamificationPointRule[]) => {
    const payload = updatedRules.map(rule => ({
      eventType: rule.eventType,
      points: rule.points,
      isActive: rule.isActive
    }));
    
    updateRulesMutation.mutate({ rules: payload });
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Gamification Rewards
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure XP values and special quest challenges.
            </p>
          </div>
          
          <Link href="/admin/reports?tab=gamification">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              View Points Activity
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Point Rules
            </TabsTrigger>
            <TabsTrigger value="quests" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quest Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="space-y-6">
            <Alert className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Info className="h-5 w-5 text-blue-500" />
              <AlertTitle className="font-semibold text-blue-500">Abuse Prevention</AlertTitle>
              <AlertDescription className="text-blue-500/80">
                We recommend keeping individual event values under 100 XP to prevent "gaming" the system and artificially inflating rankings.
              </AlertDescription>
            </Alert>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#112240] shadow-sm">
              <CardContent className="p-0 sm:p-6">
                {isLoading ? (
                  <div className="space-y-4 p-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-20 text-destructive" />
                    <p className="font-medium text-destructive">Failed to load gamification rules</p>
                    <p className="text-sm mt-1">{error.message}</p>
                  </div>
                ) : rules ? (
                  <div className="p-4 sm:p-0">
                    <RuleEditorTable 
                      rules={rules} 
                      onSave={handleSave} 
                      isSaving={updateRulesMutation.isPending} 
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quests">
            <QuestTemplateEditor />
          </TabsContent>
        </Tabs>

      </div>
    </AdminLayout>
  );
}
