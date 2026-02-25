import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from "@/components/StudentLayout";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint, assetUrl } from '@/lib/config';
 import { ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  Bell,
  Plus,
  Filter,
  Download,
  Share2
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: 'assignment' | 'exam' | 'class' | 'event' | 'deadline';
  location?: string;
  meetingLink?: string;
  courseId?: string;
  courseName?: string;
  color: string;
  participants?: number;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;
const FILTER_KEYS = ['assignmentsFilter', 'classesFilter', 'examsFilter', 'eventsFilter'] as const;

export default function StudentCalendar() {
  const { t } = useTranslation('dashboard');
  const { toast } = useToast();
  const { token, getAuthHeaders } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([...FILTER_KEYS]);
  const DAYS = useMemo(() => DAY_KEYS.map(k => t(k)), [t]);
  const MONTHS = useMemo(() => MONTH_KEYS.map(k => t(k)), [t]);

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [currentDate, token]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // Fetch assignments
      const assignmentsRes = await fetch(apiEndpoint('/api/assignments/student'), {
        headers: authHeaders,
      });

      const tempEvents: CalendarEvent[] = [];

      if (assignmentsRes.ok) {
        const assignments = await assignmentsRes.json();
        assignments.forEach((assignment: any) => {
          if (assignment.dueDate) {
            const dueDate = new Date(assignment.dueDate);
            tempEvents.push({
              id: assignment.id,
              title: assignment.title,
              description: assignment.description,
              startTime: dueDate,
              endTime: dueDate,
              type: assignment.title.toLowerCase().includes('exam') || assignment.title.toLowerCase().includes('test') ? 'exam' : 'assignment',
              courseName: assignment.courseTitle,
              courseId: assignment.courseId,
              color: getEventColor('assignment'),
            });
          }
        });
      }

      // Fetch calendar events
      const eventsRes = await fetch(apiEndpoint('/api/events'), {
        headers: authHeaders,
      });

      if (eventsRes.ok) {
        const calendarEvents = await eventsRes.json();
        calendarEvents.forEach((event: any) => {
          tempEvents.push({
            id: event.id,
            title: event.title,
            description: event.description,
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            type: event.eventType,
            location: event.location,
            meetingLink: event.meetingLink,
            courseName: event.courseName,
            courseId: event.courseId,
            color: getEventColor(event.eventType),
            participants: event.participants,
          });
        });
      }

      setEvents(tempEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadCalendarEvents'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'bg-blue-500';
      case 'exam':
        return 'bg-red-500';
      case 'class':
        return 'bg-green-500';
      case 'event':
        return 'bg-purple-500';
      case 'deadline':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      const dateMatches = eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
      
      // Apply filters
      if (!dateMatches) return false;
      
      if (activeFilters.includes('assignmentsFilter') && (event.type === 'assignment' || event.type === 'deadline')) return true;
      if (activeFilters.includes('classesFilter') && event.type === 'class') return true;
      if (activeFilters.includes('examsFilter') && event.type === 'exam') return true;
      if (activeFilters.includes('eventsFilter') && event.type === 'event') return true;
      
      return false;
    });
  }, [events, activeFilters]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[120px] bg-gray-50 border border-gray-200"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`min-h-[120px] border p-2 cursor-pointer transition-all ${
            isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
          } ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
        >
          <div className={`text-sm font-semibold mb-2 ${
            isToday ? 'text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'
          }`}>
            {day}
            {isToday && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {t('today')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(event);
                  setShowEventDialog(true);
                }}
                className={`text-xs p-1.5 rounded ${event.color} text-white truncate hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center gap-1">
                  {event.type === 'assignment' && <FileText className="w-3 h-3" />}
                  {event.type === 'exam' && <Clock className="w-3 h-3" />}
                  {event.type === 'event' && <CalendarIcon className="w-3 h-3" />}
                  <span className="truncate font-medium">{event.title}</span>
                </div>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-600 font-medium pl-1">
                {t('moreEvents', { count: dayEvents.length - 3 })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  // Get the week dates for the current week
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day);
    }
    return weekDates;
  };

  // Navigate week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Navigate day
  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
    // Only update currentDate if we've moved to a different month
    if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(newDate);
    }
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full">
        {/* Week header */}
        <div className="grid grid-cols-8 gap-0 border-b border-slate-200 dark:border-white/10 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="p-2 text-xs text-slate-500 dark:text-slate-400 font-medium border-r border-slate-200 dark:border-white/10"></div>
          {weekDates.map((date, idx) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div 
                key={idx} 
                className={`p-3 text-center border-r border-slate-200 dark:border-white/10 ${isToday ? 'bg-blue-50 dark:bg-blue-500/20' : ''}`}
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{DAYS[date.getDay()].slice(0, 3)}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-0 border-b border-slate-100 dark:border-white/5">
              <div className="p-2 text-xs text-slate-400 dark:text-slate-500 font-medium border-r border-slate-200 dark:border-white/10 text-right pr-3">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDates.map((date, dayIdx) => {
                const dayEvents = getEventsForDate(date).filter(event => {
                  const eventHour = new Date(event.startTime).getHours();
                  return eventHour === hour;
                });
                return (
                  <div 
                    key={dayIdx} 
                    className="min-h-[60px] border-r border-slate-200 dark:border-white/10 p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer relative"
                    onClick={() => setSelectedDate(date)}
                  >
                    {dayEvents.map((event, eventIdx) => (
                      <div
                        key={eventIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setShowEventDialog(true);
                        }}
                        className={`text-xs p-1 rounded ${event.color} text-white truncate mb-1 hover:opacity-80 cursor-pointer`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const isToday = selectedDate.toDateString() === new Date().toDateString();

    return (
      <div className="flex flex-col h-full">
        {/* Day header */}
        <div className={`p-4 text-center border-b border-slate-200 dark:border-white/10 ${isToday ? 'bg-blue-50 dark:bg-blue-500/20' : ''}`}>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{DAYS[selectedDate.getDay()]}</div>
          <div className={`text-3xl font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
            {selectedDate.getDate()}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </div>
        </div>

        {/* All day events */}
        {dayEvents.filter(e => {
          const start = new Date(e.startTime);
          const end = new Date(e.endTime);
          return end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000;
        }).length > 0 && (
          <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">All Day</div>
            <div className="space-y-1">
              {dayEvents.filter(e => {
                const start = new Date(e.startTime);
                const end = new Date(e.endTime);
                return end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000;
              }).map((event, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventDialog(true);
                  }}
                  className={`text-sm p-2 rounded ${event.color} text-white cursor-pointer hover:opacity-80`}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly schedule */}
        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = new Date(event.startTime).getHours();
              return eventHour === hour;
            });
            const currentHour = new Date().getHours();
            const isCurrentHour = isToday && hour === currentHour;

            return (
              <div 
                key={hour} 
                className={`flex border-b border-slate-100 dark:border-white/5 ${isCurrentHour ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
              >
                <div className="w-20 p-3 text-xs text-slate-400 dark:text-slate-500 font-medium text-right border-r border-slate-200 dark:border-white/10">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 min-h-[60px] p-2 relative">
                  {hourEvents.map((event, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDialog(true);
                      }}
                      className={`p-3 rounded-lg ${event.color} text-white mb-2 cursor-pointer hover:opacity-90 transition-opacity shadow-sm`}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs opacity-90 flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                      </div>
                      {event.location && (
                        <div className="text-xs opacity-90 flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  return (
    <StudentLayout>
      {/* Header */}
      <header className="w-full px-8 py-6 flex flex-wrap items-end justify-between gap-4 shrink-0 bg-white dark:bg-background border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-1">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">{t('schedule')}</h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarIcon className="w-5 h-5" />
            <p className="text-base font-normal">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 p-1">
            {(['month', 'week', 'day'] as const).map((viewKey) => (
              <button
                key={viewKey}
                onClick={() => setView(viewKey)}
                className={`h-full px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  view === viewKey
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(viewKey === 'month' ? 'monthView' : viewKey === 'week' ? 'weekView' : 'dayView')}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-background">
        {/* Filters and Navigation */}
        <div className="px-8 py-4 flex items-center justify-between shrink-0 bg-white dark:bg-background border-b border-slate-200 dark:border-white/10">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(['assignmentsFilter', 'classesFilter', 'examsFilter'] as const).map((filterKey) => (
              <button
                key={filterKey}
                className="flex h-8 items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 px-4 transition-colors text-slate-600 dark:text-slate-300"
              >
                <span className="text-sm font-medium">{t(filterKey)}</span>
              </button>
            ))}
            <button className="flex h-8 items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 px-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white transition-colors">
              <span className="text-sm font-medium">{t('clearAll')}</span>
            </button>
          </div>
          <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1">
            <button
              onClick={() => {
                if (view === 'month') navigateMonth('prev');
                else if (view === 'week') navigateWeek('prev');
                else navigateDay('prev');
              }}
              className="size-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(new Date());
              }}
              className="text-sm font-bold text-slate-800 dark:text-white min-w-[60px] text-center hover:text-slate-900 dark:hover:text-slate-200"
            >
              {t('today')}
            </button>
            <button
              onClick={() => {
                if (view === 'month') navigateMonth('next');
                else if (view === 'week') navigateWeek('next');
                else navigateDay('next');
              }}
              className="size-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-8 py-8 overflow-hidden flex gap-6">
          {/* Calendar */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col shadow-lg overflow-hidden border border-slate-200 dark:border-white/10">
            {view === 'month' && (
              <div>
                {/* Day Headers */}
                <div className="grid grid-cols-7 mb-4 border-b border-slate-100 dark:border-white/10 pb-2">
                  {DAYS.map(day => (
                    <div key={day} className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider text-center">
                      {day.slice(0, 3)}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 grid-rows-5 h-full gap-px bg-slate-200 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {Array.from({ length: 35 }).map((_, idx) => {
                    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
                    let day: number | null = null;
                    let isCurrentMonth = true;

                    if (idx < startingDayOfWeek) {
                      day = null;
                      isCurrentMonth = false;
                    } else if (idx - startingDayOfWeek < daysInMonth) {
                      day = idx - startingDayOfWeek + 1;
                    } else {
                      day = null;
                      isCurrentMonth = false;
                    }

                    if (!day) {
                      return (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-800/50 p-2 min-h-[100px] opacity-40"
                        />
                      );
                    }

                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dayEvents = getEventsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = date.toDateString() === selectedDate.toDateString();

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(date)}
                        className={`bg-white dark:bg-slate-800 p-2 flex flex-col gap-1 min-h-[100px] transition-colors cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/80 ${
                          isToday ? 'bg-blue-50 dark:bg-blue-500/20 ring-1 ring-inset ring-blue-400 dark:ring-blue-500/50' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500 dark:ring-[#FFD700]' : ''}`}
                      >
                        {isToday ? (
                          <span className="flex items-center justify-center size-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                            {day}
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-white text-sm font-medium">{day}</span>
                        )}

                        {dayEvents.slice(0, 2).map((event, eventIdx) => (
                          <div
                            key={eventIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowEventDialog(true);
                            }}
                            className={`px-2 py-1 rounded border text-xs truncate font-medium ${event.color} text-white cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-1">
                            {t('moreEvents', { count: dayEvents.length - 2 })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </div>

          {/* Right Sidebar */}
          <div className="w-96 flex flex-col gap-6 shrink-0 overflow-y-auto pb-4">
            {/* Selected Date Info */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Selected</p>
                  <h2 className="text-slate-900 dark:text-white text-2xl font-bold">
                    {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </h2>
                </div>
                <div className="bg-blue-500/10 dark:bg-[#FFD700]/20 rounded-full p-2">
                  <CalendarIcon className="text-blue-600 dark:text-[#FFD700] w-6 h-6" />
                </div>
              </div>

              {/* Events for selected date */}
              <div className="flex flex-col gap-3 mt-2">
                {getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDialog(true);
                      }}
                      className="flex gap-3 items-start p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-[#FFD700] transition-colors cursor-pointer group"
                    >
                      <div className="h-full flex flex-col items-center gap-1 pt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${event.color} shadow-lg`}></div>
                        <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-400/30 dark:group-hover:bg-[#FFD700]/30 rounded-full transition-colors"></div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-slate-800 dark:text-white font-semibold text-sm">{event.title}</h3>
                        {event.courseName && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs">{event.courseName}</p>
                        )}
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                          {formatTime(new Date(event.startTime))} - {formatTime(new Date(event.endTime))}
                        </p>
                        {event.location && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{event.location}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex gap-3 items-center p-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-medium">Add to this day</span>
                  </div>
                )}
              </div>
            </div>

            {/* Up Next */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold">Up Next</h3>
                <a href="#" className="text-blue-600 dark:text-[#FFD700] text-xs font-bold hover:underline">
                  View All
                </a>
              </div>
              <div className="flex flex-col gap-2">
                {events
                  .filter(e => new Date(e.startTime) >= new Date())
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .slice(0, 3)
                  .map((event) => (
                    <div
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDialog(true);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-[#FFD700] transition-colors shadow-sm cursor-pointer"
                    >
                      <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl w-12 h-12 shrink-0">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
                          {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-slate-900 dark:text-white text-lg font-bold leading-none">
                          {new Date(event.startTime).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-800 dark:text-white font-semibold text-sm truncate">{event.title}</h4>
                        {event.courseName && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{event.courseName}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-blue-600 dark:text-[#FFD700]">
                        {event.type === 'assignment' && <FileText className="w-5 h-5" />}
                        {event.type === 'exam' && <Clock className="w-5 h-5" />}
                        {event.type === 'event' && <CalendarIcon className="w-5 h-5" />}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Event Details Dialog */}
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-luxury">
                {selectedEvent?.title}
              </DialogTitle>
              <DialogDescription>
                {formatDate(new Date(selectedEvent?.startTime || new Date()))}
              </DialogDescription>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={selectedEvent.color}>
                    {selectedEvent.type}
                  </Badge>
                  {selectedEvent.courseName && (
                    <Badge variant="outline">{selectedEvent.courseName}</Badge>
                  )}
                </div>

                {selectedEvent.description && (
                  <p className="text-gray-700">{selectedEvent.description}</p>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">
                        {formatTime(new Date(selectedEvent.startTime))} - {formatTime(new Date(selectedEvent.endTime))}
                      </div>
                      <div className="text-gray-600">
                        {formatDate(new Date(selectedEvent.startTime))}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}

                  {selectedEvent.meetingLink && (
                    <div className="flex items-center gap-3 text-sm">
                      <Video className="w-5 h-5 text-gray-500" />
                      <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Join Meeting
                      </a>
                    </div>
                  )}

                  {selectedEvent.participants && (
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-5 h-5 text-gray-500" />
                      <span>{selectedEvent.participants} participants</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => {
                      // Create Google Calendar URL
                      const startDate = new Date(selectedEvent.startTime);
                      const endDate = new Date(selectedEvent.endTime);
                      
                      // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
                      const formatGoogleDate = (date: Date) => {
                        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                      };
                      
                      const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
                      googleCalUrl.searchParams.set('action', 'TEMPLATE');
                      googleCalUrl.searchParams.set('text', selectedEvent.title);
                      googleCalUrl.searchParams.set('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
                      if (selectedEvent.description) {
                        googleCalUrl.searchParams.set('details', selectedEvent.description);
                      }
                      if (selectedEvent.location) {
                        googleCalUrl.searchParams.set('location', selectedEvent.location);
                      }
                      
                      window.open(googleCalUrl.toString(), '_blank');
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    Add to Google Calendar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={async () => {
                      // Format event details as text
                      const startDate = new Date(selectedEvent.startTime);
                      const endDate = new Date(selectedEvent.endTime);
                      
                      const eventText = `📅 ${selectedEvent.title}

🕐 ${formatTime(startDate)} - ${formatTime(endDate)}
📆 ${formatDate(startDate)}
${selectedEvent.courseName ? `📚 Course: ${selectedEvent.courseName}` : ''}
${selectedEvent.location ? `📍 Location: ${selectedEvent.location}` : ''}
${selectedEvent.description ? `\n📝 ${selectedEvent.description}` : ''}
${selectedEvent.meetingLink ? `\n🔗 Meeting: ${selectedEvent.meetingLink}` : ''}

---
Shared from EduVerse`;

                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: selectedEvent.title,
                            text: eventText,
                          });
                        } else {
                          // Fallback: copy to clipboard
                          await navigator.clipboard.writeText(eventText);
                          toast({
                            title: 'Copied to clipboard',
                            description: 'Event details have been copied to your clipboard',
                          });
                        }
                      } catch (err) {
                        // User cancelled or error
                        console.error('Share failed:', err);
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
