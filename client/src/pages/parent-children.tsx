import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, Edit, Trash2, GraduationCap, 
  BookOpen, Calendar, TrendingUp, Award, 
  Mail, Phone, School, UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Child {
  id: number;
  name: string;
  email: string;
  grade: string;
  school: string;
  profilePicture?: string;
  overallGrade: string;
  attendance: number;
  coursesEnrolled: number;
  linkedAt: string;
  progressPercentage?: number;
}

export default function ParentChildren() {
  const { t } = useTranslation('parent');
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, [token]);

  const fetchChildren = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(apiEndpoint('/api/parent/dashboard/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend data structure to frontend interface
        const mappedChildren = (data.children || []).map((child: any) => ({
          id: child.id,
          name: child.name || child.fullName || 'Unknown',
          email: child.email || '',
          grade: 'N/A', // Grade level not tracked
          school: 'EduVerse Academy',
          overallGrade: child.stats?.progressPercentage >= 90 ? 'A' :
                        child.stats?.progressPercentage >= 80 ? 'B+' :
                        child.stats?.progressPercentage >= 70 ? 'B' :
                        child.stats?.progressPercentage >= 60 ? 'C' : 'D',
          attendance: 95, // Default - would need separate attendance API
          coursesEnrolled: child.stats?.coursesEnrolled || 0,
          linkedAt: child.linkedAt || new Date().toISOString(),
          progressPercentage: child.stats?.progressPercentage || 0
        }));
        setChildren(mappedChildren);
      } else if (response.status === 401) {
        toast({
          title: t('toast.authError'),
          description: t('toast.pleaseLogInAgain'),
          variant: "destructive"
        });
        setLocation('/login');
      } else {
        console.error('Failed to fetch children:', response.status);
        setChildren([]);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChild = async () => {
    if (!linkCode.trim()) {
      toast({
        title: t('common:toast.error'),
        description: t('toast.invalidLinkCode'),
        variant: "destructive"
      });
      return;
    }

    setLinking(true);
    try {
      const response = await fetch(apiEndpoint('/api/parent/link-child'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ linkCode })
      });

      if (response.ok) {
        toast({
          title: t('common:toast.success'),
          description: t('toast.childLinkedSuccess')
        });
        setLinkDialogOpen(false);
        setLinkCode("");
        fetchChildren();
      } else {
        const error = await response.json();
        toast({
          title: t('common:toast.error'),
          description: error.message || t('toast.failedToLinkChild'),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToLinkChild'),
        variant: "destructive"
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkChild = async (childId: number) => {
    if (!confirm("Are you sure you want to unlink this child?")) return;

    try {
      const response = await fetch(apiEndpoint(`/api/parent/children/${childId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: t('common:toast.success'),
          description: t('toast.childUnlinkedSuccess')
        });
        setChildren(children.filter(c => c.id !== childId));
      }
    } catch (error) {
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToUnlinkChild'),
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <ParentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('myChildren')}</h1>
            <p className="text-gray-600">Manage your linked student accounts</p>
          </div>
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-pink-600 hover:bg-pink-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Link New Child
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link a Child Account</DialogTitle>
                <DialogDescription>
                  Enter the unique link code provided by your child's school to connect their account.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="linkCode">Link Code</Label>
                <Input
                  id="linkCode"
                  placeholder="Enter link code (e.g., EDU-XXXX-XXXX)"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value)}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This code is unique to each student and can be found in their school portal.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkChild} disabled={linking}>
                  {linking ? "Linking..." : "Link Child"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Children List */}
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Linked</h3>
              <p className="text-gray-500 mb-4">
                Link your child's student account to monitor their academic progress.
              </p>
              <Button onClick={() => setLinkDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Link Your First Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child) => (
              <Card key={child.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-white shadow">
                        <AvatarImage src={child.profilePicture} />
                        <AvatarFallback className="bg-pink-100 text-pink-600 text-xl">
                          {child.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl">{child.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{child.progressPercentage || 0}% Progress</Badge>
                          <span className="text-sm text-gray-500">{child.school}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => handleUnlinkChild(child.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{child.progressPercentage || 0}%</p>
                      <p className="text-xs text-gray-500">Progress</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{child.attendance}%</p>
                      <p className="text-xs text-gray-500">Attendance</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <BookOpen className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{child.coursesEnrolled}</p>
                      <p className="text-xs text-gray-500">Courses</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {child.email}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/parent/grades?child=${child.id}`)}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Grades
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setLocation(`/parent/attendance?child=${child.id}`)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* How to Link Section */}
        <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
          <CardHeader>
            <CardTitle className="text-lg">{t('howToLinkChild')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-medium">Get the Link Code</h4>
                  <p className="text-sm text-gray-600">Contact your child's school or check their student portal for the unique parent link code.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-medium">Enter the Code</h4>
                  <p className="text-sm text-gray-600">Click "Link New Child" and enter the provided code to request access.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-medium">Start Monitoring</h4>
                  <p className="text-sm text-gray-600">Once verified, you can view grades, attendance, and communicate with teachers.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ParentLayout>
  );
}
