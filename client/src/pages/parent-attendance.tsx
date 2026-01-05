import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, XCircle, Clock, Calendar as CalendarIcon, 
  TrendingUp, AlertTriangle, Download, ChevronLeft, ChevronRight
} from "lucide-react";

interface Child {
  id: number;
  name: string;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export default function ParentAttendance() {
  const { user, token } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const childIdParam = searchParams.get('child');
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(childIdParam || "");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [token, selectedChild, selectedMonth]);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch children
      const childrenResponse = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json();
        // Map backend data (fullName) to frontend (name)
        const mappedChildren = (childrenData.children || []).map((c: any) => ({
          id: c.id,
          name: c.fullName || c.name || 'Unknown'
        }));
        setChildren(mappedChildren);
        if (!selectedChild && mappedChildren.length > 0) {
          setSelectedChild(mappedChildren[0].id.toString());
        }
      } else {
        setChildren([
          { id: 1, name: "Emma Johnson" },
          { id: 2, name: "Liam Johnson" }
        ]);
        if (!selectedChild) setSelectedChild("1");
      }

      // Fetch real attendance data from backend
      if (selectedChild) {
        const attendanceResponse = await fetch(
          apiEndpoint(`/api/parent/children/${selectedChild}/attendance`),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          }
        );

        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          
          // Map records - backend uses 'tardy' but frontend uses 'late'
          const mappedRecords = (attendanceData.records || []).map((r: any) => ({
            date: r.date,
            status: r.status === 'tardy' ? 'late' : r.status,
            notes: r.notes
          }));
          setAttendanceRecords(mappedRecords);
          
          // Use backend summary data
          setSummary({
            totalDays: attendanceData.totalDays || 0,
            present: attendanceData.presentDays || 0,
            absent: attendanceData.absentDays || 0,
            late: attendanceData.tardyDays || 0,
            excused: attendanceData.excusedDays || 0,
            percentage: attendanceData.attendanceRate || 0
          });
        } else {
          // Fallback to demo data
          generateDemoData();
        }
      } else {
        generateDemoData();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      generateDemoData();
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = () => {
    const demoRecords: AttendanceRecord[] = [];
    const today = new Date();
    const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    
    for (let d = new Date(startOfMonth); d <= today && d.getMonth() === selectedMonth.getMonth(); d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const rand = Math.random();
        let status: 'present' | 'absent' | 'late' | 'excused';
        if (rand < 0.85) status = 'present';
        else if (rand < 0.90) status = 'late';
        else if (rand < 0.95) status = 'excused';
        else status = 'absent';
        
        demoRecords.push({
          date: d.toISOString().split('T')[0],
          status,
          notes: status === 'excused' ? 'Doctor appointment' : undefined
        });
      }
    }
    
    setAttendanceRecords(demoRecords);
    
    const totalDays = demoRecords.length;
    const present = demoRecords.filter(r => r.status === 'present').length;
    const absent = demoRecords.filter(r => r.status === 'absent').length;
    const late = demoRecords.filter(r => r.status === 'late').length;
    const excused = demoRecords.filter(r => r.status === 'excused').length;
    
    setSummary({
      totalDays,
      present,
      absent,
      late,
      excused,
      percentage: totalDays > 0 ? Math.round((present / totalDays) * 100) : 0
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDayStatus = (date: Date): AttendanceRecord | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceRecords.find(r => r.date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
            <p className="text-gray-600">Track your child's school attendance</p>
          </div>
          <div className="flex gap-3">
            {children.length > 1 && (
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-green-800">{summary.present}</h3>
                <p className="text-sm text-green-700">Present</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="pt-6 text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-red-800">{summary.absent}</h3>
                <p className="text-sm text-red-700">Absent</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-yellow-800">{summary.late}</h3>
                <p className="text-sm text-yellow-700">Late</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-blue-800">{summary.excused}</h3>
                <p className="text-sm text-blue-700">Excused</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-purple-800">{summary.percentage}%</h3>
                <p className="text-sm text-purple-700">Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[150px] text-center">{monthName}</span>
                  <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const days = [];
                  const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
                  const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
                  
                  // Add empty cells for days before the first of the month
                  for (let i = 0; i < firstDay.getDay(); i++) {
                    days.push(<div key={`empty-${i}`} className="h-12" />);
                  }
                  
                  // Add cells for each day of the month
                  for (let d = 1; d <= lastDay.getDate(); d++) {
                    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), d);
                    const record = getDayStatus(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isFuture = date > new Date();
                    
                    let bgColor = 'bg-gray-50';
                    if (isWeekend || isFuture) {
                      bgColor = 'bg-gray-100';
                    } else if (record) {
                      if (record.status === 'present') bgColor = 'bg-green-100';
                      else if (record.status === 'absent') bgColor = 'bg-red-100';
                      else if (record.status === 'late') bgColor = 'bg-yellow-100';
                      else if (record.status === 'excused') bgColor = 'bg-blue-100';
                    }
                    
                    days.push(
                      <button
                        key={d}
                        onClick={() => setSelectedDate(date)}
                        className={`h-12 rounded-lg ${bgColor} flex flex-col items-center justify-center transition-all hover:ring-2 hover:ring-pink-300`}
                        disabled={isWeekend || isFuture}
                      >
                        <span className={`text-sm ${isWeekend || isFuture ? 'text-gray-400' : 'text-gray-700'}`}>
                          {d}
                        </span>
                        {record && !isWeekend && (
                          <span className="mt-0.5">
                            {getStatusIcon(record.status)}
                          </span>
                        )}
                      </button>
                    );
                  }
                  
                  return days;
                })()}
              </div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-100" />
                  <span className="text-sm text-gray-600">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-red-100" />
                  <span className="text-sm text-gray-600">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-yellow-100" />
                  <span className="text-sm text-gray-600">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-100" />
                  <span className="text-sm text-gray-600">Excused</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Records</CardTitle>
              <CardDescription>Last 10 school days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceRecords.slice(-10).reverse().map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(record.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        {record.notes && (
                          <p className="text-xs text-gray-500">{record.notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
