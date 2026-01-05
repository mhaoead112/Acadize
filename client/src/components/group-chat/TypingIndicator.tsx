import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `User ${users[0].slice(-4)} is typing...`;
    } else if (users.length === 2) {
      return `${users.length} people are typing...`;
    } else {
      return `Several people are typing...`;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="text-xs bg-gray-300">
          ⌨️
        </AvatarFallback>
      </Avatar>
      
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{getTypingText()}</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
