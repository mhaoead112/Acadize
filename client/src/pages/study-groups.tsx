import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint, assetUrl } from "@/lib/config";
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
  Settings, Ban, Shield, ArrowLeft, Clock, Upload, 
  Camera, CircleDot
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId?: string;
  memberCount: number;
  userRole: string;
  conversationId?: string;
  avatarUrl?: string;
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
  email?: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
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

interface DMConversation {
  id: string;
  conversationId: string;
  participantId: string;
  participantName: string;
  participantUsername: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  senderName?: string;
  senderUsername?: string;
  conversationId?: string;
  isRead: boolean;
  createdAt: string;
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
  const [availableUsers, setAvailableUsers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(new Map());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket((data) => {
    handleWebSocketMessage(data);
  });

  const getAuthHeaders = (): HeadersInit => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
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

  useEffect(() => {
    if (showAddMember) {
      fetchAvailableUsers();
      setSelectedUserIds([]);
    }
  }, [showAddMember]);



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
        } else {
          // Message in another conversation - refresh groups
          fetchGroups();
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
      case 'new_notification':
        toast({
          title: data.notification?.title || "New Notification",
          description: data.notification?.message,
        });
        break;
      case 'message_delivered':
        // Update message delivery status
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.messageId
              ? { ...msg, deliveredAt: data.deliveredAt }
              : msg
          )
        );
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

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/users"), {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error("Failed to fetch users");

      const allUsers = await response.json();
      
      // Filter out users already in the group
      const currentMemberIds = selectedGroup?.members?.map(m => m.id) || [];
      const available = allUsers.filter((u: any) => 
        !currentMemberIds.includes(u.id) && u.id !== user?.id
      );
      
      setAvailableUsers(available);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedUserIds.length === 0) return;

    setIsAddingMembers(true);
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/members`),
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ memberIds: selectedUserIds })
        }
      );

      if (!response.ok) throw new Error("Failed to add members");

      toast({
        title: "Success",
        description: `Added ${selectedUserIds.length} member(s) to the group`
      });

      setShowAddMember(false);
      setSelectedUserIds([]);
      await fetchGroupDetails(selectedGroup.id);
    } catch (error) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description: "Failed to add members",
        variant: "destructive"
      });
    } finally {
      setIsAddingMembers(false);
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







  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedGroup || !e.target.files?.[0]) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', e.target.files[0]);

      const response = await fetch(
        apiEndpoint(`/api/study-groups/${selectedGroup.id}/avatar`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData
        }
      );

      if (!response.ok) throw new Error("Failed to upload avatar");

      const data = await response.json();
      const newAvatarUrl = data.avatarUrl;
      
      // Update selected group
      setSelectedGroup(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
      
      // Update in groups list
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id ? { ...g, avatarUrl: newAvatarUrl } : g
      ));

      toast({
        title: "Success",
        description: "Group avatar updated"
      });
      
      // Refresh groups to ensure we have latest data
      await fetchGroups();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
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
      <div className="h-[calc(100vh-120px)] flex bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Sidebar - Groups List */}
        <div className="w-96 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">Study Groups</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Study Group</DialogTitle>
                    <DialogDescription>
                      Create a new study group for collaboration
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateGroup(new FormData(e.currentTarget));
                  }} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Group Name</label>
                      <Input
                        name="name"
                        placeholder="Enter group name"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        name="description"
                        placeholder="Enter group description"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isCreatingGroup}>
                      {isCreatingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Group
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No groups found</p>
                <p className="text-sm text-gray-400 mt-1">Create a new group to start collaborating</p>
              </div>
            ) : (
              <div>
                {filteredGroups.map((group) => {
                  const isActive = selectedGroup?.id === group.id;
                  
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`
                        w-full p-4 flex items-start gap-3 border-b border-gray-100 transition-all
                        ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      `}
                    >
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {group.avatarUrl ? (
                          <AvatarImage src={assetUrl(group.avatarUrl)} alt={group.name} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                          {group.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{group.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{group.memberCount} members</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        {selectedGroup ? (
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 -ml-2 p-2 rounded-lg transition-colors"
                  onClick={() => setShowGroupInfo(true)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {selectedGroup.avatarUrl ? (
                        <AvatarImage src={assetUrl(selectedGroup.avatarUrl)} alt={selectedGroup.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedGroup.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedGroup.members?.length || selectedGroup.memberCount} members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Avatar upload button for group admins */}
                  {isUserAdmin && (
                    <div className="relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadAvatar}
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowGroupInfo(true)}
                  >
                    <Info className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2 animate-in slide-in-from-bottom-2 duration-300 ${
                        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {!isOwnMessage && (
                        <Avatar className={`h-8 w-8 ${showAvatar ? '' : 'invisible'}`}>
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                            {message.senderUsername.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={`group max-w-md ${
                          isOwnMessage ? 'items-end' : 'items-start'
                        }`}
                      >
                        {!isOwnMessage && showAvatar && (
                          <p className="text-xs text-gray-600 mb-1 px-3">
                            {message.senderName}
                          </p>
                        )}

                        <div className="relative">
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-900'
                            }`}
                          >
                            {message.type === 'text' ? (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            ) : message.type === 'image' ? (
                              <div>
                                <img
                                  src={assetUrl(message.fileUrl)}
                                  alt={message.fileName}
                                  className="max-w-sm rounded-lg mb-1"
                                />
                                {message.content && (
                                  <p className="text-sm mt-2">{message.content}</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <File className="h-5 w-5" />
                                <div>
                                  <p className="text-sm font-medium">{message.fileName}</p>
                                  <p className="text-xs opacity-75">{message.fileSize}</p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {getMessageStatus(message)}
                            </div>
                          </div>

                          {/* Message Options */}
                          {(isOwnMessage || isUserAdmin) && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-white shadow-md">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 animate-in fade-in duration-200">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{Array.from(typingUsers).join(', ')} typing...</span>
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 px-6 py-4">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex-shrink-0"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={isSending || !newMessage.trim()}
                  className="flex-shrink-0 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-24 w-24 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Select a group to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {/* Group Info Panel */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Group Info</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6">
                {/* Group Avatar */}
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-3">
                    {selectedGroup?.avatarUrl ? (
                      <AvatarImage src={assetUrl(selectedGroup.avatarUrl)} alt={selectedGroup?.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl">
                      {selectedGroup?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold">{selectedGroup?.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedGroup?.members?.length || selectedGroup?.memberCount} members
                  </p>
                </div>

                {/* Description */}
                {selectedGroup?.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                  </div>
                )}

                <Separator />

                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Members ({selectedGroup?.members?.length || 0})
                    </h4>
                    {isUserAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddMember(true)}
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
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gray-200">
                                {member.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">
                                {member.fullName}
                                {isCreator && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                {isMemberAdmin && !isCreator && (
                                  <Shield className="h-4 w-4 text-blue-500" />
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.groupRole === 'admin' ? 'Admin' : 'Member'}
                              </p>
                            </div>
                          </div>

                          {isUserAdmin && member.id !== user?.id && !isCreator && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!isMemberAdmin && isGroupCreator && (
                                  <DropdownMenuItem onClick={() => handleMakeAdmin(member.id)}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}
                                {member.isMuted ? (
                                  <DropdownMenuItem onClick={() => handleModerateMember(member.id, 'unmute')}>
                                    Unmute
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleModerateMember(member.id, 'mute')}>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Mute
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-red-600"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Add Members Dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Members</DialogTitle>
              <DialogDescription>
                Select users to add to this group
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* User List */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {availableUsers
                    .filter(u => 
                      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.username.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((availableUser) => (
                      <div
                        key={availableUser.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUserIds.includes(availableUser.id)
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        onClick={() => {
                          setSelectedUserIds(prev =>
                            prev.includes(availableUser.id)
                              ? prev.filter(id => id !== availableUser.id)
                              : [...prev, availableUser.id]
                          );
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gray-200">
                            {availableUser.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{availableUser.fullName}</p>
                          <p className="text-xs text-gray-500">@{availableUser.username}</p>
                        </div>
                        {selectedUserIds.includes(availableUser.id) && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    ))}
                  
                  {availableUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No users available to add</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Selected count */}
              {selectedUserIds.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedUserIds.length} user(s) selected
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedUserIds([]);
                    setSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddMembers}
                  disabled={selectedUserIds.length === 0 || isAddingMembers}
                >
                  {isAddingMembers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
}
