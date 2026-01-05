import { useQuery } from "@tanstack/react-query";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { 
  CalendarIcon, Clock, MapPin, Users, Search,
  Star, Calendar as CalendarLucide, Filter, Sparkles,
  BookOpen, GraduationCap, ChevronRight, Video, ArrowRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, isSameDay, isAfter, isBefore } from "date-fns";

interface PublicEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  courseId?: string;
  courseName?: string;
  isPublic: boolean;
  maxParticipants?: number;
  participants?: number;
  createdAt: string;
}

export default function Events() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: events, isLoading } = useQuery<PublicEvent[]>({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/events'));
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    }
  });

  const categories = [
    { id: "all", name: "All Events", icon: CalendarLucide, color: "from-blue-500 to-indigo-600" },
    { id: "event", name: "Events", icon: Star, color: "from-purple-500 to-pink-600" },
    { id: "class", name: "Classes", icon: BookOpen, color: "from-green-500 to-emerald-600" },
    { id: "meeting", name: "Meetings", icon: Users, color: "from-blue-500 to-cyan-600" },
    { id: "exam", name: "Exams", icon: GraduationCap, color: "from-red-500 to-orange-600" },
    { id: "deadline", name: "Deadlines", icon: Clock, color: "from-yellow-500 to-amber-600" },
  ];

  const getEventTypeStyle = (eventType: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      event: { bg: "bg-gradient-to-r from-purple-500 to-pink-500", text: "text-white", icon: Star },
      class: { bg: "bg-gradient-to-r from-green-500 to-emerald-500", text: "text-white", icon: BookOpen },
      meeting: { bg: "bg-gradient-to-r from-blue-500 to-cyan-500", text: "text-white", icon: Users },
      exam: { bg: "bg-gradient-to-r from-red-500 to-orange-500", text: "text-white", icon: GraduationCap },
      deadline: { bg: "bg-gradient-to-r from-yellow-500 to-amber-500", text: "text-white", icon: Clock },
      assignment: { bg: "bg-gradient-to-r from-indigo-500 to-violet-500", text: "text-white", icon: BookOpen },
    };
    return styles[eventType] || { bg: "bg-gradient-to-r from-gray-500 to-slate-500", text: "text-white", icon: CalendarLucide };
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = [...events];
    
    // Filter by category/type
    if (selectedCategory !== "all") {
      filtered = filtered.filter(event => event.eventType === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }
    
    // Filter by selected date in calendar view
    if (selectedDate && view === "calendar") {
      filtered = filtered.filter(event => 
        isSameDay(new Date(event.startTime), selectedDate)
      );
    }
    
    // Sort by start time (upcoming first)
    return filtered.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events, selectedCategory, selectedDate, view, searchQuery]);

  // Check if a date has events
  const hasEventsOnDate = (date: Date) => {
    return events?.some(event => isSameDay(new Date(event.startTime), date)) || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600 mx-auto"></div>
            <CalendarIcon className="h-8 w-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <CalendarIcon className="h-10 w-10" />
              </div>
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-4 py-1">
                <Sparkles className="h-4 w-4 mr-2" />
                Public Events
              </Badge>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Upcoming Events
            </h1>
            <p className="text-indigo-100 max-w-2xl mx-auto text-lg">
              Discover educational events, workshops, and activities happening at EduVerse. 
              Join our vibrant community of learners!
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search events by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 rounded-2xl border-0 bg-white/95 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 shadow-xl text-lg"
              />
            </div>
          </div>

          {/* View Toggle & Stats */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* View Toggle */}
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("list")}
                className={`rounded-lg px-6 ${view === "list" ? "bg-white text-indigo-600 shadow-md" : "text-white hover:bg-white/20"}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                List View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("calendar")}
                className={`rounded-lg px-6 ${view === "calendar" ? "bg-white text-indigo-600 shadow-md" : "text-white hover:bg-white/20"}`}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </Button>
            </div>
            
            {/* Event Stats */}
            <div className="flex gap-6 text-white/90">
              <div className="text-center">
                <div className="text-3xl font-bold">{events?.length || 0}</div>
                <div className="text-sm text-white/70">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {events?.filter(e => new Date(e.startTime) > new Date()).length || 0}
                </div>
                <div className="text-sm text-white/70">Upcoming</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <Button
                  key={category.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`rounded-full px-4 transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-r ${category.color} text-white shadow-lg scale-105` 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.name}
                  {category.id !== "all" && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {events?.filter(e => e.eventType === category.id).length || 0}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {view === "calendar" ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Events Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-xl border-0 w-full"
                    modifiers={{
                      eventDay: (date) => hasEventsOnDate(date)
                    }}
                    modifiersStyles={{
                      eventDay: { 
                        backgroundColor: '#6366f1', 
                        color: 'white',
                        borderRadius: '50%'
                      }
                    }}
                  />
                  
                  <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                    <p className="flex items-center gap-2 text-sm text-indigo-700">
                      <div className="w-4 h-4 rounded-full bg-indigo-500"></div>
                      Days with scheduled events
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Day Events */}
            <div>
              <Card className="shadow-xl border-0 sticky top-24">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <CardTitle className="text-lg">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a Date"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No events scheduled for this day</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredEvents.map((event) => {
                        const typeStyle = getEventTypeStyle(event.eventType);
                        const TypeIcon = typeStyle.icon;
                        return (
                          <div 
                            key={event.id}
                            className="p-4 border rounded-xl hover:shadow-md transition-all duration-300 bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${typeStyle.bg}`}>
                                <TypeIcon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {event.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(event.startTime), "h:mm a")}
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalendarIcon className="h-12 w-12 text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No Events Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchQuery 
                    ? "No events match your search criteria. Try adjusting your filters."
                    : "No public events are currently scheduled. Check back later!"
                  }
                </p>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => {
                  const typeStyle = getEventTypeStyle(event.eventType);
                  const TypeIcon = typeStyle.icon;
                  const isPast = new Date(event.endTime) < new Date();
                  
                  return (
                    <Card 
                      key={event.id}
                      className={`group hover:shadow-2xl transition-all duration-500 border-0 overflow-hidden ${
                        isPast ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Event Type Header */}
                      <div className={`${typeStyle.bg} p-4 text-white`}>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                          </Badge>
                          {isPast && (
                            <Badge className="bg-black/20 text-white border-0">
                              Past Event
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold mt-3 line-clamp-2 group-hover:line-clamp-none transition-all">
                          {event.title}
                        </h3>
                      </div>
                      
                      <CardContent className="p-5">
                        {/* Date & Time */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-3 text-gray-600">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <CalendarIcon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {format(new Date(event.startTime), "EEEE, MMMM d, yyyy")}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                              </div>
                            </div>
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-3 text-gray-600">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <MapPin className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-sm">{event.location}</span>
                            </div>
                          )}
                          
                          {event.meetingLink && (
                            <div className="flex items-center gap-3 text-gray-600">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Video className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm text-blue-600">Online Event</span>
                            </div>
                          )}
                          
                          {event.maxParticipants && (
                            <div className="flex items-center gap-3 text-gray-600">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                              <span className="text-sm">
                                {event.participants || 0} / {event.maxParticipants} participants
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Description */}
                        {event.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                            {event.description}
                          </p>
                        )}
                        
                        {/* Course Badge */}
                        {event.courseName && (
                          <Badge variant="outline" className="mb-4 text-indigo-600 border-indigo-200 bg-indigo-50">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {event.courseName}
                          </Badge>
                        )}
                        
                        {/* Action Button */}
                        <Button 
                          className={`w-full group/btn ${typeStyle.bg} text-white border-0 hover:opacity-90`}
                          disabled={isPast}
                        >
                          {isPast ? "Event Ended" : "View Details"}
                          {!isPast && <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Footer CTA */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-12 mt-12">
        <div className="container mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Want to Create Your Own Events?</h2>
          <p className="text-indigo-100 mb-6 max-w-xl mx-auto">
            Join EduVerse as a teacher or administrator to create and manage educational events for our community.
          </p>
          <Button className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-6 text-lg rounded-xl shadow-xl">
            <GraduationCap className="h-5 w-5 mr-2" />
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  );
}
