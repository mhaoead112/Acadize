import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, Send, Paperclip, Search, Loader2,
  MessageCircle, Plus, Check, CheckCheck, MoreVertical,
  UserX, Flag
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

interface DMConversation {
  conversationId: string;
  otherUser: User;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  type: 'text' | 'file';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  deliveredAt?: string;
}

export default function DirectMessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showNewDM, setShowNewDM] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, sendMessage: wsSendMessage } = useWebSocket((data) => {
    handleWebSocketMessage(data);
  });

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    fetchConversations();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversationId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(apiEndpoint("/api/study-groups"), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error("Failed to fetch conversations");
      
      const allConversations = await response.json();
      const dms = allConversations
        .filter((conv: any) => conv.type === 'direct')
        .map((conv: any) => ({
          ...conv,
          conversationId: conv.conversationId || conv.id // Normalize: use conversationId if exists, otherwise use id
        }));
      setConversations(dms);
      
      // Fetch online status for all users in conversations
      const userIds = dms.map((dm: any) => dm.otherUser?.id).filter(Boolean);
      if (userIds.length > 0) {
        fetchOnlineStatus(userIds);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/users"), {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error("Failed to fetch users");
      
      const users = await response.json();
      const otherUsers = users.filter((u: User) => u.id !== user?.id);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchOnlineStatus = async (userIds: string[]) => {
    try {
      const statuses = await Promise.all(
        userIds.map(userId =>
          fetch(apiEndpoint(`/api/study-groups/presence/${userId}`), {
            headers: getAuthHeaders()
          }).then(r => r.json()).catch(() => null)
        )
      );
      
      const online = new Set(
        statuses
          .filter(s => s && s.status === 'online')
          .map(s => s.userId)
      );
      setOnlineUsers(online);
    } catch (error) {
      console.error("Error fetching online status:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${conversationId}/messages`),
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedConversation.conversationId}/messages`),
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "text",
            content: newMessage
          })
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      const sentMessage = await response.json();
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage("");

      // Send via WebSocket for real-time delivery
      if (isConnected) {
        wsSendMessage({
          type: "message",
          conversationId: selectedConversation.conversationId,
          message: sentMessage
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleStartDM = async (targetUserId: string) => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/direct/${targetUserId}`),
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error("Failed to create DM");

      const data = await response.json();
      
      // Find the user
      const targetUser = allUsers.find(u => u.id === targetUserId);
      if (targetUser) {
        const newConv: DMConversation = {
          conversationId: data.conversationId || data.id, // Normalize: use conversationId if exists, otherwise use id
          otherUser: targetUser
        };
        setSelectedConversation(newConv);
        setShowNewDM(false);
        
        // Refresh conversations list
        fetchConversations();
      }
    } catch (error) {
      console.error("Error starting DM:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const response = await fetch(apiEndpoint('/api/notifications/block'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blockedUserId: userId })
      });

      if (!response.ok) throw new Error("Failed to block user");

      toast({
        title: "Success",
        description: "User blocked"
      });
      setShowBlockReport(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to block user",
        variant: "destructive"
      });
    }
  };

  const handleReportUser = async (userId: string, reason: string) => {
    try {
      const response = await fetch(apiEndpoint('/api/notifications/report'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportedUserId: userId, reason })
      });

      if (!response.ok) throw new Error("Failed to report user");

      toast({
        title: "Success",
        description: "User reported"
      });
      setShowBlockReport(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to report user",
        variant: "destructive"
      });
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'new_message':
        if (data.conversationId === selectedConversation?.conversationId) {
          setMessages(prev => [...prev, data.message]);
        } else {
          fetchConversations(); // Refresh to show new message indicator
        }
        break;
      case 'message_delivered':
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId ? { ...msg, deliveredAt: data.deliveredAt } : msg
        ));
        break;
      case 'presence_update':
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (data.status === 'online') {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
        break;
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Conversations List Sidebar */}
        <div className="w-96 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              <Button 
                size="sm" 
                onClick={() => setShowNewDM(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <MessageCircle className="h-16 w-16 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm text-gray-400 mt-1">Start a new conversation to begin chatting</p>
              </div>
            ) : (
              <div>
                {filteredConversations.map((conv) => {
                  const isOnline = onlineUsers.has(conv.otherUser.id);
                  const isActive = selectedConversation?.conversationId === conv.conversationId;
                  
                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => setSelectedConversation(conv)}
                      className={`
                        w-full p-4 flex items-start gap-3 border-b border-gray-100 transition-all
                        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {conv.otherUser.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {conv.otherUser.fullName}
                          </p>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          @{conv.otherUser.username}
                        </p>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {conv.lastMessage}
                          </p>
                        )}
                      </div>
                      
                      {conv.unreadCount && conv.unreadCount > 0 && (
                        <div className="flex-shrink-0 h-5 min-w-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center px-1.5">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      {selectedConversation.otherUser.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.has(selectedConversation.otherUser.id) && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedConversation.otherUser.fullName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {onlineUsers.has(selectedConversation.otherUser.id) ? (
                      <span className="text-green-600">Online</span>
                    ) : (
                      <span>Offline</span>
                    )}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedUserForAction(selectedConversation.otherUser.id);
                  setShowBlockReport(true);
                }}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[70%] rounded-lg px-4 py-2
                          ${isOwn 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-gray-900 border border-gray-200'
                          }
                        `}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {message.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOwn && (
                            message.deliveredAt ? (
                              <CheckCheck className="h-3 w-3 text-blue-100" />
                            ) : (
                              <Check className="h-3 w-3 text-blue-100" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-24 w-24 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm text-gray-400 mt-1">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* New DM Dialog */}
      <Dialog open={showNewDM} onOpenChange={setShowNewDM}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start a Conversation</DialogTitle>
            <DialogDescription>
              Choose a user to start a direct message conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {allUsers
                  .filter(u => 
                    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((targetUser) => {
                    const isOnline = onlineUsers.has(targetUser.id);
                    return (
                      <button
                        key={targetUser.id}
                        onClick={() => handleStartDM(targetUser.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-500 text-white">
                              {targetUser.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{targetUser.fullName}</p>
                          <p className="text-sm text-gray-500">@{targetUser.username}</p>
                        </div>
                        {isOnline && (
                          <span className="text-xs text-green-600">Online</span>
                        )}
                      </button>
                    );
                  })}
                
                {allUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No users available</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block/Report Modal */}
      <Dialog open={showBlockReport} onOpenChange={setShowBlockReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Actions</DialogTitle>
            <DialogDescription>
              Block or report this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Blocking</strong> will prevent this user from sending you messages.
              </p>
            </div>
            
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => {
                if (selectedUserForAction) {
                  handleBlockUser(selectedUserForAction);
                }
              }}
            >
              <UserX className="h-4 w-4" />
              Block User
            </Button>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Report User</label>
              <Textarea
                placeholder="Describe why you're reporting this user..."
                className="min-h-24"
                id="report-reason"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  if (selectedUserForAction) {
                    const reason = (document.getElementById('report-reason') as HTMLTextAreaElement)?.value;
                    if (reason) {
                      handleReportUser(selectedUserForAction, reason);
                    }
                  }
                }}
              >
                <Flag className="h-4 w-4" />
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
