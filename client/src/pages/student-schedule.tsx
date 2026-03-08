import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePortalI18n } from '@/hooks/usePortalI18n';

import {
  Calendar, Clock, MapPin, Users, Video, Bell,
  ChevronLeft, ChevronRight, Download, AlertCircle,
  BookOpen, FileText, GraduationCap
} from "lucide-react";
import { 
  pageVariants, 
  staggerContainer,
  staggerContainerFast, 
  fadeInUpVariants, 
  glowCardVariants, 
  buttonVariants,
  springConfigs 
} from "@/lib/animations";

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  courseName?: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  isOnline?: boolean;
  color?: string;
  maxScore?: string;
}

interface GroupedSchedule {
  [date: string]: ScheduleEvent[];
}

interface DateRange {
  start: Date;
  end: Date;
}

const eventTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  class: { label: 'Class', color: 'text-blue-600', bgColor: 'bg-blue-500', icon: Users },
  exam: { label: 'Exam', color: 'text-red-600', bgColor: 'bg-red-500', icon: Bell },
  'assignment-due': { label: 'Due', color: 'text-orange-600', bgColor: 'bg-orange-500', icon: FileText },
  meeting: { label: 'Meeting', color: 'text-green-600', bgColor: 'bg-green-500', icon: Users },
  event: { label: 'Event', color: 'text-purple-600', bgColor: 'bg-purple-500', icon: Calendar },
  holiday: { label: 'Holiday', color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: GraduationCap },
  announcement: { label: 'Announcement', color: 'text-yellow-600', bgColor: 'bg-yellow-500', icon: Bell }
};

function EventCard({ event }: { event: ScheduleEvent }) {
  const config = eventTypeConfig[event.eventType] || eventTypeConfig.event;
  const Icon = config.icon;
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isOnline = event.isOnline || event.location?.toLowerCase().includes('online');

  return (
    <motion.div
      variants={glowCardVariants}
      whileHover="hover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfigs.gentle}
    >
    <Card className={`border-l-4 hover:shadow-md transition-all duration-200`} style={{ borderLeftColor: config.bgColor.replace('bg-', '#').replace('-500', '') }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${config.bgColor} text-white`}>
                {config.label}
              </Badge>
              {event.courseName && (
                <Badge variant="outline" className="text-xs">
                  {event.courseName}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg">{event.title}</h3>
          </div>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-gray-600">
              {isOnline ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="mt-3 text-sm text-gray-600 border-t pt-2">
            {event.description}
          </p>
        )}

        {isOnline && (
          <Button asChild size="sm" className="w-full mt-3 bg-eduverse-blue hover:bg-eduverse-blue/90">
            <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Video className="h-4 w-4 mr-2" />
              Join Online
            </motion.button>
          </Button>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}

function DayView({ date, events, isToday }: { date: string; events: ScheduleEvent[]; isToday: boolean }) {
  const dayDate = new Date(date);
  const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">{dayOfWeek}</h3>
          <p className="text-sm text-gray-600">{formattedDate}</p>
        </div>
        {isToday && (
          <Badge className="bg-eduverse-blue text-white">Today</Badge>
        )}
      </div>
      
      {events.length > 0 ? (
        <div className="space-y-4">
          {events
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map(event => (
              <EventCard key={event.id} event={event} />
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">No events scheduled</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StudentSchedule() {
  const { t } = usePortalI18n("common");
  const { user, token, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [groupedSchedule, setGroupedSchedule] = useState<GroupedSchedule>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Calculate date range based on week offset
  const getDateRange = useCallback(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(now.getDate() - day + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  }, [weekOffset]);

  const fetchSchedule = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      const response = await fetch(
        apiEndpoint(`/api/schedule/me?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setSchedule(data.schedule || []);
      setGroupedSchedule(data.grouped || {});
      setDateRange(data.dateRange ? {
        start: new Date(data.dateRange.start),
        end: new Date(data.dateRange.end)
      } : getDateRange());

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load schedule';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [token, getDateRange, toast]);

  useEffect(() => {
    // Wait for auth to complete loading before fetching
    if (!authLoading) {
      fetchSchedule();
    }
  }, [fetchSchedule, authLoading]);

  // Calculate stats
  const stats = {
    totalClasses: schedule.filter(e => e.eventType === 'class').length,
    upcomingExams: schedule.filter(e => e.eventType === 'exam').length,
    assignmentsDue: schedule.filter(e => e.eventType === 'assignment-due').length,
    onlineClasses: schedule.filter(e => e.isOnline || e.location?.toLowerCase().includes('online')).length
  };

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Get week days for display
  const getWeekDays = () => {
    const { start } = getDateRange();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getWeekDays();

  // Export schedule as ICS
  const handleExport = () => {
    if (schedule.length === 0) {
      toast({
        title: "No events to export",
        description: "There are no events in your current schedule to export.",
        variant: "destructive"
      });
      return;
    }

    // Generate ICS content
    const icsEvents = schedule.map(event => {
      const start = new Date(event.startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = new Date(event.endTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      return `BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT`;
    }).join('\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EduVerse//Schedule//EN
${icsEvents}
END:VCALENDAR`;

    // Download file
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eduverse-schedule.ics';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Schedule exported",
      description: "Your schedule has been downloaded as an ICS file."
    });
  };

  const weekLabel = weekOffset === 0 
    ? 'This Week' 
    : weekOffset > 0 
      ? `${weekOffset} Week${weekOffset > 1 ? 's' : ''} Ahead`
      : `${Math.abs(weekOffset)} Week${Math.abs(weekOffset) > 1 ? 's' : ''} Ago`;

  return (
    <DashboardLayout>
      <motion.div 
        className="space-y-6"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          variants={fadeInUpVariants}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600 mt-1">
              Manage your classes, exams, and events
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={loading || schedule.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={staggerContainerFast}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUpVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Classes</p>
                  <p className="text-2xl font-bold">{stats.totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={fadeInUpVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bell className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Exams</p>
                  <p className="text-2xl font-bold">{stats.upcomingExams}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={fadeInUpVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due</p>
                  <p className="text-2xl font-bold">{stats.assignmentsDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={fadeInUpVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Online</p>
                  <p className="text-2xl font-bold">{stats.onlineClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Week
              </Button>
              <div className="text-center">
                <h3 className="font-semibold">{weekLabel}</h3>
                {dateRange && (
                  <p className="text-sm text-gray-500">
                    {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
                Next Week
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchSchedule}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Views */}
        <Tabs defaultValue="week" className="space-y-4">
          <TabsList>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-eduverse-blue border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">Loading schedule...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {weekDays.map(date => (
                  <DayView 
                    key={date} 
                    date={date} 
                    events={groupedSchedule[date] || []} 
                    isToday={date === todayStr}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <div className="max-w-2xl">
              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-eduverse-blue border-t-transparent rounded-full mx-auto" />
                  </CardContent>
                </Card>
              ) : (
                <DayView 
                  date={todayStr} 
                  events={groupedSchedule[todayStr] || []} 
                  isToday={true}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-eduverse-blue border-t-transparent rounded-full mx-auto" />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {schedule
                  .filter(event => event.eventType === 'exam' || event.eventType === 'assignment-due')
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                {schedule.filter(e => e.eventType === 'exam' || e.eventType === 'assignment-due').length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-8 text-center">
                      <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No upcoming exams or assignments due</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
