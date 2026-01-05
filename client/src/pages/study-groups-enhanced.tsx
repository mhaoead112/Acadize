import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { 
  Users, Plus, Send, Paperclip, Image as ImageIcon, 
  Video, File, Search, MoreVertical, UserPlus, Loader2,
  MessageCircle, X, Info, Trash2, Crown, UserMinus, Check, CheckCheck,
  Settings, Ban, Shield, ArrowLeft, Clock
} from "lucide-react";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId?: string;
  memberCount: number;
  userRole: string;
  conversationId?: string;
  createdBy: string;
  members?: GroupMember[];
}

interface GroupMember {
  id: string;
  username: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
  groupRole: 'admin' | 'member';
  joinedAt: string;
  isMuted?: boolean;
  isRestricted?: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  type: 'text' | 'file' | 'image' | 'video';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  createdAt: string;
  deliveredAt?: string;
  readReceipts?: ReadReceipt[];
}

interface ReadReceipt {
  userId: string;
  username: string;
  fullName: string;
  readAt: string;
}

export default function StudyGroupsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket((data) => {
    handleWebSocketMessage(data);
  });

  const getAuthHeaders = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup?.conversationId) {
      fetchMessages(selectedGroup.conversationId);
      fetchGroupDetails(selectedGroup.id);
      
      // Join conversation via WebSocket
      wsSendMessage({
        type: 'join',
        conversationId: selectedGroup.conversationId
      });

      // Mark as read
      wsSendMessage({
        type: 'read',
        conversationId: selectedGroup.conversationId
      });
    }

    return () => {
      if (selectedGroup?.conversationId) {
        wsSendMessage({
          type: 'leave',
          conversationId: selectedGroup.conversationId
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'new_message':
        if (data.message && data.message.conversationId === selectedGroup?.conversationId) {
          setMessages(prev => [...prev, data.message]);
          // Auto mark as read
          setTimeout(() => {
            wsSendMessage({
              type: 'read',
              conversationId: selectedGroup?.conversationId
            });
          }, 500);
        }
        break;
      case 'typing':
        if (data.userId !== user?.id) {
          setTypingUsers(prev => new Set(prev).add(data.username));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers(prev => {
              const updated = new Set(prev);
              updated.delete(data.username);
              return updated;
            });
          }, 3000);
        }
        break;
      case 'messages_read':
        // Update read receipts
        fetchReadReceipts(selectedGroup?.conversationId!);
        break;
      case 'user_joined':
      case 'presence_update':
        if (data.status === 'online') {
          setOnlineUsers(prev => new Set(prev).add(data.userId));
        }
        break;
      case 'user_left':
      case 'user_offline':
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(data.userId);
          return updated;
        });
        break;
    }
  };

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(apiEndpoint("/api/study-groups"), {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error("Failed to fetch groups");

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error",
        description: "Failed to load study groups",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const response = await fetch(apiEndpoint(`/api/study-groups/${groupId}`), {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error("Failed to fetch group details");

      const data = await response.json();
      setSelectedGroup(prev => prev ? { ...prev, ...data } : data);
    } catch (error) {
      console.error("Error fetching group details:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/conversations/${conversationId}/messages`),
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setMessages(data);
      fetchReadReceipts(conversationId);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const fetchReadReceipts = async (conversationId: string) => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/conversations/${conversationId}/read-receipts`),
        { headers: getAuthHeaders() }
      );

      if (!response.ok) return;

      const data = await response.json();
      const receiptsMap = new Map<string, ReadReceipt[]>();
      
      data.forEach((receipt: any) => {
        if (!receiptsMap.has(receipt.messageId)) {
          receiptsMap.set(receipt.messageId, []);
        }
        receiptsMap.get(receipt.messageId)!.push({
          userId: receipt.userId,
          username: receipt.username,
          fullName: receipt.fullName,
          readAt: receipt.readAt
        });
      });

      setReadReceipts(receiptsMap);
    } catch (error) {
      console.error("Error fetching read receipts:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup?.conversationId || isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage("");

    try {
      wsSendMessage({
        type: 'message',
        conversationId: selectedGroup.conversationId,
        content: messageContent,
        messageType: 'text'
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (selectedGroup?.conversationId) {
      wsSendMessage({
        type: 'typing',
        conversationId: selectedGroup.conversationId
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup?.conversationId) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(apiEndpoint("/api/study-groups/upload"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) throw new Error("Failed to upload file");

      const data = await response.json();

      let messageType: 'file' | 'image' | 'video' = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';
      if (file.type.startsWith('video/')) messageType = 'video';

      wsSendMessage({
        type: 'message',
        conversationId: selectedGroup.conversationId,
        messageType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        content: `Shared a ${messageType}`
      });

      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateGroup = async (formData: FormData) => {
    setIsCreatingGroup(true);

    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;

      const response = await fetch(apiEndpoint("/api/study-groups"), {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) throw new Error("Failed to create group");

      await fetchGroups();
      setShowCreateDialog(false);

      toast({
        title: "Success",
        description: "Study group created successfully"
      });
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create study group",
        variant: "destructive"
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/members/${memberId}`),
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error("Failed to remove member");

      await fetchGroupDetails(selectedGroup.id);
      toast({
        title: "Success",
        description: "Member removed successfully"
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive"
      });
    }
  };

  const handleModerateMember = async (memberId: string, action: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/moderate`),
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetUserId: memberId, action })
        }
      );

      if (!response.ok) throw new Error("Failed to moderate member");

      await fetchGroupDetails(selectedGroup.id);
      toast({
        title: "Success",
        description: `Member ${action}d successfully`
      });
    } catch (error) {
      console.error("Error moderating member:", error);
      toast({
        title: "Error",
        description: "Failed to moderate member",
        variant: "destructive"
      });
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/members/${memberId}/promote`),
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error("Failed to promote member");

      await fetchGroupDetails(selectedGroup.id);
      toast({
        title: "Success",
        description: "Member promoted to admin"
      });
    } catch (error) {
      console.error("Error promoting member:", error);
      toast({
        title: "Error",
        description: "Failed to promote member",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/messages/${messageId}`),
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error("Failed to delete message");

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '[Message deleted]', isDeleted: true } as Message
          : msg
      ));

      toast({
        title: "Success",
        description: "Message deleted"
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const getMessageStatus = (message: Message) => {
    if (message.senderId !== user?.id) return null;

    const receipts = readReceipts.get(message.id) || [];
    
    if (receipts.length > 0) {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else if (message.deliveredAt) {
      return <CheckCheck className="h-4 w-4 text-gray-400" />;
    } else {
      return <Check className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUserAdmin = selectedGroup?.userRole === 'admin';
  const isGroupCreator = selectedGroup?.createdBy === user?.id;

  return (
    <DashboardLayout>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.filled {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
      <div className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden bg-background-dark">
        {/* Sidebar */}
        <section className="w-[320px] md:w-[400px] flex flex-col border-r border-white/10 bg-surface-dark shrink-0">
          <div className="p-6 pb-2 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-white">Messages</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <button className="bg-surface-accent hover:bg-surface-accent/80 text-white rounded-full p-2 transition-colors" title="New Group">
                    <span className="material-symbols-outlined text-[20px]">group_add</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-surface-dark border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Create Study Group</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Create a new study group for collaboration
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateGroup(new FormData(e.currentTarget));
                  }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Group Name</label>
                      <Input
                        name="name"
                        placeholder="Enter group name"
                        required
                        className="mt-1 bg-surface-accent border-white/10 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Description</label>
                      <Textarea
                        name="description"
                        placeholder="Enter group description"
                        className="mt-1 bg-surface-accent border-white/10 text-white placeholder:text-slate-500"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-black hover:bg-primary/90" disabled={isCreatingGroup}>
                      {isCreatingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Group
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-slate-400">search</span>
              </div>
              <input 
                className="w-full bg-surface-accent text-white placeholder-slate-400 text-sm rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none" 
                placeholder="Search messages..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowCreateDialog(true)}
              className="flex w-full cursor-pointer items-center justify-center rounded-full h-11 bg-primary text-black gap-2 px-4 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
              <span>Compose New</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4 mt-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No groups found</p>
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div 
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-colors border-l-4 ${
                    selectedGroup?.id === group.id 
                      ? 'bg-surface-accent/60 border-primary' 
                      : 'hover:bg-surface-accent/30 border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="size-12 border-2 border-surface-dark">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                        {group.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator could go here if we tracked group presence */}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className="text-white text-sm font-bold truncate">{group.name}</p>
                      <span className="text-primary text-xs font-medium">
                        {group.memberCount} mbrs
                      </span>
                    </div>
                    <p className="text-white/90 text-sm font-medium line-clamp-1 text-slate-400">
                      {group.description || "No description"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Main Chat Area */}
        <section className="flex flex-col flex-1 bg-surface-dark relative">
          {selectedGroup ? (
            <>
              <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-surface-dark shrink-0 z-10">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowGroupInfo(true)}>
                  <div className="relative">
                    <Avatar className="size-10 border-2 border-surface-dark">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 size-2.5 bg-primary border-2 border-surface-dark rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{selectedGroup.name}</h3>
                    <p className="text-primary text-xs font-medium">
                      {selectedGroup.members?.length || selectedGroup.memberCount} members • Active
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-surface-accent transition-colors">
                    <span className="material-symbols-outlined">search</span>
                  </button>
                  <button className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-surface-accent transition-colors">
                    <span className="material-symbols-outlined">videocam</span>
                  </button>
                  <button 
                    onClick={() => setShowGroupInfo(true)}
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-surface-accent transition-colors"
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth bg-background-dark/50">
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                  
                  return (
                    <div key={message.id} className={`flex gap-4 max-w-[80%] ${isOwnMessage ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`size-8 shrink-0 mt-auto mb-1 ${!showAvatar && 'invisible'}`}>
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-surface-accent text-white text-xs">
                            {message.senderUsername.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {!isOwnMessage && showAvatar && (
                          <span className="text-xs text-slate-400 ml-1">{message.senderName}</span>
                        )}
                        
                        <div className={`px-5 py-3 shadow-sm ${
                          isOwnMessage 
                            ? 'bg-primary text-black rounded-2xl rounded-br-sm' 
                            : 'bg-surface-accent text-white rounded-2xl rounded-bl-sm'
                        }`}>
                          {message.type === 'text' ? (
                            <p className={`text-sm ${isOwnMessage ? 'font-semibold' : 'font-normal'} leading-relaxed whitespace-pre-wrap`}>
                              {message.content}
                            </p>
                          ) : message.type === 'image' ? (
                            <div>
                              <img
                                src={apiEndpoint(message.fileUrl || '')}
                                alt={message.fileName}
                                className="max-w-sm rounded-lg mb-1"
                              />
                              {message.content && (
                                <p className="text-sm mt-2">{message.content}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-black/10">
                              <div className="bg-white/20 p-2 rounded-lg">
                                <span className="material-symbols-outlined">description</span>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold truncate">{message.fileName}</span>
                                <span className="text-xs opacity-70">{message.fileSize}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <span className="text-slate-500 text-[10px] mx-1 flex items-center gap-1">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isOwnMessage && (
                            <span className="material-symbols-outlined text-[12px]">
                              {message.deliveredAt ? 'done_all' : 'check'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                
                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 ml-12">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{Array.from(typingUsers).join(', ')} typing...</span>
                  </div>
                )}
              </div>

              <div className="p-6 pt-2 bg-surface-dark shrink-0">
                <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-surface-accent/50 p-2 rounded-[2rem] border border-transparent focus-within:border-primary/30 transition-all">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                  />
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-surface-accent hover:text-white transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                  </button>
                  <button 
                    type="button"
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-surface-accent hover:text-white transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined">image</span>
                  </button>
                  
                  <div className="flex-1 py-2">
                    <input 
                      className="w-full bg-transparent text-white placeholder-slate-500 border-none focus:ring-0 p-0 text-base" 
                      placeholder={`Message ${selectedGroup.name}...`}
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                    />
                  </div>
                  
                  <button 
                    type="button"
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-surface-accent hover:text-white transition-colors shrink-0 mr-1"
                  >
                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="size-10 flex items-center justify-center rounded-full bg-primary text-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined filled">send</span>
                    )}
                  </button>
                </form>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-500">Press Enter to send</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">forum</span>
              <p className="text-lg font-medium">Select a group to start messaging</p>
            </div>
          )}
        </section>

        {/* Group Info Dialog - Kept mostly same but styled */}
        <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-surface-dark border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Group Info</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-3 border-4 border-surface-accent">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl">
                      {selectedGroup?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold">{selectedGroup?.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedGroup?.members?.length || selectedGroup?.memberCount} members
                  </p>
                </div>

                {selectedGroup?.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Description</h4>
                    <p className="text-sm text-slate-400">{selectedGroup.description}</p>
                  </div>
                )}

                <Separator className="bg-white/10" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-300">
                      Members ({selectedGroup?.members?.length || 0})
                    </h4>
                    {isUserAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddMember(true)}
                        className="border-white/10 hover:bg-white/5 text-white"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {selectedGroup?.members?.map((member) => {
                      const isCreator = member.id === selectedGroup.createdBy;
                      const isMemberAdmin = member.groupRole === 'admin';

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-surface-accent text-white">
                                {member.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2 text-white">
                                {member.fullName}
                                {isCreator && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                {isMemberAdmin && !isCreator && (
                                  <Shield className="h-4 w-4 text-blue-500" />
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {member.groupRole === 'admin' ? 'Admin' : 'Member'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
