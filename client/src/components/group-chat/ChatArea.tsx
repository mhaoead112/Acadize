import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiEndpoint } from '@/lib/config';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Users, 
  Phone, 
  Video,
  Hand,
  BarChart3,
  Wifi,
  WifiOff,
  X,
  FileText,
  Image,
  Video as VideoIcon,
  Music,
  ArrowLeft
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { PollModal } from './PollModal';
import { GroupMembersModal } from './GroupMembersModal';
import { GroupSettingsModal } from './GroupSettingsModal';
import type { Group, User, GroupMessage } from './types';

interface ChatAreaProps {
  group: Group;
  user: User | null;
  messages: GroupMessage[];
  onSendMessage: (content: string, messageType?: string, metadata?: any) => void;
  typingUsers: string[];
  isConnected: boolean;
  onBackToGroups?: () => void;
}

export function ChatArea({ 
  group, 
  user, 
  messages, 
  onSendMessage, 
  typingUsers,
  isConnected,
  onBackToGroups
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<GroupMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim() && user) {
      onSendMessage(messageText.trim());
      setMessageText('');
      setIsTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    // Handle typing indicators
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      // Send typing start via WebSocket
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Send typing stop via WebSocket
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
  };

  // Message threading
  const handleReplyToMessage = (message: GroupMessage) => {
    setReplyToMessage(message);
  };

  const clearReply = () => {
    setReplyToMessage(null);
  };

  const handleUploadFiles = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // First create a placeholder message
      const messageContent = selectedFiles.length === 1 
        ? `📎 ${selectedFiles[0].name}` 
        : `📎 ${selectedFiles.length} files`;
      
      // Send message to get message ID
      onSendMessage(messageContent, 'file');

      // Create form data for file upload
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // For now, we'll use a placeholder messageId - in real implementation,
      // we'd get the messageId from the onSendMessage response
      const messageId = 'temp-' + Date.now();
      formData.append('messageId', messageId);

      // Upload files (simulated progress for now)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setSelectedFiles([]);
          setUploadProgress(0);
        }
      }, 100);

      // TODO: Implement actual file upload to backend
      // const response = await fetch('/api/files/upload', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('eduverse_token')}`
      //   },
      //   body: formData
      // });

    } catch (error) {
      console.error('File upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'class': return '🏫';
      case 'project': return '📋';
      case 'announcement': return '📢';
      default: return '💬';
    }
  };

  const canRaiseHand = user?.role === 'student';
  const canCreatePoll = user?.role === 'teacher' || user?.role === 'admin';

  const handleRaiseHand = async () => {
    if (!user || !group) return;
    
    try {
      const response = await fetch(apiEndpoint('/api/raise-hand'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('eduverse_token')}`
        },
        body: JSON.stringify({
          groupId: group.id,
          userId: user.id
        })
      });
      
      if (response.ok) {
        // Show success feedback
        onSendMessage('🙋‍♂️ has raised their hand', 'raise_hand');
      }
    } catch (error) {
      console.error('Error raising hand:', error);
    }
  };

  const handleCreatePoll = (pollData: any) => {
    onSendMessage(
      `📊 Poll: ${pollData.question}`,
      'poll',
      pollData
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm border-b border-white/30 p-2 sm:p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile back button */}
            {onBackToGroups && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToGroups}
                className="md:hidden p-2 h-8 w-8 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="text-lg sm:text-2xl flex-shrink-0">{getGroupIcon(group.type)}</div>
            <div className="min-w-0 flex-1">
              <h2 className="font-luxury text-sm sm:text-base md:text-lg text-gray-900 flex items-center gap-1 sm:gap-2 truncate">
                <span className="truncate">{group.name}</span>
                {isConnected ? (
                  <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" title="Connected" />
                ) : (
                  <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" title="Disconnected" />
                )}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-elegant flex items-center gap-1 sm:gap-2 truncate">
                <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="truncate">12 members <span className="hidden sm:inline">• {group.description}</span></span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {canRaiseHand && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRaiseHand}
                className="text-orange-600 border-orange-200 hover:bg-orange-50 h-8 px-2 sm:px-3 text-xs sm:text-sm hidden sm:flex"
                data-testid="button-raise-hand"
              >
                <Hand className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden lg:inline">Raise Hand</span>
              </Button>
            )}
            
            {canCreatePoll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPollModal(true)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2 sm:px-3 text-xs sm:text-sm hidden sm:flex"
                data-testid="button-create-poll"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden lg:inline">Poll</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMembersModal(true)}
              className="text-purple-600 border-purple-200 hover:bg-purple-50 h-8 px-2 sm:px-3 text-xs sm:text-sm"
              data-testid="button-group-members"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden lg:inline">Members</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hidden md:flex">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/90 to-white/90 backdrop-blur-sm p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 relative transition-all duration-300 ${
          isDragOver ? 'bg-blue-50/90 border-2 border-dashed border-blue-300' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl mb-2">📁</div>
              <p className="text-base sm:text-lg font-medium text-blue-700">Drop files to upload</p>
              <p className="text-xs sm:text-sm text-blue-600">Maximum 5 files, 10MB each</p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 h-full">
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl mb-2">{getGroupIcon(group.type)}</div>
              <h3 className="font-luxury mb-1 text-sm sm:text-base">Welcome to {group.name}</h3>
              <p className="text-xs sm:text-sm font-elegant">Start the conversation by sending a message</p>
              <div className="mt-3 sm:mt-4 text-xs text-gray-400 space-y-1">
                <p className="hidden sm:block">💡 You can drag and drop files to share them</p>
                <p>💬 Click reply on any message to start a thread</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUser={user}
                isFirstInGroup={index === 0 || messages[index - 1].userId !== message.userId}
                isLastInGroup={index === messages.length - 1 || messages[index + 1]?.userId !== message.userId}
                onReply={() => handleReplyToMessage(message)}
                replyToMessage={message.replyTo ? messages.find(m => m.id === message.replyTo) : undefined}
              />
            ))}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-2 sm:p-3 md:p-4">
        {/* Reply Preview */}
        {replyToMessage && (
          <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-700">
                Replying to {replyToMessage.senderName || 'Unknown User'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearReply}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-blue-600 hover:text-blue-800"
                data-testid="button-clear-reply"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-blue-800 truncate bg-white p-1.5 sm:p-2 rounded">
              {replyToMessage.content}
            </p>
          </div>
        )}

        {/* File Preview Area */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-white rounded border">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {isUploading && (
              <div className="mt-2 sm:mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Uploading...</span>
                  <span className="text-xs text-gray-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5 sm:h-2" />
              </div>
            )}
            
            <div className="flex gap-2 mt-2 sm:mt-3">
              <Button
                onClick={handleUploadFiles}
                disabled={isUploading || !isConnected}
                className="bg-eduverse-blue hover:bg-eduverse-dark h-8 text-xs sm:text-sm"
                size="sm"
                data-testid="button-upload-files"
              >
                {isUploading ? 'Uploading...' : 'Send Files'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFileSelect}
                disabled={selectedFiles.length >= 5}
                className="h-8 text-xs sm:text-sm"
              >
                Add More
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-1.5 sm:gap-2 md:gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-0.5 sm:mb-1 md:mb-2 h-8 w-8 p-0 flex-shrink-0"
            onClick={handleFileSelect}
            disabled={!isConnected}
            data-testid="button-attach-file"
          >
            <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex-1 min-w-0">
            <Input
              placeholder={`Message ${group.name}...`}
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="min-h-[36px] sm:min-h-[40px] resize-none text-sm"
              data-testid="input-message"
              disabled={!isConnected}
            />
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-0.5 sm:mb-1 md:mb-2 h-8 w-8 p-0 flex-shrink-0 hidden sm:flex"
            disabled={!isConnected}
            title="Emoji (coming soon)"
          >
            <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && selectedFiles.length === 0) || !isConnected || isUploading}
            className="bg-eduverse-blue hover:bg-eduverse-dark mb-0.5 sm:mb-1 md:mb-2 h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
            size="sm"
            data-testid="button-send"
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-red-500 mt-1.5 sm:mt-2 flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            <span className="hidden sm:inline">Disconnected. Trying to reconnect...</span>
            <span className="sm:hidden">Disconnected</span>
          </p>
        )}
      </div>

      {/* Poll Modal */}
      {showPollModal && (
        <PollModal
          open={showPollModal}
          onClose={() => setShowPollModal(false)}
          group={group}
          user={user}
          onSendPoll={handleCreatePoll}
        />
      )}

      {/* Group Members Modal */}
      <GroupMembersModal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        group={group}
        currentUser={user}
      />

      {/* Group Settings Modal */}
      <GroupSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        group={group}
        currentUser={user}
        userRole={user?.role}
      />
    </div>
  );
}
