import { GroupChatLayout } from "@/components/group-chat/GroupChatLayout";

export default function GroupChat() {
  return (
    <>
      {/* SEO Meta Tags */}
      <title>EduVerse Group Chat - Collaborate & Learn Together</title>
      <meta name="description" content="Connect with classmates and teachers in EduVerse's interactive group chat. Share ideas, collaborate on projects, and learn together in real-time." />
      
      <div className="min-h-screen flex flex-col luxury-gradient pt-16 sm:pt-20">
        {/* Luxury Header */}
        <div className="relative py-3 sm:py-4 md:py-6 mb-2 sm:mb-3 md:mb-4" data-testid="group-chat-header">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-luxury text-white/90 mb-1 sm:mb-2 flex items-center justify-center gap-2 sm:gap-3 drop-shadow-2xl">
              <span className="text-2xl sm:text-3xl md:text-4xl animate-bounce">💬</span>
              <span className="hidden sm:inline">EduVerse Group Chat</span>
              <span className="sm:hidden">Group Chat</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/80 max-w-2xl mx-auto font-elegant drop-shadow-lg px-2">
              <span className="hidden sm:inline">Connect, collaborate, and learn together in real-time group conversations</span>
              <span className="sm:hidden">Connect and collaborate in real-time</span>
            </p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <GroupChatLayout />
        </div>
      </div>
    </>
  );
}
