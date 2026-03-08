import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { usePortalI18n } from '@/hooks/usePortalI18n';

import { 
  BookOpen, CheckCircle2, Circle, FileText, 
  Video, Image, File, ArrowLeft
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  order: string;
  fileType: string;
  createdAt: Date;
  isCompleted: boolean;
  assignmentsCompleted: number;
  totalAssignments: number;
}

interface LessonCompletionData {
  courseId: string;
  lessons: Lesson[];
  summary: {
    totalLessons: number;
    completedLessons: number;
    completionRate: number;
  };
}

export default function ParentLessons() {
  const { t } = usePortalI18n("common");
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const childId = searchParams.get('child');
  const courseId = params.courseId;

  const [data, setData] = useState<LessonCompletionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && childId) {
      fetchLessons();
    }
  }, [courseId, childId, token]);

  const fetchLessons = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        apiEndpoint(`/api/parent/children/${childId}/courses/${courseId}/lessons`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const lessonData = await response.json();
        setData(lessonData);
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('video')) return <Video className="h-5 w-5 text-purple-600" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-blue-600" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/parent/courses')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>

        {/* Summary Card */}
        {!loading && data && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{data.summary.totalLessons}</p>
                  <p className="text-sm text-gray-600">Total Lessons</p>
                </div>
                <div className="text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{data.summary.completedLessons}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                <div className="text-center">
                  <div className="mb-2">
                    <Progress value={data.summary.completionRate} className="h-3" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{data.summary.completionRate}%</p>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-gray-500">Loading lessons...</div>
        )}

        {/* Lessons List */}
        {!loading && data && (
          <Card>
            <CardHeader>
              <CardTitle>Course Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      lesson.isCompleted
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    {/* Lesson Number */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-semibold text-purple-700">
                      {index + 1}
                    </div>

                    {/* File Type Icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(lesson.fileType)}
                    </div>

                    {/* Lesson Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>
                          {lesson.assignmentsCompleted} / {lesson.totalAssignments} assignments completed
                        </span>
                      </div>
                    </div>

                    {/* Completion Status */}
                    <div className="flex-shrink-0">
                      {lesson.isCompleted ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          <Circle className="h-4 w-4 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar for incomplete lessons */}
                    {!lesson.isCompleted && lesson.totalAssignments > 0 && (
                      <div className="w-32">
                        <Progress
                          value={(lesson.assignmentsCompleted / lesson.totalAssignments) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && data && data.lessons.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Lessons Available
              </h3>
              <p className="text-gray-500">
                This course doesn't have any lessons yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
