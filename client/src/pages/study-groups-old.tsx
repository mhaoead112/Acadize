import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint, assetUrl } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Plus, Send, Paperclip, Image as ImageIcon, 
  Video, File, Search, MoreVertical, UserPlus, Loader2,
  MessageCircle
} from "lucide-react";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  courseId?: string;
  memberCount: number;
  userRole: string;
  conversationId?: string;
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Join conversation via WebSocket
      wsSendMessage({
        type: 'join',
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
        }
        break;
      case 'typing':
        // Handle typing indicator
        break;
      case 'user_joined':
      case 'user_left':
        // Handle user presence
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

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/study-groups/conversations/${conversationId}/messages`),
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

      const newGroup = await response.json();
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

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-80px)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Study Groups</h1>
            <p className="text-gray-600">Collaborate with classmates and teachers</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateGroup(new FormData(e.currentTarget));
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Group Name</label>
                  <Input name="name" placeholder="e.g., Math Study Group" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    name="description" 
                    placeholder="What's this group about?" 
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={isCreatingGroup} className="w-full">
                  {isCreatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          {/* Groups Sidebar */}
          <Card className="col-span-3 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Groups
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No study groups yet</p>
                    <p className="text-sm">Create one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedGroup?.id === group.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-gray-600 truncate">{group.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {group.memberCount} members
                              </Badge>
                              {group.userRole === 'admin' && (
                                <Badge variant="default" className="text-xs">Admin</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-9 flex flex-col">
            {selectedGroup ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedGroup.name}</CardTitle>
                      {selectedGroup.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedGroup.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {selectedGroup.memberCount}
                      </Badge>
                      {isConnected ? (
                        <Badge variant="default" className="bg-green-500">Connected</Badge>
                      ) : (
                        <Badge variant="secondary">Disconnected</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwn = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isOwn && (
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                {message.senderName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              {!isOwn && (
                                <span className="text-xs text-gray-600 font-medium mb-1">
                                  {message.senderName}
                                </span>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2 ${
                                  isOwn
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {message.type === 'text' && (
                                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                )}
                                {message.type === 'image' && (
                                  <div>
                                    <img 
                                      src={assetUrl(message.fileUrl)} 
                                      alt={message.fileName} 
                                      className="max-w-full rounded"
                                    />
                                    <p className="text-xs mt-1 opacity-75">{message.fileName}</p>
                                  </div>
                                )}
                                {message.type === 'video' && (
                                  <div>
                                    <video 
                                      src={assetUrl(message.fileUrl)} 
                                      controls 
                                      className="max-w-full rounded"
                                    />
                                    <p className="text-xs mt-1 opacity-75">{message.fileName}</p>
                                  </div>
                                )}
                                {message.type === 'file' && (
                                  <a 
                                    href={assetUrl(message.fileUrl)}
                                    download={message.fileName}
                                    className="flex items-center gap-2"
                                  >
                                    <File className="h-4 w-4" />
                                    <div>
                                      <p className="text-sm">{message.fileName}</p>
                                      <p className="text-xs opacity-75">
                                        {(Number(message.fileSize) / 1024).toFixed(2)} KB
                                      </p>
                                    </div>
                                  </a>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 mt-1">
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {isOwn && (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 text-sm font-semibold flex-shrink-0">
                                {user?.fullName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        {uploadingFile ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isSending || !isConnected}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isSending || !newMessage.trim() || !isConnected}>
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a study group</p>
                  <p className="text-sm">Choose a group from the sidebar to start chatting</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
