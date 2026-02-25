import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight,
  GraduationCap, Bell, BookOpen, Users, AlertCircle
} from "lucide-react";

interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  courseName?: string;
  isAllDay?: boolean;
  color?: string;
}

interface GroupedEvents {
  [date: string]: SchoolEvent[];
}

const eventTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  class: { label: 'Class', color: 'bg-blue-500', icon: BookOpen },
  meeting: { label: 'Meeting', color: 'bg-purple-500', icon: Users },
  exam: { label: 'Exam', color: 'bg-red-500', icon: Bell },
  holiday: { label: 'Holiday', color: 'bg-green-500', icon: CalendarIcon },
  announcement: { label: 'Announcement', color: 'bg-yellow-500', icon: AlertCircle },
  'assignment-due': { label: 'Due Date', color: 'bg-orange-500', icon: Clock },
  event: { label: 'Event', color: 'bg-pink-500', icon: GraduationCap }
};

function EventCard({ event }: { event: SchoolEvent }) {
  const config = eventTypeConfig[event.eventType] || eventTypeConfig.event;
  const Icon = config.icon;
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${config.color.replace('bg-', 'bg-opacity-20 bg-')}`}>
            <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-').replace('-500', '-600')}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${config.color} text-white text-xs`}>
                {config.label}
              </Badge>
              {event.courseName && (
                <Badge variant="outline" className="text-xs">
                  {event.courseName}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            {event.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{formatDate(startDate)}</span>
              </div>
              {!event.isAllDay && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(startDate)} - {formatTime(endDate)}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentCalendar() {
  const { t } = useTranslation('parent');
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [children, setChildren] = useState<any[]>([]);

  // Calculate date range based on week offset
  const getDateRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  };

  useEffect(() => {
    fetchChildren();
  }, [token]);

  useEffect(() => {
    if (selectedChild) {
      fetchChildSchedule();
    } else {
      fetchPublicEvents();
    }
  }, [selectedChild, weekOffset, token]);

  const fetchChildren = async () => {
    if (!token) {
      return;
    }
    
    try {
      const response = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
        if (data.children?.length > 0) {
          setSelectedChild(data.children[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching children:', err);
    }
  };

  const fetchChildSchedule = async () => {
    if (!selectedChild) return;

    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      const response = await fetch(
        apiEndpoint(`/api/schedule/${selectedChild}?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.schedule || []);
        setGroupedEvents(data.grouped || {});
      } else {
        throw new Error('Failed to fetch schedule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
      // Fallback to public events
      fetchPublicEvents();
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicEvents = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const response = await fetch(
        apiEndpoint(`/api/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        // Group events by date
        const grouped: GroupedEvents = {};
        (data.events || []).forEach((event: SchoolEvent) => {
          const dateKey = new Date(event.startTime).toISOString().split('T')[0];
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(event);
        });
        setGroupedEvents(grouped);
      }
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const { start, end } = getDateRange();
  const dateRangeLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(e => new Date(e.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Get today's events
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = groupedEvents[todayStr] || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <CalendarIcon className="h-7 w-7" />
                  {t('schoolCalendar')}
                </h1>
                <p className="text-purple-100 mt-1">View your children's schedule and school events</p>
              </div>
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white" onClick={() => setLocation('/parent')}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('backToDashboard')}
              </Button>
            </div>
          </div>
        </div>

        {/* Child Selector */}
        {children.length > 0 && (
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Select Child
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                      selectedChild === child.id
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    {child.fullName}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(weekOffset - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Week
              </Button>
              <div className="text-center">
                <h3 className="font-semibold">
                  {weekOffset === 0 ? 'This Week' : weekOffset > 0 ? `${weekOffset} Week(s) Ahead` : `${Math.abs(weekOffset)} Week(s) Ago`}
                </h3>
                <p className="text-sm text-gray-500">{dateRangeLabel}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(weekOffset + 1)}
              >
                Next Week
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
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
                  <div className="animate-spin h-8 w-8 border-2 border-pink-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-600">Loading schedule...</p>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                  <p className="text-red-600">{error}</p>
                  <Button variant="outline" className="mt-4" onClick={() => selectedChild ? fetchChildSchedule() : fetchPublicEvents()}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : Object.keys(groupedEvents).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No events scheduled for this week</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {Object.entries(groupedEvents)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, dayEvents]) => (
                    <div key={date}>
                      <h3 className="font-semibold text-gray-700 mb-3">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {date === todayStr && (
                          <Badge className="ml-2 bg-pink-500">Today</Badge>
                        )}
                      </h3>
                      <div className="space-y-3">
                        {dayEvents.map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-pink-600 border-t-transparent rounded-full" />
                  </div>
                ) : todayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No events scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Next scheduled events and deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-pink-600 border-t-transparent rounded-full" />
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
