import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  Clock, MapPin, Users, Edit, Trash2, Search,
  Filter, Bell, CheckCircle, AlertCircle, Loader2,
  Video, BookOpen, GraduationCap, PartyPopper, Flag
} from "lucide-react";
import { apiEndpoint, assetUrl } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'assignment' | 'exam' | 'class' | 'event' | 'deadline' | 'meeting';
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  isPublic: boolean;
  maxParticipants?: string;
  createdBy: string;
  courseId?: string;
}

export default function AdminCalendar() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventType: "event" as const,
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    meetingLink: "",
    isPublic: true,
    maxParticipants: ""
  });

  useEffect(() => {
    fetchEvents();
  }, [token, currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(
        apiEndpoint(`/api/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
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
        setEvents(Array.isArray(data) ? data : (data.events || []));
      } else {
        console.error('Failed to fetch events');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and date",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const startDateTime = new Date(`${newEvent.date}T${newEvent.startTime}:00`);
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}:00`);

      const response = await fetch(apiEndpoint('/api/events'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description || null,
          eventType: newEvent.eventType,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: newEvent.location || null,
          meetingLink: newEvent.meetingLink || null,
          isPublic: newEvent.isPublic,
          maxParticipants: newEvent.maxParticipants || null
        })
      });

      if (response.ok) {
        toast({
          title: "Event Created",
          description: "The event has been added to the calendar"
        });
        fetchEvents();
        setCreateDialogOpen(false);
        resetNewEvent();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    setSaving(true);
    try {
      const response = await fetch(apiEndpoint(`/api/events/${selectedEvent.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(selectedEvent)
      });

      if (response.ok) {
        toast({
          title: "Event Updated",
          description: "The event has been updated successfully"
        });
        fetchEvents();
        setEditDialogOpen(false);
        setSelectedEvent(null);
      } else {
        throw new Error('Failed to update event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(apiEndpoint(`/api/events/${eventId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Event Deleted",
          description: "The event has been removed from the calendar"
        });
        fetchEvents();
        setViewDialogOpen(false);
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: "",
      description: "",
      eventType: "event",
      date: "",
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      meetingLink: "",
      isPublic: true,
      maxParticipants: ""
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
      meeting: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: Users, label: 'Live' },
      class: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: BookOpen, label: 'Live' },
      exam: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: GraduationCap, label: 'Exam' },
      event: { color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/10 border-[#FFD700]/20', icon: PartyPopper, label: 'Holiday' },
      deadline: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: Flag, label: 'Assignment' },
      assignment: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircle, label: 'Assignment' }
    };
    return configs[type] || configs.event;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      const eventDate = new Date(e.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === "all" || event.eventType === filterType;
    const matchesSearch = searchQuery === "" || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const upcomingEvents = filteredEvents
    .filter(e => new Date(e.startTime) >= new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const generateCalendarDays = () => {
    const days: { date: Date | null; events: CalendarEvent[]; isToday: boolean }[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: null, events: [], isToday: false });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dateEvents = getEventsForDate(date).filter(e => 
        filterType === "all" || e.eventType === filterType
      );
      days.push({
        date,
        events: dateEvents,
        isToday: date.getTime() === today.getTime()
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const totalEvents = events.length;
  const thisMonthEvents = events.filter(e => {
    const eventDate = new Date(e.startTime);
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  }).length;

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  const formatEventDate = (startTime: string) => {
    return new Date(startTime).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#FFD700] mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Loading calendar...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getEventsForSelectedDay = () => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toISOString().split('T')[0];
    return events.filter(e => {
      const eventDate = new Date(e.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 ml-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Platform Schedule</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Coordinate sessions, exams, and academic milestones.</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-3 bg-[#FFD700] text-[#0a192f] h-14 px-8 rounded-2xl font-black shadow-[0_10px_30px_rgba(242,208,13,0.3)] hover:scale-105 transition-all active:scale-95">
                <span className="material-symbols-outlined">add_circle</span>
                Add New Event
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-purple-600" />
                      Create New Event
                    </DialogTitle>
                    <DialogDescription>Add a new event to the school calendar</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="title">Event Title *</Label>
                      <Input
                        id="title"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="Enter event title"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Event Type *</Label>
                        <Select 
                          value={newEvent.eventType} 
                          onValueChange={(v: any) => setNewEvent({ ...newEvent, eventType: v })}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="event">🎉 Event</SelectItem>
                            <SelectItem value="meeting">👥 Meeting</SelectItem>
                            <SelectItem value="class">📚 Class</SelectItem>
                            <SelectItem value="exam">📝 Exam</SelectItem>
                            <SelectItem value="deadline">🚩 Deadline</SelectItem>
                            <SelectItem value="assignment">✅ Assignment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newEvent.date}
                          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                          className="h-11"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="e.g., Room 101, Main Hall"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
                      <Input
                        id="meetingLink"
                        value={newEvent.meetingLink}
                        onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                        placeholder="https://meet.google.com/..."
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Enter event description..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="font-medium">Public Event</Label>
                        <p className="text-xs text-gray-500">Visible to all users</p>
                      </div>
                      <Switch
                        checked={newEvent.isPublic}
                        onCheckedChange={(checked) => setNewEvent({ ...newEvent, isPublic: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateEvent} 
                      disabled={saving}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Event'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Calendar Grid */}
          <div className="lg:col-span-3 bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{monthName}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-700 dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-700 dark:border-white/10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-[#0a192f] dark:bg-[#0a192f]/50 p-4 text-center text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-700 dark:border-white/10">
                  {day}
                </div>
              ))}

              {/* Blank offset days */}
              {Array.from({ length: calendarDays[0]?.date ? calendarDays[0].date.getDay() : 0 }).map((_, i) => (
                <div key={`offset-${i}`} className="bg-[#112240] dark:bg-[#112240]/50 min-h-[120px]" />
              ))}

              {/* Calendar Days */}
              {calendarDays.map((day, idx) => {
                if (!day.date) return null;
                const dayNumber = day.date.getDate();
                const isSelected = dayNumber === selectedDay;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(dayNumber)}
                    className={`bg-[#112240] dark:bg-[#112240] min-h-[120px] p-2 border-r border-b border-slate-700 dark:border-white/5 cursor-pointer transition-all hover:bg-[#0a192f] dark:hover:bg-[#0a192f]/30 relative group ${
                      isSelected ? 'bg-[#FFD700]/5 dark:bg-[#FFD700]/5 ring-1 ring-inset ring-[#FFD700]/30' : ''
                    }`}
                  >
                    <span className={`text-sm font-black ${
                      isSelected ? 'text-[#FFD700]' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}>
                      {dayNumber}
                    </span>
                    <div className="mt-2 space-y-1">
                      {day.events.map((event) => {
                        const config = getEventTypeConfig(event.eventType);
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setViewDialogOpen(true);
                            }}
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-md truncate uppercase tracking-tighter border ${config.bgColor} ${config.color}`}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Details Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#FFD700] p-8 rounded-[2.5rem] text-[#0a192f]">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Selected Date</h3>
              <h4 className="text-3xl font-black">{monthName.split(' ')[0]} {selectedDay}</h4>
              <div className="mt-6 flex flex-col gap-4">
                {getEventsForSelectedDay().length > 0 ? (
                  getEventsForSelectedDay().map(event => {
                    const config = getEventTypeConfig(event.eventType);
                    return (
                      <motion.div
                        key={event.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setViewDialogOpen(true);
                        }}
                        className="bg-[#0a192f]/10 p-4 rounded-2xl border border-[#0a192f]/10 cursor-pointer hover:bg-[#0a192f]/20 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-[#0a192f]/10 px-2 py-0.5 rounded-full">{config.label}</span>
                          <span className="text-[10px] font-black opacity-60">{formatEventTime(event.startTime, event.endTime).split(' - ')[0]}</span>
                        </div>
                        <p className="font-black text-sm">{event.title}</p>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0a192f]/5 flex flex-col items-center justify-center border border-dashed border-[#0a192f]/20 py-10">
                    <span className="material-symbols-outlined opacity-30 text-3xl mb-2">event_busy</span>
                    <p className="text-xs font-bold opacity-40">No events today</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#112240] dark:bg-[#112240] border border-slate-700 dark:border-white/10 p-8 rounded-[2.5rem]">
              <h3 className="text-slate-900 dark:text-white font-black mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FFD700] text-sm">notifications_active</span>
                Upcoming Deadlines
              </h3>
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map(e => {
                  const eventDate = new Date(e.startTime);
                  const config = getEventTypeConfig(e.eventType);
                  return (
                    <motion.div
                      key={e.id}
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        setSelectedEvent(e);
                        setViewDialogOpen(true);
                      }}
                      className="flex items-center gap-4 group cursor-pointer"
                    >
                      <div className="size-10 rounded-xl bg-[#0a192f] dark:bg-[#0a192f] flex flex-col items-center justify-center shrink-0 border border-slate-700 dark:border-white/10 group-hover:border-[#FFD700] transition-colors">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 leading-none">{eventDate.getDate()}</span>
                        <span className="text-[8px] font-black text-[#FFD700] uppercase leading-none mt-0.5">{eventDate.toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-white text-xs font-black truncate">{e.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">{config.label} • {formatEventTime(e.startTime, e.endTime).split(' - ')[0]}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={`${getEventTypeConfig(selectedEvent.eventType).bgColor} ${getEventTypeConfig(selectedEvent.eventType).color} mb-2`}>
                      {getEventTypeConfig(selectedEvent.eventType).label}
                    </Badge>
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{formatEventDate(selectedEvent.startTime)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>{formatEventTime(selectedEvent.startTime, selectedEvent.endTime)}</span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="h-5 w-5" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.meetingLink && (
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-blue-600" />
                    <a 
                      href={selectedEvent.meetingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 text-sm">{selectedEvent.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {selectedEvent.isPublic ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
                <DialogDescription>Update event details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select 
                    value={selectedEvent.eventType} 
                    onValueChange={(v: any) => setSelectedEvent({ ...selectedEvent, eventType: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">🎉 Event</SelectItem>
                      <SelectItem value="meeting">👥 Meeting</SelectItem>
                      <SelectItem value="class">📚 Class</SelectItem>
                      <SelectItem value="exam">📝 Exam</SelectItem>
                      <SelectItem value="deadline">🚩 Deadline</SelectItem>
                      <SelectItem value="assignment">✅ Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={selectedEvent.location || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Link</Label>
                  <Input
                    value={selectedEvent.meetingLink || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, meetingLink: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={selectedEvent.description || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Public Event</Label>
                    <p className="text-xs text-gray-500">Visible to all users</p>
                  </div>
                  <Switch
                    checked={selectedEvent.isPublic}
                    onCheckedChange={(checked) => setSelectedEvent({ ...selectedEvent, isPublic: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateEvent} 
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
