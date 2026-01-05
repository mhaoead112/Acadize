import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, Send, Search, Plus, Users, 
  Bell, Pin, Trash2, MoreVertical, Megaphone,
  Check, CheckCheck, Clock, Edit
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  authorRole: string;
  audience: 'all' | 'students' | 'teachers' | 'parents';
  isPinned: boolean;
  createdAt: string;
  readCount: number;
}

interface DirectMessage {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  profilePicture?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface Message {
  id: number;
  senderId: number | string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export default function AdminMessages() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DirectMessage | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    audience: "all"
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    try {
      // Fetch announcements
      const announcementsResponse = await fetch(apiEndpoint('/api/admin/announcements'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (announcementsResponse.ok) {
        const data = await announcementsResponse.json();
        setAnnouncements(data.announcements || []);
      } else {
        // Demo announcements
        setAnnouncements([
          {
            id: 1,
            title: "Winter Break Schedule",
            content: "School will be closed from December 23rd to January 2nd for winter break. Classes resume on January 3rd.",
            author: "Admin",
            authorRole: "admin",
            audience: "all",
            isPinned: true,
            createdAt: "2024-12-01",
            readCount: 245
          },
          {
            id: 2,
            title: "Final Exam Schedule Released",
            content: "The final exam schedule for all grades is now available. Please check your course pages for specific times and rooms.",
            author: "Academic Office",
            authorRole: "admin",
            audience: "all",
            isPinned: true,
            createdAt: "2024-11-28",
            readCount: 312
          },
          {
            id: 3,
            title: "Teacher Training Workshop",
            content: "All teachers are required to attend the professional development workshop on December 8th from 2-5 PM.",
            author: "HR Department",
            authorRole: "admin",
            audience: "teachers",
            isPinned: false,
            createdAt: "2024-11-25",
            readCount: 42
          },
          {
            id: 4,
            title: "Parent-Teacher Conference Reminder",
            content: "Don't forget to sign up for the parent-teacher conference on December 10th. Sign-up sheets are available in the office.",
            author: "Principal",
            authorRole: "admin",
            audience: "parents",
            isPinned: false,
            createdAt: "2024-11-20",
            readCount: 89
          }
        ]);
      }

      // Demo direct messages
      setDirectMessages([
        {
          id: 1,
          userId: 101,
          userName: "Sarah Anderson",
          userRole: "teacher",
          lastMessage: "I need to discuss the new curriculum changes",
          lastMessageTime: "2 hours ago",
          unreadCount: 2,
          isOnline: true
        },
        {
          id: 2,
          userId: 102,
          userName: "John Smith",
          userRole: "parent",
          lastMessage: "Thank you for the quick response!",
          lastMessageTime: "Yesterday",
          unreadCount: 0,
          isOnline: false
        },
        {
          id: 3,
          userId: 103,
          userName: "Emily Chen",
          userRole: "teacher",
          lastMessage: "The grade reports are ready for review",
          lastMessageTime: "2 days ago",
          unreadCount: 1,
          isOnline: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: number) => {
    // Demo messages
    setMessages([
      {
        id: 1,
        senderId: userId,
        senderName: selectedConversation?.userName || "User",
        content: "Hello, I wanted to discuss something important.",
        timestamp: "10:30 AM",
        isRead: true
      },
      {
        id: 2,
        senderId: user?.id || 0,
        senderName: "You",
        content: "Of course! What would you like to discuss?",
        timestamp: "10:32 AM",
        isRead: true
      },
      {
        id: 3,
        senderId: userId,
        senderName: selectedConversation?.userName || "User",
        content: "It's about the upcoming schedule changes. I have some concerns.",
        timestamp: "10:35 AM",
        isRead: true
      },
      {
        id: 4,
        senderId: user?.id || 0,
        senderName: "You",
        content: "I understand. Let's go through your concerns one by one.",
        timestamp: "10:38 AM",
        isRead: true
      }
    ]);
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: "Error",
        description: "Please fill in title and content",
        variant: "destructive"
      });
      return;
    }

    try {
      const announcement: Announcement = {
        id: Date.now(),
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        author: user?.fullName || "Admin",
        authorRole: "admin",
        audience: newAnnouncement.audience as any,
        isPinned: false,
        createdAt: new Date().toISOString().split('T')[0],
        readCount: 0
      };

      setAnnouncements([announcement, ...announcements]);
      setCreateAnnouncementOpen(false);
      setNewAnnouncement({ title: "", content: "", audience: "all" });
      toast({ title: "Success", description: "Announcement published" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAnnouncement = (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    setAnnouncements(announcements.filter(a => a.id !== id));
    toast({ title: "Success", description: "Announcement deleted" });
  };

  const handleTogglePin = (id: number) => {
    setAnnouncements(announcements.map(a => 
      a.id === id ? { ...a, isPinned: !a.isPinned } : a
    ));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const msg: Message = {
      id: Date.now(),
      senderId: user?.id || 0,
      senderName: "You",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    setMessages([...messages, msg]);
    setNewMessage("");

    // Update last message in conversation list
    setDirectMessages(directMessages.map(dm => 
      dm.userId === selectedConversation.userId
        ? { ...dm, lastMessage: newMessage, lastMessageTime: "Just now" }
        : dm
    ));
  };

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case 'all': return <Badge className="bg-purple-100 text-purple-800">All Users</Badge>;
      case 'students': return <Badge className="bg-blue-100 text-blue-800">Students</Badge>;
      case 'teachers': return <Badge className="bg-green-100 text-green-800">Teachers</Badge>;
      case 'parents': return <Badge className="bg-pink-100 text-pink-800">Parents</Badge>;
      default: return <Badge>{audience}</Badge>;
    }
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Messages & Announcements</h1>
            <p className="text-gray-600">Manage communications across the platform</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Direct Messages
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={createAnnouncementOpen} onOpenChange={setCreateAnnouncementOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                    <DialogDescription>Send an announcement to users on the platform.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        placeholder="Announcement title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="audience">Audience</Label>
                      <Select 
                        value={newAnnouncement.audience} 
                        onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, audience: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="teachers">Teachers Only</SelectItem>
                          <SelectItem value="parents">Parents Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        placeholder="Write your announcement..."
                        rows={5}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateAnnouncementOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateAnnouncement}>Publish</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {sortedAnnouncements.map((announcement) => (
                <Card key={announcement.id} className={announcement.isPinned ? 'border-purple-200 bg-purple-50/30' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {announcement.isPinned && (
                            <Pin className="h-4 w-4 text-purple-600" />
                          )}
                          <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                          {getAudienceBadge(announcement.audience)}
                        </div>
                        <p className="text-gray-600 mb-3">{announcement.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>By {announcement.author}</span>
                          <span>•</span>
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{announcement.readCount} views</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePin(announcement.id)}
                        >
                          <Pin className={`h-4 w-4 ${announcement.isPinned ? 'text-purple-600' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Direct Messages Tab */}
          <TabsContent value="messages">
            <Card className="h-[600px]">
              <div className="flex h-full">
                {/* Conversations List */}
                <div className="w-80 border-r flex flex-col">
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search conversations..." className="pl-10" />
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="divide-y">
                      {directMessages.map((dm) => (
                        <button
                          key={dm.id}
                          onClick={() => setSelectedConversation(dm)}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                            selectedConversation?.userId === dm.userId ? 'bg-purple-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={dm.profilePicture} />
                                <AvatarFallback className="bg-purple-100 text-purple-600">
                                  {dm.userName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              {dm.isOnline && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 truncate">{dm.userName}</h3>
                                <span className="text-xs text-gray-500">{dm.lastMessageTime}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs mb-1">{dm.userRole}</Badge>
                              <p className="text-sm text-gray-600 truncate">{dm.lastMessage}</p>
                            </div>
                            {dm.unreadCount > 0 && (
                              <Badge className="bg-purple-600 text-white h-5 w-5 flex items-center justify-center p-0 rounded-full">
                                {dm.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                  {selectedConversation ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={selectedConversation.profilePicture} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {selectedConversation.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-gray-900">{selectedConversation.userName}</h3>
                            <p className="text-sm text-gray-500 capitalize">
                              {selectedConversation.isOnline ? 'Online' : 'Offline'} • {selectedConversation.userRole}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                  message.senderId === user?.id
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p>{message.content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                  message.senderId === user?.id ? 'text-purple-200' : 'text-gray-500'
                                }`}>
                                  <span>{message.timestamp}</span>
                                  {message.senderId === user?.id && (
                                    message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="p-4 border-t bg-white">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!newMessage.trim()}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Conversation</h3>
                        <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
