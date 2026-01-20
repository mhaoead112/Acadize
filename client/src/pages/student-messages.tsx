import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from '@/lib/config';
import { 
  MessageCircle, Send, Search, Plus, User, 
  MoreVertical, Paperclip, Smile,
  Check, CheckCheck, Clock
} from "lucide-react";

interface Teacher {
  id: number;
  name: string;
  subject: string;
  profilePicture?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface Message {
  id: number;
  senderId: number | string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isSent: boolean;
}

interface Conversation {
  teacherId: number;
  teacherName: string;
  subject: string;
  messages: Message[];
}

export default function StudentMessages() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTeachers();
  }, [token]);

  useEffect(() => {
    if (selectedTeacher) {
      fetchMessages(selectedTeacher.id);
    }
  }, [selectedTeacher]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch(apiEndpoint('/api/student/teachers'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      } else {
        // Demo data
        setTeachers([
          {
            id: 1,
            name: "Mr. Anderson",
            subject: "Mathematics",
            lastMessage: "Great work on the last assignment!",
            lastMessageTime: "2 hours ago",
            unreadCount: 2,
            isOnline: true
          },
          {
            id: 2,
            name: "Ms. Roberts",
            subject: "English Literature",
            lastMessage: "Your essay was excellent.",
            lastMessageTime: "Yesterday",
            unreadCount: 0,
            isOnline: false
          },
          {
            id: 3,
            name: "Dr. Smith",
            subject: "Science",
            lastMessage: "Don't forget about the lab report.",
            lastMessageTime: "2 days ago",
            unreadCount: 1,
            isOnline: true
          },
          {
            id: 4,
            name: "Mr. Brown",
            subject: "History",
            lastMessage: "Check the reading assignment.",
            lastMessageTime: "1 week ago",
            unreadCount: 0,
            isOnline: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (teacherId: number) => {
    try {
      const response = await fetch(apiEndpoint(`/api/student/messages/${teacherId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        // Demo messages
        const demoMessages: Message[] = [
          {
            id: 1,
            senderId: teacherId,
            senderName: selectedTeacher?.name || "Teacher",
            content: "Hello! I wanted to discuss your progress in class.",
            timestamp: "10:30 AM",
            isRead: true,
            isSent: true
          },
          {
            id: 2,
            senderId: user?.id || 0,
            senderName: "You",
            content: "Hi! Yes, I'd like to know how I'm doing.",
            timestamp: "10:32 AM",
            isRead: true,
            isSent: true
          },
          {
            id: 3,
            senderId: teacherId,
            senderName: selectedTeacher?.name || "Teacher",
            content: "You've been very attentive in class and your homework submissions have been excellent. You scored 95% on the last quiz!",
            timestamp: "10:35 AM",
            isRead: true,
            isSent: true
          },
          {
            id: 4,
            senderId: user?.id || 0,
            senderName: "You",
            content: "Thank you! I've been working hard to improve my study habits.",
            timestamp: "10:38 AM",
            isRead: true,
            isSent: true
          },
          {
            id: 5,
            senderId: teacherId,
            senderName: selectedTeacher?.name || "Teacher",
            content: "It shows! Keep up the great work. Let me know if you have any questions about the upcoming project.",
            timestamp: "10:40 AM",
            isRead: false,
            isSent: true
          }
        ];
        setMessages(demoMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTeacher || sending) return;

    const messageContent = newMessage;
    setNewMessage(""); // Clear input immediately
    setSending(true);
    
    // Add message to local state optimistically
    const newMsg: Message = {
      id: Date.now(),
      senderId: user?.id || 0,
      senderName: "You",
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      isSent: true
    };
    setMessages(prevMessages => [...prevMessages, newMsg]);

    // Update last message in teacher list
    setTeachers(teachers.map(t => 
      t.id === selectedTeacher.id 
        ? { ...t, lastMessage: messageContent, lastMessageTime: "Just now" }
        : t
    ));

    try {
      const response = await fetch(apiEndpoint(`/api/student/messages/${selectedTeacher.id}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ content: messageContent })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      // Optionally remove the message from local state on error
      setMessages(prevMessages => prevMessages.filter(m => m.id !== newMsg.id));
    } finally {
      setSending(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-180px)]">
        <Card className="h-full bg-white dark:bg-navy-dark border-slate-200 dark:border-slate-800">
          <div className="flex h-full">
            {/* Teachers List Sidebar */}
            <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-navy-dark">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold mb-3 text-slate-900 dark:text-white">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`w-full p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        selectedTeacher?.id === teacher.id ? 'bg-primary/10 dark:bg-gold/10 border-l-2 border-primary dark:border-gold' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={teacher.profilePicture} />
                            <AvatarFallback className="bg-primary/20 dark:bg-gold/20 text-primary dark:text-gold">
                              {teacher.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {teacher.isOnline && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-slate-50 dark:border-navy-dark" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-900 dark:text-white truncate">{teacher.name}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{teacher.lastMessageTime}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{teacher.subject}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate mt-1">{teacher.lastMessage}</p>
                        </div>
                        {teacher.unreadCount ? (
                          <Badge className="bg-primary dark:bg-gold text-white dark:text-navy h-5 w-5 flex items-center justify-center p-0 rounded-full">
                            {teacher.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-navy-dark">
              {selectedTeacher ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedTeacher.profilePicture} />
                        <AvatarFallback className="bg-primary/20 dark:bg-gold/20 text-primary dark:text-gold">
                          {selectedTeacher.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">{selectedTeacher.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedTeacher.isOnline ? 'Online' : 'Offline'} • {selectedTeacher.subject}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      </Button>
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
                                ? 'bg-primary dark:bg-gold text-white dark:text-navy'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                            }`}
                          >
                            <p>{message.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                              message.senderId === user?.id ? 'text-white/70 dark:text-navy/70' : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              <span>{message.timestamp}</span>
                              {message.senderId === user?.id && (
                                message.isRead ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Paperclip className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500"
                      />
                      <Button variant="ghost" size="icon">
                        <Smile className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      </Button>
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!newMessage.trim() || sending}
                        className="bg-primary dark:bg-gold hover:bg-primary/90 dark:hover:bg-yellow-500 text-white dark:text-navy"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-white dark:bg-navy-dark">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Conversation</h3>
                    <p className="text-slate-600 dark:text-slate-400">Choose a teacher from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
