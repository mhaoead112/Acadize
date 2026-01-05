import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { 
  Plus, ChevronLeft, ChevronRight,
  Clock, MapPin, Trash2, Edit, Loader2
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeacherLayout from "@/components/TeacherLayout";

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
  location?: string;
  courseName?: string;
}

interface CalendarDay {
  date: Date | null;
  events: CalendarEvent[];
  isToday?: boolean;
}

export default function TeacherCalendar() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Filter states
  const [showCalendars, setShowCalendars] = useState({
    myCalendars: [true, true, false],
    eventTypes: [true, true]
  });

  // Mini calendar state
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    type: "class" as const,
    location: "",
    courseName: ""
  });

  useEffect(() => {
    if (token) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [token, currentDate]);

  const fetchEvents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      // Calculate date range for current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(
        apiEndpoint(`/api/schedule/me?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`),
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
        // Transform API response to match component's expected format
        // The API returns 'schedule' array with startTime/endTime as full datetime
        const transformedEvents = (data.schedule || []).map((e: any) => {
          const startDateTime = new Date(e.startTime);
          const endDateTime = new Date(e.endTime);
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            date: startDateTime.toISOString().split('T')[0],
            startTime: startDateTime.toTimeString().slice(0, 5),
            endTime: endDateTime.toTimeString().slice(0, 5),
            type: e.eventType || 'class',
            location: e.location,
            courseName: e.courseName
          };
        });
        setEvents(transformedEvents);
      } else {
        // API not available - use empty state
        setEvents([]);
        toast({
          title: "Info",
          description: "Calendar is empty. Add events to get started!",
        });
      }
    } catch (error) {
      // Network error - use empty state
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: "Error",
        description: "Please fill in title and date",
        variant: "destructive"
      });
      return;
    }

    try {
      // Combine date and time to create full ISO datetime strings
      const startDateTime = new Date(`${newEvent.date}T${newEvent.startTime}:00`);
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}:00`);
      
      const response = await fetch(apiEndpoint('/api/schedule/event'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          eventType: newEvent.type,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: newEvent.location,
          courseName: newEvent.courseName
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Convert API response to component's expected format
        const savedEvent: CalendarEvent = {
          id: data.event.id,
          title: data.event.title,
          description: data.event.description,
          date: newEvent.date,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          type: newEvent.type as any,
          location: data.event.location,
          courseName: newEvent.courseName
        };
        setEvents([...events, savedEvent]);
        toast({ title: "Success", description: "Event created and saved successfully" });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({ 
          title: "Error", 
          description: errorData.error || "Failed to save event",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error - could not save event",
        variant: "destructive"
      });
      return;
    }
    
    setCreateDialogOpen(false);
    setNewEvent({
      title: "",
      description: "",
      date: "",
      startTime: "09:00",
      endTime: "10:00",
      type: "class",
      location: "",
      courseName: ""
    });
  };

  const handleDeleteEvent = async (eventId: number) => {
    setIsDeleting(eventId);
    try {
      const response = await fetch(apiEndpoint(`/api/schedule/event/${eventId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId));
        toast({ title: "Success", description: "Event deleted successfully" });
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({ 
          title: "Error", 
          description: errorData.error || "Failed to delete event",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error - could not delete event",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    setIsSaving(true);
    try {
      const startDateTime = new Date(`${editingEvent.date}T${editingEvent.startTime}:00`);
      const endDateTime = new Date(`${editingEvent.date}T${editingEvent.endTime}:00`);

      const response = await fetch(apiEndpoint(`/api/schedule/event/${editingEvent.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editingEvent.title,
          description: editingEvent.description,
          eventType: editingEvent.type,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: editingEvent.location
        })
      });

      if (response.ok) {
        setEvents(events.map(e => 
          e.id === editingEvent.id ? editingEvent : e
        ));
        toast({ title: "Success", description: "Event updated successfully" });
        setEditDialogOpen(false);
        setEditingEvent(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({ 
          title: "Error", 
          description: errorData.error || "Failed to update event",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error - could not update event",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'class': return { bg: 'bg-blue-500/10', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-300' };
      case 'meeting': return { bg: 'bg-purple-500/10', border: 'border-l-purple-500', text: 'text-purple-700 dark:text-purple-300' };
      case 'exam': return { bg: 'bg-red-500/10', border: 'border-l-red-500', text: 'text-red-700 dark:text-red-300' };
      case 'announcement': return { bg: 'bg-yellow-500/10', border: 'border-l-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' };
      case 'holiday': return { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' };
      default: return { bg: 'bg-gray-500/10', border: 'border-l-gray-500', text: 'text-gray-700 dark:text-gray-300' };
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: null, events: [] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = events.filter(e => e.date === dateStr);
      
      days.push({
        date,
        events: dayEvents,
        isToday: date.getTime() === today.getTime()
      });
    }

    return days;
  };

  const generateMiniCalendarDays = () => {
    const firstDay = new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth(), 1);
    const lastDay = new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d);
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const upcomingDeadlines = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const miniMonthName = miniCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const calendarDays = generateCalendarDays();
  const miniCalendarDays = generateMiniCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEvents = getEventsForDate(today);

  const navigateMiniMonth = (direction: number) => {
    const newDate = new Date(miniCalendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setMiniCalendarDate(newDate);
  };

  if (loading) {
    return (
      <TeacherLayout>
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
      </div>
      </TeacherLayout>
    );
  }

  return (
          <TeacherLayout>
    <div className="flex h-screen overflow-hidden bg-white dark:bg-navy-dark">
      {/* Sidebar - Hidden on mobile, visible on large screens */}
      <aside className="hidden lg:flex w-80 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-dark overflow-y-auto">
        {/* Mini Calendar Widget */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{miniMonthName}</span>
            <div className="flex gap-1">
              <button onClick={() => navigateMiniMonth(-1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigateMiniMonth(1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Mini Grid */}
          <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
            <span className="text-slate-400 font-medium">S</span>
            <span className="text-slate-400 font-medium">M</span>
            <span className="text-slate-400 font-medium">T</span>
            <span className="text-slate-400 font-medium">W</span>
            <span className="text-slate-400 font-medium">T</span>
            <span className="text-slate-400 font-medium">F</span>
            <span className="text-slate-400 font-medium">S</span>
            {miniCalendarDays.map((d, idx) => (
              <button
                key={idx}
                onClick={() => d !== null && setCurrentDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth(), d))}
                className={`py-1 rounded-full transition-colors ${
                  d === null
                    ? 'text-slate-300 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-500 hover:bg-gold/20'
                } ${
                  d !== null && new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth(), d).toDateString() === today.toDateString()
                    ? 'bg-gold text-navy font-bold shadow-md shadow-gold/20'
                    : ''
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">My Calendars</h3>
            <div className="flex flex-col gap-2">
              {['Math 101 - Algebra', 'Homeroom 4B', 'Staff Meetings'].map((cal, idx) => (
                <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showCalendars.myCalendars[idx]}
                    onChange={(e) => setShowCalendars({
                      ...showCalendars,
                      myCalendars: showCalendars.myCalendars.map((v, i) => i === idx ? e.target.checked : v)
                    })}
                    className="rounded border-slate-300 dark:border-slate-700 bg-transparent text-gold focus:ring-gold h-4 w-4"
                  />
                  <span className={`size-2 rounded-full ${['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'][idx]}`}></span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-gold transition-colors">{cal}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Event Types</h3>
            <div className="flex flex-col gap-2">
              {['Assignments', 'Exams'].map((type, idx) => (
                <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showCalendars.eventTypes[idx]}
                    onChange={(e) => setShowCalendars({
                      ...showCalendars,
                      eventTypes: showCalendars.eventTypes.map((v, i) => i === idx ? e.target.checked : v)
                    })}
                    className="rounded border-slate-300 dark:border-slate-700 bg-transparent text-gold focus:ring-gold h-4 w-4"
                  />
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">
                    {idx === 0 ? 'assignment' : 'quiz'}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-gold transition-colors">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Agenda */}
        <div className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-navy/10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Upcoming Deadlines</h3>
          <div className="flex flex-col gap-4">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((event) => (
                <div key={event.id} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center bg-white dark:bg-slate-800 rounded p-1 min-w-[40px] border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white leading-none">{String(new Date(event.date).getDate()).padStart(2, '0')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{event.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{event.startTime} {event.location ? '• ' + event.location : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Calendar Content */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-navy-dark overflow-hidden">
        {/* Calendar Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{monthName}</h1>
            <div className="flex items-center bg-slate-100 dark:bg-navy/30 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
              <button onClick={() => navigateMonth(-1)} className="px-2 py-1 hover:text-gold transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-bold hover:text-gold transition-colors">Today</button>
              <button onClick={() => navigateMonth(1)} className="px-2 py-1 hover:text-gold transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-slate-100 dark:bg-navy/30 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
              {(['month', 'week', 'day'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors capitalize ${
                    viewMode === mode
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            {/* Add Event Button */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy px-4 py-2 rounded-lg font-black text-sm shadow-lg shadow-gold/20 transition-all active:scale-95">
                  <Plus className="h-5 w-5" />
                  <span>Add Event</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                  <DialogDescription>Add a new event to your calendar.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Enter event title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Event Type</Label>
                    <Select value={newEvent.type} onValueChange={(v) => setNewEvent({ ...newEvent, type: v as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class">Class</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location (Optional)</Label>
                    <Input
                      id="location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Room number or location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Add notes or details"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent}>Create Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Calendar Grid (Month View) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-dark flex-shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{day}</div>
            ))}
          </div>
          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-slate-200 dark:bg-slate-800 gap-px">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                onClick={() => day.date && setSelectedDate(day.date)}
                className={`bg-white dark:bg-navy-dark min-h-[120px] p-2 flex flex-col gap-1 transition-colors cursor-pointer ${
                  day.date ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                } ${day.isToday ? 'relative' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  {day.date && (
                    <>
                      {day.isToday ? (
                        <span className="flex items-center justify-center size-7 bg-gold text-navy rounded-full text-sm font-black shadow-md shadow-gold/30">
                          {day.date.getDate()}
                        </span>
                      ) : (
                        <span className={`text-sm font-medium ${day.date ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                          {day.date.getDate()}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {day.events.slice(0, 2).map((event) => {
                  const colors = getEventTypeColor(event.type);
                  return (
                    <div
                      key={event.id}
                      className={`${colors.bg} border-l-2 ${colors.border} ${colors.text} px-2 py-1 rounded-r text-[10px] font-bold truncate`}
                      title={event.title}
                    >
                      {event.startTime} {event.title}
                    </div>
                  );
                })}
                {day.events.length > 2 && (
                  <div className="text-xs text-slate-500 px-2">+{day.events.length - 2} more</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update the event details</DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Event description"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Event Type</Label>
                <Select
                  value={editingEvent.type}
                  onValueChange={(value: any) => setEditingEvent({ ...editingEvent, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start Time</Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={editingEvent.startTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">End Time</Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={editingEvent.endTime}
                    onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingEvent.location || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  placeholder="Room or location"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditEvent} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
          </TeacherLayout>
  );
}
