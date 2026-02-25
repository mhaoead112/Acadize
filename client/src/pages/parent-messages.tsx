import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ParentLayout from "@/components/ParentLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiEndpoint } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, Send, Smile, Paperclip, Phone, 
  Hash, Lock, Users, X, Plus, MessageCircle, 
  Image as ImageIcon, FileText, Link as LinkIcon, Download, Loader2,
  CheckCheck, Video, Settings, ArrowLeft
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

// Emoji picker data (simple version)
const EMOJIS = ["??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "???", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "?????", "?????", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "???", "??", "??", "??", "??", "??", "??", "??", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "???", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "???", "???", "??", "??", "???", "??", "?", "?", "??", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "?", "?", "?", "?", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "??", "?", "??", "??", "??", "??", "?", "??", "??"];

// Add custom styles for animations
const animationStyles = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-25%);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.3s ease-out;
  }

  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }

  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }

  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .message-bubble {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .message-bubble:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .conversation-card {
    transition: all 0.2s ease;
  }

  .conversation-card:hover {
    transform: translateX(4px);
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .conversation-card.active {
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .icon-button {
    transition: all 0.2s ease;
  }

  .icon-button:hover {
    transform: scale(1.1);
    background-color: rgba(0, 0, 0, 0.05);
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .glass-effect {
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.9);
  }

  .shimmer-loading {
    background: linear-gradient(
      90deg,
      #f0f0f0 0px,
      #f8f8f8 40px,
      #f0f0f0 80px
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite linear;
  }

  .online-dot-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .typing-dot {
    animation: bounce 1.4s infinite ease-in-out;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .emoji-button {
    transition: transform 0.1s ease;
  }

  .emoji-button:hover {
    transform: scale(1.2);
  }

  .smooth-scroll {
    scroll-behavior: smooth;
  }

  .gradient-border {
    position: relative;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
`;

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
  content?: string;
  type: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  createdAt: string;
  isRead?: boolean;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface GroupMember extends User {
  role: string;
  isAdmin?: boolean;
  isOnline?: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  fullName: string;
}

export default function ParentMessagesPage() {
  const { t } = useTranslation('parent');
  const { user, token, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'channels'>('all');
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationType, setConversationType] = useState<'group' | 'dm'>('group');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  
  // New state for functionality
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [mediaFiles, setMediaFiles] = useState<Message[]>([]);
  const [sharedLinks, setSharedLinks] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [, setIsSearching] = useState(false);
  
  // Create Group Dialog state
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Add Members Dialog state
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);
  
  // New DM Dialog state
  const [showNewDMDialog, setShowNewDMDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage: wsSendMessage } = useWebSocket((data) => {
    handleWebSocketMessage(data);
  });

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch functions
  const fetchStudyGroups = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/study-groups"), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStudyGroups(data);
      }
    } catch (error) {
      console.error("Failed to fetch study groups:", error);
    }
  };

  const fetchDirectMessages = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/conversations/direct"), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDirectMessages(data);
      }
    } catch (error) {
      console.error("Failed to fetch direct messages:", error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(apiEndpoint(`/api/conversations/${conversationId}/messages`), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Extract media files and links
        const media = data.filter((m: Message) => m.type === 'image' || m.type === 'file');
        setMediaFiles(media);
        
        const links = data
          .filter((m: Message) => m.content && m.content.includes('http'))
          .map((m: Message) => m.content!)
          .filter(Boolean);
        setSharedLinks(links);
        
        // Mark as read
        await markMessagesAsRead(conversationId);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(apiEndpoint(`/api/study-groups/${groupId}`), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const membersWithPresence = await Promise.all(
          data.members.map(async (member: GroupMember) => {
            const presenceResponse = await fetch(apiEndpoint(`/api/study-groups/presence/${member.id}`), {
              headers: getAuthHeaders(),
              credentials: "include",
            });
            const presence = presenceResponse.ok ? await presenceResponse.json() : null;
            return {
              ...member,
              isOnline: presence?.status === 'online',
            };
          })
        );
        setGroupMembers(membersWithPresence);
      }
    } catch (error) {
      console.error("Failed to fetch group members:", error);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/users"), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.filter((u: User) => u.id !== user?.id));
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await fetch(apiEndpoint(`/api/conversations/${conversationId}/read`), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: "include",
      });
      
      // Update unread counts locally
      setStudyGroups(groups => 
        groups.map(g => g.conversationId === conversationId ? {...g, unreadCount: 0} : g)
      );
      setDirectMessages(dms => 
        dms.map(dm => dm.conversationId === conversationId ? {...dm, unreadCount: 0} : dm)
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(apiEndpoint(`/api/conversations/search?query=${encodeURIComponent(query)}`), {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Message handlers
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation?.conversationId) return;
    
    setIsSending(true);
    try {
      const response = await fetch(apiEndpoint(`/api/conversations/${selectedConversation.conversationId}/messages`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({
          type: 'text',
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        // Don't add message locally - let WebSocket handle it for consistency
        setNewMessage("");
        
        // Send WebSocket message for real-time delivery
        wsSendMessage({
          type: 'message',
          conversationId: selectedConversation.conversationId,
          content: message.content,
          messageType: 'text',
        });
        
        // Stop typing indicator
        sendTypingIndicator(false);
        
        // Update last message in conversation list
        if (conversationType === 'group') {
          setStudyGroups(groups => 
            groups.map(g => g.conversationId === selectedConversation.conversationId 
              ? {...g, lastMessage: message.content, lastMessageTime: message.createdAt}
              : g
            )
          );
        } else {
          setDirectMessages(dms =>
            dms.map(dm => dm.conversationId === selectedConversation.conversationId
              ? {...dm, lastMessage: message.content, lastMessageTime: message.createdAt}
              : dm
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToSendMessage'),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedConversation?.conversationId) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const uploadResponse = JSON.parse(xhr.responseText);
          
          // Send message with file
          const response = await fetch(apiEndpoint(`/api/conversations/${selectedConversation.conversationId}/messages`), {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            credentials: "include",
            body: JSON.stringify({
              type: file.type.startsWith('image/') ? 'image' : 'file',
              content: uploadResponse.fileName,
              fileUrl: uploadResponse.fileUrl,
              fileName: uploadResponse.fileName,
              fileSize: uploadResponse.fileSize,
              fileType: uploadResponse.fileType,
            }),
          });

          if (response.ok) {
            const message = await response.json();
            // Don't add message locally - let WebSocket handle it
            
            // Send WebSocket message
            wsSendMessage({
              type: 'message',
              conversationId: selectedConversation.conversationId,
              content: message.content,
              messageType: message.type,
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              fileSize: message.fileSize,
              fileType: message.fileType,
            });
            
            // Media files will be updated when WebSocket message arrives
            
            toast({
              title: t('common:toast.success'),
              description: t('toast.fileUploadedSuccessfully'),
            });
          }
        }
      });

      xhr.addEventListener('error', () => {
        toast({
          title: t('common:toast.error'),
          description: t('toast.failedToUploadFile'),
          variant: "destructive",
        });
      });

      xhr.open('POST', apiEndpoint('/api/study-groups/upload'));
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);

    } catch (error) {
      console.error("Failed to upload file:", error);
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToUploadFile'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!selectedConversation?.conversationId) return;

    wsSendMessage({
      type: 'typing',
      conversationId: selectedConversation.conversationId,
      isTyping,
      userId: user?.id,
      username: user?.username,
      fullName: user?.fullName,
    });
  }, [selectedConversation, user, wsSendMessage]);

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newMessage;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setNewMessage(before + emoji + after);
    setShowEmojiPicker(false);
    
    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: t('common:toast.error'),
        description: t('toast.groupNameRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(apiEndpoint('/api/study-groups'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          memberIds: selectedMembers,
        }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        setStudyGroups(prev => [...prev, newGroup]);
        setShowCreateGroupDialog(false);
        setGroupName("");
        setGroupDescription("");
        setSelectedMembers([]);
        
        toast({
          title: t('common:toast.success'),
          description: t('toast.groupCreatedSuccessfully'),
        });
      }
    } catch (error) {
      console.error("Failed to create group:", error);
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToCreateGroup'),
        variant: "destructive",
      });
    }
  };

  const handleAddMembers = async () => {
    if (!selectedConversation?.id || membersToAdd.length === 0) return;

    try {
      const response = await fetch(apiEndpoint(`/api/study-groups/${selectedConversation.id}/members`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({
          memberIds: membersToAdd,
        }),
      });

      if (response.ok) {
        toast({
          title: t('common:toast.success'),
          description: t('toast.membersAddedSuccessfully'),
        });
        setShowAddMembersDialog(false);
        setMembersToAdd([]);
        
        // Refresh group members
        if (selectedConversation.id) {
          fetchGroupMembers(selectedConversation.id);
        }
      }
    } catch (error) {
      console.error("Failed to add members:", error);
      toast({
title: t('common:toast.error'),
          description: t('toast.failedToAddMembers'),
        variant: "destructive",
      });
    }
  };

  const handleStartDirectMessage = async (targetUserId: string) => {
    try {
      const response = await fetch(apiEndpoint(`/api/conversations/direct/${targetUserId}`), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if conversation already exists in state
        const existing = directMessages.find(dm => dm.conversationId === data.conversationId);
        
        if (!existing) {
          // Add to direct messages list
          const newDM: DirectMessage = {
            id: data.conversationId,
            userId: data.user.id,
            username: data.user.username,
            fullName: data.user.fullName,
            isOnline: false,
            conversationId: data.conversationId,
            unreadCount: 0,
          };
          setDirectMessages(prev => [...prev, newDM]);
        }
        
        // Select this conversation
        selectConversation({
          ...data.user,
          conversationId: data.conversationId,
        }, 'dm');
        
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Failed to start direct message:", error);
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToStartConversation'),
        variant: "destructive",
      });
    }
  };

  const selectConversation = (conversation: any, type: 'group' | 'dm') => {
    setSelectedConversation(conversation);
    setConversationType(type);
    setMessages([]);
    setShowRightPanel(type === 'group');
    setShowMobileChat(true); // Show chat on mobile when conversation selected
    
    if (conversation.conversationId) {
      fetchMessages(conversation.conversationId);
      
      // Join conversation via WebSocket
      wsSendMessage({
        type: 'join',
        conversationId: conversation.conversationId,
      });
      
      // Fetch group members if it's a group
      if (type === 'group' && conversation.id) {
        fetchGroupMembers(conversation.id);
      }
    }
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === 'new_message') {
      // Handle new message from WebSocket
      if (data.message.conversationId === selectedConversation?.conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
        
        // Update media files if needed
        if (data.message.type === 'image' || data.message.type === 'file') {
          setMediaFiles(prev => [...prev, data.message]);
        }
      }
      
      // Update last message in conversation list
      if (conversationType === 'group') {
        setStudyGroups(groups => 
          groups.map(g => g.conversationId === data.message.conversationId
            ? {...g, lastMessage: data.message.content, lastMessageTime: data.message.createdAt}
            : g
          )
        );
      } else {
        setDirectMessages(dms =>
          dms.map(dm => dm.conversationId === data.message.conversationId
            ? {...dm, lastMessage: data.message.content, lastMessageTime: data.message.createdAt}
            : dm
          )
        );
      }
    } else if (data.type === 'typing' && data.conversationId === selectedConversation?.conversationId) {
      if (data.userId !== user?.id) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (prev.some(u => u.userId === data.userId)) return prev;
            return [...prev, {
              userId: data.userId,
              username: data.username,
              fullName: data.fullName,
            }];
          });
        } else {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }
      }
    } else if (data.type === 'presence') {
      // Update online status
      if (conversationType === 'dm') {
        setDirectMessages(dms =>
          dms.map(dm => dm.userId === data.userId ? {...dm, isOnline: data.status === 'online'} : dm)
        );
      } else if (conversationType === 'group') {
        setGroupMembers(members =>
          members.map(m => m.id === data.userId ? {...m, isOnline: data.status === 'online'} : m)
        );
      }
    }
  };

  useEffect(() => {
    // Only fetch data when auth is loaded and token is available
    if (!authLoading && token) {
      fetchStudyGroups();
      fetchDirectMessages();
      fetchAvailableUsers();
      setIsLoading(false);
    } else if (!authLoading && !token) {
      // Auth loaded but no token - user not authenticated
      setIsLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (selectedConversation?.conversationId) {
      fetchMessages(selectedConversation.conversationId);
      
      wsSendMessage({
        type: 'join',
        conversationId: selectedConversation.conversationId,
      });

      return () => {
        wsSendMessage({
          type: 'leave',
          conversationId: selectedConversation.conversationId,
        });
      };
    }
  }, [selectedConversation?.conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Filter conversations based on active tab
  const getFilteredConversations = () => {
    if (activeTab === 'direct') {
      return directMessages;
    } else if (activeTab === 'channels') {
      return studyGroups;
    } else {
      return [...directMessages, ...studyGroups];
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return format(new Date(timestamp), 'p');
    } catch {
      return '';
    }
  };

  // Show loading state while auth is loading
  if (authLoading || isLoading) {
    return (
      <ParentLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </ParentLayout>
    );
  }

  // Show error if not authenticated
  if (!token || !user) {
    return (
      <ParentLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Please log in to access messages</p>
            <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <style>{animationStyles}</style>
      <style>{`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
      <div className="flex h-full bg-slate-950 overflow-hidden">
        {/* Left Sidebar - Conversations List */}
        <div className={`
          ${showMobileChat ? 'hidden md:flex' : 'flex'}
          w-full md:w-[320px] lg:w-[360px]
          border-r border-white/10 flex-col bg-slate-800
        `}>
          {/* Header & Search */}
          <div className="p-6 pb-2 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-white">{t('messages')}</h2>
              <div className="flex gap-2">
                <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                  <DialogTrigger asChild>
                    <button className="bg-slate-700 hover:bg-slate-700/80 text-white rounded-full p-2 transition-colors" title="New Group">
                      <Users className="h-5 w-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-white/10 text-white sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New Group</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Create a new group and invite members
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-name" className="text-slate-300">Group Name</Label>
                        <Input
                          id="group-name"
                          placeholder="Enter group name"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="bg-slate-700 border-white/10 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="group-description" className="text-slate-300">Description</Label>
                        <Textarea
                          id="group-description"
                          placeholder="Enter group description"
                          value={groupDescription}
                          onChange={(e) => setGroupDescription(e.target.value)}
                          rows={3}
                          className="bg-slate-700 border-white/10 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Select Members</Label>
                        <ScrollArea className="h-[200px] border border-white/10 rounded-lg p-2 bg-slate-700/30">
                          {availableUsers.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2 py-2 hover:bg-white/5 rounded px-2">
                              <Checkbox
                                id={`member-${user.id}`}
                                checked={selectedMembers.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMembers(prev => [...prev, user.id]);
                                  } else {
                                    setSelectedMembers(prev => prev.filter(id => id !== user.id));
                                  }
                                }}
                                className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                              />
                              <label
                                htmlFor={`member-${user.id}`}
                                className="flex-1 flex items-center gap-2 cursor-pointer"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">{user.fullName}</p>
                                  <p className="text-xs text-slate-400">@{user.username}</p>
                                </div>
                              </label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setShowCreateGroupDialog(false)} className="text-slate-400 hover:text-white hover:bg-white/10">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateGroup} className="bg-primary text-black hover:bg-primary/90">
                        Create Group
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showNewDMDialog} onOpenChange={setShowNewDMDialog}>
                  <DialogTrigger asChild>
                    <button className="bg-slate-700 hover:bg-slate-700/80 text-white rounded-full p-2 transition-colors" title="New Message">
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-white/10 text-white sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Start a Direct Message</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Select a user to start a conversation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-2 mb-4">
                        <Label className="text-slate-300">Search for a user</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Type a name or username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-700 border-white/10 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[300px] border border-white/10 rounded-lg p-2 bg-slate-700/30">
                        {(searchQuery ? searchResults : availableUsers).map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              handleStartDirectMessage(user.id);
                              setShowNewDMDialog(false);
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all duration-150 text-left"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{user.fullName}</p>
                              <p className="text-xs text-slate-400">@{user.username}</p>
                            </div>
                          </button>
                        ))}
                      </ScrollArea>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => {
                        setShowNewDMDialog(false);
                        setSearchQuery("");
                      }} className="text-slate-400 hover:text-white hover:bg-white/10">
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                className="w-full bg-slate-700 text-white placeholder-slate-400 text-sm rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 border-none" 
                placeholder="Search messages..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 bg-slate-700 p-1 rounded-lg h-10">
                <TabsTrigger 
                  value="all" 
                  className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="direct" 
                  className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
                >
                  Direct
                </TabsTrigger>
                <TabsTrigger 
                  value="channels" 
                  className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
                >
                  Groups
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="space-y-1">
              {/* Direct Messages */}
              {(activeTab === 'all' || activeTab === 'direct') && directMessages.map((dm) => (
                <button
                  key={dm.id}
                  onClick={() => selectConversation(dm, 'dm')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-colors border-l-4 text-left ${
                    selectedConversation?.id === dm.id 
                      ? 'bg-slate-700/60 border-primary' 
                      : 'hover:bg-slate-700/30 border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-slate-800">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                        {dm.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {dm.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-white text-sm truncate">
                        {dm.fullName}
                      </h4>
                      {dm.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {formatTimestamp(dm.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm truncate max-w-[140px]">
                        {dm.lastMessage || 'No messages yet'}
                      </p>
                      {(dm.unreadCount ?? 0) > 0 && (
                        <Badge className="bg-primary text-black text-[10px] h-5 min-w-[20px] flex items-center justify-center px-1">
                          {dm.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Study Groups */}
              {(activeTab === 'all' || activeTab === 'channels') && studyGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectConversation(group, 'group')}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-colors border-l-4 text-left ${
                    selectedConversation?.id === group.id 
                      ? 'bg-slate-700/60 border-primary' 
                      : 'hover:bg-slate-700/30 border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 border-2 border-slate-800">
                      {group.isPrivate ? (
                        <Lock className="h-5 w-5 text-white" />
                      ) : (
                        <Hash className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-white text-sm truncate">
                        {group.name}
                      </h4>
                      {group.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 flex-shrink-0">
                          {formatTimestamp(group.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm truncate max-w-[140px]">
                        {group.lastMessage || group.description || 'No messages yet'}
                      </p>
                      {(group.unreadCount ?? 0) > 0 && (
                        <Badge className="bg-primary text-black text-[10px] h-5 min-w-[20px] flex items-center justify-center px-1">
                          {group.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className={`
          ${showMobileChat ? 'flex' : 'hidden md:flex'}
          flex-1 flex-col min-w-0 bg-slate-800 relative
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-slate-800 shrink-0 z-10">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Mobile back button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 h-8 w-8 flex-shrink-0 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  {conversationType === 'dm' ? (
                    <>
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10 border-2 border-slate-800">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
                            {selectedConversation.fullName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {selectedConversation.isOnline && (
                          <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-slate-800 rounded-full"></span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-white text-lg leading-tight truncate">{selectedConversation.fullName}</h2>
                        <p className="text-primary text-xs font-medium">
                          {selectedConversation.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 border-2 border-slate-800">
                        {selectedConversation.isPrivate ? (
                          <Lock className="h-5 w-5 text-white" />
                        ) : (
                          <Hash className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-white text-lg leading-tight truncate">{selectedConversation.name}</h2>
                        <p className="text-primary text-xs font-medium">{selectedConversation.memberCount} members � Active</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors hidden sm:flex">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors hidden sm:flex">
                    <Video className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className={`size-10 flex items-center justify-center rounded-full transition-colors ${showRightPanel ? 'text-white bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth bg-slate-950/50">
                {messages.map((message, index) => {
                  const isOwn = message.senderId === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

                  return (
                    <div key={message.id} className={`flex gap-4 max-w-[80%] animate-fade-in ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`size-8 shrink-0 mt-auto mb-1 ${!showAvatar && 'invisible'}`}>
                        {!isOwn && showAvatar && (
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-slate-700 text-white text-xs">
                              {message.senderName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      
                      <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isOwn && showAvatar && (
                          <span className="text-xs text-slate-400 ml-1">{message.senderName}</span>
                        )}
                        
                        <div className={`px-5 py-3 shadow-sm ${
                          isOwn 
                            ? 'bg-primary text-black rounded-2xl rounded-br-sm' 
                            : 'bg-slate-700 text-white rounded-2xl rounded-bl-sm'
                        }`}>
                          {message.type === 'text' && (
                            <p className={`text-sm ${isOwn ? 'font-semibold' : 'font-normal'} leading-relaxed whitespace-pre-wrap break-words`}>
                              {message.content}
                            </p>
                          )}
                          
                          {message.type === 'image' && (
                            <div>
                              <img 
                                src={message.fileUrl} 
                                alt={message.fileName}
                                className="max-w-[300px] rounded-lg mb-2"
                              />
                              <p className="text-xs opacity-80">{message.fileName}</p>
                            </div>
                          )}
                          
                          {message.type === 'file' && (
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded ${isOwn ? 'bg-black/10' : 'bg-white/10'}`}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold truncate">{message.fileName}</p>
                                <p className="text-xs opacity-70">{formatFileSize(message.fileSize)}</p>
                              </div>
                              <a
                                href={message.fileUrl}
                                download={message.fileName}
                                className={`p-2 rounded hover:bg-opacity-80 ${
                                  isOwn ? 'hover:bg-black/10' : 'hover:bg-white/10'
                                }`}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <span className="text-slate-500 text-[10px] mx-1 flex items-center gap-1">
                          {formatTimestamp(message.createdAt)}
                          {isOwn && (
                            <CheckCheck className="h-3 w-3" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 ml-12 animate-fade-in">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>
                      {typingUsers.map(u => u.fullName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="px-8 py-2 bg-slate-800 border-t border-white/10 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div className="flex-1">
                      <Progress value={uploadProgress} className="h-2 bg-slate-700" />
                    </div>
                    <span className="text-sm text-slate-400">{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-6 pt-2 bg-slate-800 shrink-0">
                <div className="relative flex items-end gap-2 bg-slate-700/50 p-2 rounded-[2rem] border border-transparent focus-within:border-primary/30 transition-all">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  
                  <div className="flex-1 py-2 relative">
                    <Textarea
                      ref={messageInputRef}
                      placeholder={`Message ${conversationType === 'dm' ? selectedConversation.fullName : selectedConversation.name}...`}
                      value={newMessage}
                      onChange={handleMessageInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full bg-transparent text-white placeholder-slate-500 border-none focus:ring-0 p-0 text-base min-h-[24px] max-h-[120px] resize-none"
                      rows={1}
                    />
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-4 bg-slate-800 border border-white/10 rounded-xl shadow-2xl p-3 w-[320px] max-h-[300px] overflow-y-auto z-50 animate-scale-in">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                          <span className="text-sm font-medium text-white">Emoji</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-400 hover:text-white"
                            onClick={() => setShowEmojiPicker(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {EMOJIS.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => insertEmoji(emoji)}
                              className="emoji-button p-2 hover:bg-white/10 rounded-lg text-xl transition-all duration-150"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0 mr-1"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending || isUploading}
                    className="size-10 flex items-center justify-center rounded-full bg-primary text-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-500">Press Enter to send</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-400">Select a conversation</p>
              <p className="text-sm text-slate-600">Choose a conversation from the sidebar to start chatting</p>
            </div>
          )}
        </div>

        {/* Right Panel - Info */}
        {showRightPanel && selectedConversation && (
          <div className="hidden lg:flex w-[300px] xl:w-[340px] border-l border-white/10 bg-slate-800 flex-col animate-slide-in-right">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className="text-center">
                  {conversationType === 'dm' ? (
                    <Avatar className="h-24 w-24 mx-auto mb-3 border-4 border-slate-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-3xl">
                        {selectedConversation.fullName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-slate-700">
                      {selectedConversation.isPrivate ? (
                        <Lock className="h-10 w-10 text-white" />
                      ) : (
                        <Hash className="h-10 w-10 text-white" />
                      )}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white">
                    {conversationType === 'dm' ? selectedConversation.fullName : selectedConversation.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {conversationType === 'dm' 
                      ? `@${selectedConversation.username}` 
                      : `${selectedConversation.memberCount} members`}
                  </p>
                </div>

                {/* About */}
                {conversationType === 'group' && (
                  <div>
                    <h3 className="font-semibold text-white mb-2 text-sm">About</h3>
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-white/5">
                      <p className="text-sm text-slate-400">{selectedConversation.description || 'No description'}</p>
                    </div>
                  </div>
                )}

                {/* Photos & Videos */}
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
                    <ImageIcon className="h-4 w-4" />
                    Photos & Videos
                  </h3>
                  {mediaFiles.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaFiles.slice(0, 6).map((file) => (
                        <a
                          key={file.id}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-slate-700 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer border border-white/5"
                        >
                          {file.type === 'image' ? (
                            <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-8 w-8 text-slate-400" />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No media files yet</p>
                  )}
                </div>

                {/* Shared Links */}
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
                    <LinkIcon className="h-4 w-4" />
                    Shared Links
                  </h3>
                  {sharedLinks.length > 0 ? (
                    <div className="space-y-2">
                      {sharedLinks.slice(0, 5).map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-slate-700/30 rounded-lg p-3 border border-white/5 hover:bg-slate-700/50 transition-colors"
                        >
                          <p className="text-sm text-blue-400 truncate">{link}</p>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No shared links yet</p>
                  )}
                </div>

                {/* Members (Group Only) */}
                {conversationType === 'group' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" />
                        Members ({groupMembers.length})
                      </h3>
                      <Dialog open={showAddMembersDialog} onOpenChange={setShowAddMembersDialog}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-white/10 text-white">
                          <DialogHeader>
                            <DialogTitle>Add Members</DialogTitle>
                            <DialogDescription className="text-slate-400">
                              Select users to add to this group
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <ScrollArea className="h-[300px] border border-white/10 rounded-lg p-2 bg-slate-700/30">
                              {availableUsers
                                .filter(u => !groupMembers.some(m => m.id === u.id))
                                .map((user) => (
                                  <div key={user.id} className="flex items-center space-x-2 py-2 hover:bg-white/5 rounded px-2">
                                    <Checkbox
                                      id={`add-member-${user.id}`}
                                      checked={membersToAdd.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setMembersToAdd(prev => [...prev, user.id]);
                                        } else {
                                          setMembersToAdd(prev => prev.filter(id => id !== user.id));
                                        }
                                      }}
                                      className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                                    />
                                    <label
                                      htmlFor={`add-member-${user.id}`}
                                      className="flex-1 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-white">{user.fullName}</p>
                                        <p className="text-xs text-slate-400">@{user.username}</p>
                                      </div>
                                    </label>
                                  </div>
                                ))}
                            </ScrollArea>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowAddMembersDialog(false)} className="text-slate-400 hover:text-white hover:bg-white/10">
                              Cancel
                            </Button>
                            <Button onClick={handleAddMembers} disabled={membersToAdd.length === 0} className="bg-primary text-black hover:bg-primary/90">
                              Add Members
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {groupMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all duration-200">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-700 text-white text-xs">
                                {member.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {member.isOnline && (
                              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border border-slate-800"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {member.fullName}
                              {member.isAdmin && (
                                <Badge variant="outline" className="ml-2 text-[10px] border-primary text-primary">Admin</Badge>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 truncate">@{member.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </ParentLayout>
  );
}
