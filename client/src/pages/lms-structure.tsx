import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  Trophy, 
  Target, 
  TrendingUp, 
  BookOpen,
  Award,
  Calendar,
  Users,
  Calculator,
  FlaskConical,
  BookText,
  Landmark,
  Palette,
  Star,
  ThumbsUp,
  TrendingUpIcon,
  Dumbbell,
  Medal,
  UserCircle,
  BarChart
} from "lucide-react";

interface Subject {
  name: string;
  grade: number;
  maxGrade: number;
  progress: number;
  icon: any;
  color: string;
  assignments: number;
  completedAssignments: number;
}

interface Student {
  name: string;
  avatar: string;
  id: string;
  overallGrade: number;
  subjects: Subject[];
  rank: number;
  totalStudents: number;
}

const studentData: Student = {
  name: "Ahmad Hassan",
  avatar: "AH",
  id: "ST2025001",
  overallGrade: 87.5,
  rank: 12,
  totalStudents: 150,
  subjects: [
    {
      name: "Mathematics",
      grade: 92,
      maxGrade: 100,
      progress: 85,
      icon: Calculator,
      color: "bg-blue-500",
      assignments: 12,
      completedAssignments: 10
    },
    {
      name: "Science",
      grade: 88,
      maxGrade: 100,
      progress: 78,
      icon: FlaskConical, 
      color: "bg-green-500",
      assignments: 10,
      completedAssignments: 8
    },
    {
      name: "English",
      grade: 85,
      maxGrade: 100,
      progress: 90,
      icon: BookText,
      color: "bg-purple-500",
      assignments: 15,
      completedAssignments: 14
    },
    {
      name: "History",
      grade: 90,
      maxGrade: 100,
      progress: 95,
      icon: Landmark,
      color: "bg-orange-500",
      assignments: 8,
      completedAssignments: 8
    },
    {
      name: "Art",
      grade: 86,
      maxGrade: 100,
      progress: 70,
      icon: Palette,
      color: "bg-pink-500",
      assignments: 6,
      completedAssignments: 4
    }
  ]
};

const exampleStudents = [
  { name: "Sarah Ahmed", grade: 94, avatar: "SA", rank: 1 },
  { name: "Omar Khalil", grade: 91, avatar: "OK", rank: 2 },
  { name: "Layla Hassan", grade: 89, avatar: "LH", rank: 3 },
  { name: "Ahmad Hassan", grade: 87.5, avatar: "AH", rank: 12 }
];

