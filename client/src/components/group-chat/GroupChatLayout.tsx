import { useState, useEffect } from 'react';
import { GroupSidebar } from './GroupSidebar';
import { ChatArea } from './ChatArea';
import { AuthModal } from './AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Group, User } from '@shared/schema';

export function GroupChatLayout() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isAuthenticated, login, logout } = useAuth();
  const { 
    socket, 
    isConnected, 
    joinGroup, 
    leaveGroup, 
    sendMessage,
    onlineUsers,
    messages,
    typingUsers 
  } = useWebSocket(user?.id);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  const handleGroupSelect = (group: Group) => {
    if (selectedGroup) {
      leaveGroup(selectedGroup.id);
    }
    setSelectedGroup(group);
    if (user) {
      joinGroup(group.id, user.id);
    }
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const handleSendMessage = (content: string, messageType: string = 'text', metadata?: any) => {
    if (selectedGroup && user) {
      sendMessage({
        groupId: selectedGroup.id,
        userId: user.id,
        content,
        messageType,
        metadata
      });
    }
  };

  return (
    <div className="h-full flex flex-col mx-2 sm:mx-4 mb-2 sm:mb-4 luxury-card border-0 shadow-2xl overflow-hidden">
      {/* Offline Banner */}
      {!isConnected && (
        <div className="bg-red-500 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2" data-testid="offline-banner">
          <div className="animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span className="hidden sm:inline">Connection lost. Attempting to reconnect...</span>
          <span className="sm:hidden">Reconnecting...</span>
        </div>
      )}
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile: Show sidebar OR chat (fullscreen toggle) */}
        {/* Desktop: Show both side by side */}
        
        {/* Sidebar - Fullscreen on mobile when no group selected, side panel on desktop */}
        <div className={`
          ${selectedGroup ? 'hidden md:flex' : 'flex'}
          w-full md:w-72 lg:w-80
          bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm 
          md:border-r border-white/30 flex-col
          overflow-hidden
        `}>
        <GroupSidebar
          user={user}
          selectedGroup={selectedGroup}
          onGroupSelect={handleGroupSelect}
          onlineUsers={onlineUsers}
          onLogout={logout}
        />
      </div>

      {/* Main Chat Area - Fullscreen on mobile when group selected, side panel on desktop */}
      <div className={`
        ${selectedGroup ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col min-w-0
        overflow-hidden
      `}>
        {selectedGroup ? (
          <ChatArea
            group={selectedGroup}
            user={user}
            messages={messages[selectedGroup.id] || []}
            onSendMessage={handleSendMessage}
            typingUsers={typingUsers[selectedGroup.id] || []}
            isConnected={isConnected}
            onBackToGroups={handleBackToGroups}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm px-4">
            <div className="text-center">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">💬</div>
              <h2 className="text-xl sm:text-2xl font-luxury text-gray-700 mb-2">
                Welcome to EduVerse Group Chat
              </h2>
              <p className="text-sm sm:text-base text-gray-600 font-elegant">
                Select a group to start chatting with your classmates and teachers
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onLogin={login}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
