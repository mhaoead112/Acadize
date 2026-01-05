import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Laugh, ThumbsUp, MoreHorizontal, Reply, Pin } from 'lucide-react';
import type { GroupMessage, User } from '@shared/schema';

interface MessageBubbleProps {
  message: GroupMessage;
  currentUser: User | null;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export function MessageBubble({ message, currentUser, isFirstInGroup, isLastInGroup }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const isOwnMessage = currentUser?.id === message.userId;
  
  // Mock user data - in real app, this would come from user lookup
  const messageUser = {
    id: message.userId,
    name: message.userId === currentUser?.id ? 'You' : `User ${message.userId.slice(-4)}`,
    role: message.userId === currentUser?.id ? currentUser?.role : 'student',
    avatar: message.userId === currentUser?.id ? 
      currentUser?.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 
      `U${message.userId.slice(-2)}`
  };

  const getUserRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageBubbleStyle = () => {
    if (isOwnMessage) {
      return 'bg-eduverse-blue text-white ml-auto';
    } else if (messageUser.role === 'teacher' || messageUser.role === 'admin') {
      return 'bg-purple-100 text-purple-900 border border-purple-200';
    } else {
      return 'bg-white text-gray-900 border border-gray-200';
    }
  };

  const reactions = [
    { emoji: '👍', count: 2, hasReacted: false },
    { emoji: '❤️', count: 1, hasReacted: true },
  ];

  return (
    <div className={`flex gap-3 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (
        <div className="flex-shrink-0">
          {isLastInGroup ? (
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-gray-200">
                {messageUser.avatar}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : ''}`}>
        {/* User info and timestamp (only show for first message in group) */}
        {isFirstInGroup && !isOwnMessage && (
          <div className="flex items-center gap-2 mb-1 ml-2">
            <span className="text-sm font-medium text-gray-900">
              {messageUser.name}
            </span>
            {(messageUser.role === 'teacher' || messageUser.role === 'admin') && (
              <Badge variant="secondary" className={`text-xs ${getUserRoleColor(messageUser.role)}`}>
                {messageUser.role === 'teacher' ? '👩‍🏫' : '👨‍💼'} {messageUser.role}
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div className={`
          relative rounded-2xl px-4 py-2 shadow-sm
          ${getMessageBubbleStyle()}
          ${isFirstInGroup ? (isOwnMessage ? 'rounded-tr-md' : 'rounded-tl-md') : ''}
          ${isLastInGroup ? (isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md') : ''}
        `}>
          {/* Message content */}
          <div className="break-words">
            {message.content}
          </div>

          {/* Message metadata */}
          {message.messageType !== 'text' && (
            <div className="mt-2 text-xs opacity-75">
              {message.messageType === 'poll' && '📊 Poll'}
              {message.messageType === 'file' && '📎 File'}
              {message.messageType === 'voice' && '🎤 Voice message'}
            </div>
          )}

          {/* Pinned indicator */}
          {message.isPinned && (
            <div className="absolute -top-2 -right-2">
              <div className="bg-yellow-400 text-yellow-900 rounded-full p-1">
                <Pin className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex items-center gap-1 mt-1 ml-2">
            {reactions.map((reaction, index) => (
              <button
                key={index}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-full text-xs
                  transition-colors border
                  ${reaction.hasReacted 
                    ? 'bg-eduverse-blue/10 border-eduverse-blue text-eduverse-blue' 
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp for own messages */}
        {isOwnMessage && isLastInGroup && (
          <div className="text-xs text-gray-500 text-right mt-1 mr-2">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Message actions (visible on hover) */}
      <div className={`
        flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity
        ${isOwnMessage ? 'order-0' : ''}
      `}>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Heart className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Reply className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>

      {/* Own message avatar */}
      {isOwnMessage && (
        <div className="flex-shrink-0 order-2">
          {isLastInGroup ? (
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-eduverse-blue text-white">
                {messageUser.avatar}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}
    </div>
  );
}