export default function LMSStructure() {
  const [selectedStudent] = useState<Student>(studentData);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'achievements' | 'analytics'>('overview');

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600 bg-green-50";
    if (grade >= 80) return "text-blue-600 bg-blue-50";
    if (grade >= 70) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getGradeLetter = (grade: number) => {
    if (grade >= 95) return "A+";
    if (grade >= 90) return "A";
    if (grade >= 85) return "B+";
    if (grade >= 80) return "B";
    if (grade >= 75) return "C+";
    if (grade >= 70) return "C";
    return "D";
  };

  const getPerformanceMessage = (grade: number) => {
    if (grade >= 90) return "Outstanding Performance!";
    if (grade >= 80) return "Great Work!";
    if (grade >= 70) return "Good Progress!";
    return "Keep Improving!";
  };

  const getPerformanceIcon = (grade: number) => {
    if (grade >= 90) return Star;
    if (grade >= 80) return ThumbsUp;
    if (grade >= 70) return TrendingUp;
    return Dumbbell;
  };

  return (
    <div className="min-h-screen luxury-gradient pt-20">
      {/* Luxury Header */}
      <div className="relative z-50 py-8 mb-8">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <TrendingUp className="text-white" size={32} />
                </div>
              </div>
              <h1 className="text-4xl font-luxury text-white/90 drop-shadow-2xl">
                Progress Dashboard
              </h1>
            </div>
            <p className="text-lg text-white/80 max-w-2xl mx-auto font-elegant drop-shadow-lg">
              Your personalized learning journey with real-time insights and achievements!
            </p>
          </div>
          
          {/* Luxury Tab Navigation */}
          <div className="flex justify-center mt-6">
            <div className="flex luxury-card p-1 shadow-2xl border-0">
              {[
                { key: 'overview', label: 'Overview', icon: Target },
                { key: 'subjects', label: 'Subjects', icon: BookOpen },
                { key: 'achievements', label: 'Achievements', icon: Trophy },
                { key: 'analytics', label: 'Analytics', icon: TrendingUp }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-elegant transition-all duration-400 ${
                    activeTab === key
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-2xl transform scale-105 border-2 border-yellow-300/40'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:shadow-md'
                  }`}
                  data-testid={`tab-${key}`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Render content based on active tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Luxury Student Overview Card */}
              <Card className="luxury-card mb-8 relative overflow-hidden border-0 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 via-transparent to-yellow-400/10 opacity-50"></div>
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-lg"></div>
                        <Avatar className="w-20 h-20 bg-white/10 border-3 border-white/30 backdrop-blur-sm relative z-10">
                          <AvatarFallback className="text-3xl bg-gradient-to-br from-white to-blue-100 text-blue-600">
                            {selectedStudent.avatar}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="text-white">
                        <CardTitle className="text-3xl font-luxury mb-1">{selectedStudent.name}</CardTitle>
                        <p className="text-white/80 text-lg font-elegant">Student ID: {selectedStudent.id}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                            <Trophy size={14} />
                            <span>Rank #{selectedStudent.rank}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                            <Users size={14} />
                            <span>of {selectedStudent.totalStudents}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <div className="flex flex-col items-end">
                        <div className="relative mb-4">
                          <div className="absolute inset-0 bg-white/20 rounded-3xl blur-xl"></div>
                          <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl px-8 py-6 border border-white/20">
                            <div className="text-7xl font-bold mb-2 bg-gradient-to-br from-white to-blue-100 bg-clip-text text-transparent">
                              {selectedStudent.overallGrade}%
                            </div>
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 text-lg border-0">
                              {getGradeLetter(selectedStudent.overallGrade)} Grade
                            </Badge>
                          </div>
                        </div>
                        <div className="text-white/90 text-lg font-medium">
                          {getPerformanceMessage(selectedStudent.overallGrade)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 text-white">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-3xl font-bold text-white mb-1">{getGradeLetter(selectedStudent.overallGrade)}</div>
                      <p className="text-white/80 text-sm">Letter Grade</p>
                    </div>
                    <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-3xl font-bold text-white mb-1">#{selectedStudent.rank}</div>
                      <p className="text-white/80 text-sm">Class Rank</p>
                    </div>
                    <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-3xl font-bold text-white mb-1">{selectedStudent.subjects.length}</div>
                      <p className="text-white/80 text-sm">Subjects</p>
                    </div>
                    <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      <div className="text-3xl font-bold text-white mb-1">
                        {selectedStudent.subjects.reduce((acc, subject) => acc + subject.completedAssignments, 0)}
                      </div>
                      <p className="text-white/80 text-sm">Completed Tasks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subject Progress Cards */}
          <div className="mb-8">
            <h2 className="text-2xl font-luxury text-white/90 mb-6 flex items-center gap-2 drop-shadow-lg">
              <BookOpen className="text-yellow-400" />
              Subject Progress
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedStudent.subjects.map((subject) => {
                const SubjectIcon = subject.icon;
                return (
                  <Card key={subject.name} className="luxury-card border-0 shadow-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SubjectIcon size={24} className="text-eduverse-blue" />
                          <span className="text-lg">{subject.name}</span>
                        </div>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                          {subject.grade}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Grade Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Grade Progress</span>
                        <span className="font-medium">{subject.grade}/{subject.maxGrade}</span>
                      </div>
                      <Progress value={subject.grade} className="h-2" />
                    </div>
                    
                    {/* Assignment Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Assignments</span>
                        <span className="font-medium">
                          {subject.completedAssignments}/{subject.assignments}
                        </span>
                      </div>
                      <Progress 
                        value={(subject.completedAssignments / subject.assignments) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    {/* Subject Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center text-sm">
                      <div className="p-2 bg-white/10 backdrop-blur-sm rounded border border-white/20">
                        <div className="font-luxury text-gray-800">
                          {getGradeLetter(subject.grade)}
                        </div>
                        <div className="text-gray-600 font-elegant">Letter</div>
                      </div>
                      <div className="p-2 bg-white/10 backdrop-blur-sm rounded border border-white/20">
                        <div className="font-luxury text-gray-800">
                          {subject.progress}%
                        </div>
                        <div className="text-gray-600 font-elegant">Complete</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );})}
            </div>
          </div>

          {/* Overall Progress Summary */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card className="luxury-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 font-luxury">
                  <Target size={24} className="text-yellow-500" />
                  Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  {(() => {
                    const PerformanceIcon = getPerformanceIcon(selectedStudent.overallGrade);
                    return <PerformanceIcon size={64} className="mx-auto mb-2 text-yellow-500" />;
                  })()}
                  <div className="text-lg font-semibold text-gray-800">
                    {getPerformanceMessage(selectedStudent.overallGrade)}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Overall Progress</span>
                    <span className="font-bold">{selectedStudent.overallGrade}%</span>
                  </div>
                  <Progress value={selectedStudent.overallGrade} className="h-3" />
                  
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Strongest Subject:</span>
                        <span className="font-medium text-yellow-600">
                          Mathematics (92%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Focus Area:</span>
                        <span className="font-medium text-orange-600">
                          Art (86%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card border-0 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800 font-luxury">
                  <TrendingUp size={24} className="text-yellow-500" />
                  Class Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exampleStudents.map((student, index) => (
                    <div 
                      key={student.name}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                        student.name === selectedStudent.name 
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 shadow-md' 
                          : 'bg-white/80 backdrop-blur-sm hover:bg-white/90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-luxury ${
                          student.rank <= 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gray-400'
                        }`}>
                          {student.rank}
                        </div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.avatar}</div>
                        </div>
                      </div>
                      <Badge className={getGradeColor(student.grade)}>
                        {student.grade}%
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-gray-600">
                    Ranked <span className="font-luxury text-yellow-600">#{selectedStudent.rank}</span> out of{" "}
                    <span className="font-bold">{selectedStudent.totalStudents}</span> students
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Example Usage */}
          <Card className="luxury-card border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 font-luxury">
                <Award size={24} className="text-yellow-500" />
                <BarChart size={20} className="text-eduverse-blue" />
                Example: Student Progress Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-luxury text-gray-800 mb-2 flex items-center gap-1">
                    <TrendingUp size={16} className="text-green-600" />
                    Grades Overview:
                  </h4>
                  <ul className="space-y-1 text-gray-700 font-elegant">
                    <li>• Math: 92% (A-)</li>
                    <li>• Science: 88% (B+)</li>  
                    <li>• English: 85% (B+)</li>
                    <li>• Overall: 87.5% (B+)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-luxury text-gray-800 mb-2 flex items-center gap-1">
                    <Target size={16} className="text-blue-600" />
                    Progress Status:
                  </h4>
                  <ul className="space-y-1 text-gray-700 font-elegant">
                    <li>• Class Rank: #12 of 150</li>
                    <li>• Assignments: 44/46 completed</li>
                    <li>• Strong in: Mathematics</li>
                    <li>• Focus on: Art projects</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-luxury text-gray-800 mb-2 flex items-center gap-1">
                    <Trophy size={16} className="text-yellow-600" />
                    Achievements:
                  </h4>
                  <ul className="space-y-1 text-gray-700 font-elegant">
                    <li>• Top 10% in Math</li>
                    <li>• Perfect History scores</li>
                    <li>• 95% assignment completion</li>
                    <li>• Honor roll candidate</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
