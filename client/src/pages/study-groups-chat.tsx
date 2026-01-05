import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, Send, Smile, Paperclip, Phone, 
  MoreVertical, Hash, Lock, Users, X, Plus, MessageCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  conversationId?: string;
  isPrivate?: boolean;
  unreadCount?: number;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface DirectMessage {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  isOnline: boolean;
  conversationId?: string;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderProfilePicture?: string;
  content?: string;
  type: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

export default function StudyGroupsChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'channels'>('all');
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationType, setConversationType] = useState<'group' | 'dm'>('group');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isConnected, sendMessage: wsSendMessage } = useWebSocket((data) => {
    handleWebSocketMessage(data);
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    fetchStudyGroups();
    fetchDirectMessages();
  }, []);

  useEffect(() => {
    if (selectedConversation?.conversationId) {
      fetchMessages(selectedConversation.conversationId);
      wsSendMessage({
        type: 'join',
        conversationId: selectedConversation.conversationId
      });
    }

    return () => {
      if (selectedConversation?.conversationId) {
        wsSendMessage({
          type: 'leave',
          conversationId: selectedConversation.conversationId
        });
      }
    };
  }, [selectedConversation?.conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'new_message' && data.message?.conversationId === selectedConversation?.conversationId) {
      setMessages(prev => [...prev, data.message]);
    }
  };

  const fetchStudyGroups = async () => {
    try {
      const authHeaders = getAuthHeaders();
      if (!Object.keys(authHeaders).length) return;

      const response = await fetch(apiEndpoint("/api/study-groups"), {
        headers: authHeaders
      });
      if (response.ok) {
        const data = await response.json();
        setStudyGroups(data);
      }
    } catch (error) {
      console.error("Error fetching study groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDirectMessages = async () => {
    try {
      const authHeaders = getAuthHeaders();
      if (!Object.keys(authHeaders).length) return;

      const response = await fetch(apiEndpoint("/api/conversations/direct"), {
        headers: authHeaders
      });
      if (response.ok) {
        const data = await response.json();
        setDirectMessages(data);
      }
    } catch (error) {
      console.error("Error fetching DMs:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const authHeaders = getAuthHeaders();
      if (!Object.keys(authHeaders).length) return;

      const response = await fetch(apiEndpoint(`/api/conversations/${conversationId}/messages`), {
        headers: authHeaders
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation?.conversationId || isSending) return;

    setIsSending(true);
    try {
      const authHeaders = getAuthHeaders();
      if (!Object.keys(authHeaders).length) return;

      const response = await fetch(apiEndpoint(`/api/conversations/${selectedConversation.conversationId}/messages`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({
          type: "text",
          content: newMessage
        })
      });

      if (response.ok) {
        setNewMessage("");
        const message = await response.json();
        setMessages(prev => [...prev, message]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectConversation = (item: any, type: 'group' | 'dm') => {
    setSelectedConversation(item);
    setConversationType(type);
    setMessages([]);
  };

  const filteredGroups = studyGroups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directMessages.filter(dm => 
    dm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dm.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-80px)] bg-white">
        {/* Left Sidebar - Conversations List */}
        <div className="w-[270px] border-r border-gray-200 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900 mb-3">Chat</h1>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'direct'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'channels'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Channels
            </button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* Study Groups/Channels */}
              {(activeTab === 'all' || activeTab === 'channels') && (
                <div className="mb-4">
                  {filteredGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => selectConversation(group, 'group')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === group.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="relative">
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          {group.isPrivate ? (
                            <Lock className="h-5 w-5 text-gray-600" />
                          ) : (
                            <Hash className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        {group.unreadCount ? (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                            {group.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {group.name}
                          </p>
                          {group.lastMessageTime && (
                            <span className="text-xs text-gray-500 ml-2">
                              {formatTime(group.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {group.lastMessage && (
                          <p className="text-xs text-gray-600 truncate">
                            {group.lastMessage}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Direct Messages */}
              {(activeTab === 'all' || activeTab === 'direct') && (
                <div>
                  {filteredDMs.map(dm => (
                    <button
                      key={dm.id}
                      onClick={() => selectConversation(dm, 'dm')}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === dm.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={dm.profilePicture ? assetUrl(dm.profilePicture) : ''} 
                            alt={dm.fullName} 
                          />
                          <AvatarFallback className="bg-gray-200 text-gray-900">
                            {dm.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {dm.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                        {dm.unreadCount ? (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                            {dm.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {dm.fullName}
                          </p>
                          {dm.lastMessageTime && (
                            <span className="text-xs text-gray-500 ml-2">
                              {formatTime(dm.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {dm.lastMessage && (
                          <p className="text-xs text-gray-600 truncate">
                            {dm.lastMessage}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {filteredGroups.length === 0 && filteredDMs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Pinned Chat Section */}
          <div className="p-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 px-3 py-2">Pinned chat</p>
            {/* Add pinned chats here if needed */}
          </div>
        </div>

        {/* Main Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                {conversationType === 'group' ? (
                  <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    {selectedConversation.isPrivate ? (
                      <Lock className="h-5 w-5 text-gray-600" />
                    ) : (
                      <Hash className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gray-200 text-gray-900">
                      {selectedConversation.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {conversationType === 'group' ? selectedConversation.name : selectedConversation.fullName}
                  </h2>
                  <p className="text-xs text-gray-600">
                    {conversationType === 'group' 
                      ? `${selectedConversation.memberCount} members • ${selectedConversation.isOnline ? '5 online' : ''}`
                      : selectedConversation.isOnline ? 'Online' : 'Offline'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-5 w-5 text-gray-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Search className="h-5 w-5 text-gray-600" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                >
                  <MoreVertical className="h-5 w-5 text-gray-600" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

                  return (
                    <div key={message.id} className="flex gap-3">
                      {!isOwnMessage && (
                        <Avatar className={`h-8 w-8 flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                          <AvatarImage 
                            src={message.senderProfilePicture ? assetUrl(message.senderProfilePicture) : ''} 
                            alt={message.senderName} 
                          />
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                            {message.senderUsername.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {showAvatar && !isOwnMessage && (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {message.senderName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-900 break-words">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage}>
                <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-lg p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5 text-gray-600" />
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                  />

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                  >
                    <Smile className="h-5 w-5 text-gray-600" />
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="h-9 rounded-lg bg-pink-500 hover:bg-pink-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-24 w-24 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}

        {/* Right Sidebar - Info Panel */}
        {showRightPanel && selectedConversation && (
          <div className="w-[320px] border-l border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {conversationType === 'group' ? 'Photos & Videos' : 'Details'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowRightPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-160px)]">
              {conversationType === 'group' ? (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Photos & Videos <span className="text-gray-500">23</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Shared Links <span className="text-gray-500">3</span></p>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                            <Hash className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              Figma Component Best Practices
                            </p>
                            <p className="text-xs text-gray-500 truncate">www.figma.com</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Members <span className="text-gray-500">24</span></p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 px-2 py-1">Online</p>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gray-200 text-gray-900 text-xs">
                                JC
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Jane Cooper</p>
                            <Badge variant="secondary" className="text-xs">Mentor</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center mb-6">
                    <Avatar className="h-20 w-20 mx-auto mb-3">
                      <AvatarFallback className="bg-gray-200 text-gray-900 text-2xl">
                        {selectedConversation.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-gray-900">{selectedConversation.fullName}</h3>
                    <p className="text-sm text-gray-600">@{selectedConversation.username}</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
