import React, { useState, useRef, useEffect } from "react";
import { X, Send, User, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { useTranslation } from "react-i18next";
import { MascotCompanion, useMascotState } from "@/components/MascotCompanion";
import { motion, AnimatePresence } from "framer-motion";

// ── ReactBits-style Tooltip ───────────────────────────────────────────
function AidenTooltip({ visible, isRTL }: { visible: boolean; isRTL: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`absolute bottom-full mb-4 pointer-events-none z-10 ${
            isRTL ? 'left-0' : 'right-0'
          }`}
          initial={{ opacity: 0, y: 8, scale: 0.88 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={  { opacity: 0, y: 6,  scale: 0.92  }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <div className="relative bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-2xl shadow-2xl whitespace-nowrap flex items-center gap-2.5">
            {/* animated dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            Chat with Aiden
          </div>
          {/* arrow */}
          <div className={`absolute top-full ${isRTL ? 'left-5' : 'right-5'} w-0 h-0
            border-l-[6px] border-l-transparent
            border-r-[6px] border-r-transparent
            border-t-[6px] border-t-slate-900`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function VersaFloatingChat() {
  const { t, i18n } = useTranslation('dashboard');
  const isRTL = i18n.language?.startsWith('ar') || i18n.dir() === 'rtl' || (typeof document !== "undefined" && document.documentElement.dir === "rtl");
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', content: "Hi! I'm Aiden, your AI Study Buddy 🦫 Ask me anything about your lessons!", isUser: false, timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [mascotState, triggerMascot] = useMascotState("idle");

  const handleOpen = () => {
    setIsOpen(true);
    setTooltipVisible(false);
    triggerMascot("wave", 1400);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    triggerMascot("thinking");  // start thinking animation

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
      const response = await fetch(apiEndpoint("/api/ai-chat/general"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          question: inputMessage,
          mode: "general" // General knowledge mode, not lesson-specific
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || t('failedToGetResponse'));
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      triggerMascot("happy", 1200);  // bounce when reply arrives
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: t('error'),
        description: error.message || t('failedToSendMessageRetry'),
        variant: "destructive"
      });

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: t('versaTemporaryIssue'),
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      triggerMascot("idle");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button - Enhanced Design */}
      {!isOpen && (
        <div className={`fixed bottom-4 sm:bottom-6 z-50 ${isRTL ? 'left-4 sm:left-6' : 'right-4 sm:right-6'}`}>

          {/* ReactBits tooltip */}
          <AidenTooltip visible={tooltipVisible} isRTL={isRTL} />

          {/* Mascot button — big, no circle */}
          <button
            onClick={handleOpen}
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            className="relative focus:outline-none"
            aria-label="Chat with Aiden"
          >
            <MascotCompanion state={mascotState} size={88} />
            {/* Online dot */}
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white" />
            </span>
          </button>
        </div>
      )}

      {/* Chat Window - Enhanced Design */}
      {isOpen && (
        <Card className={`fixed bottom-0 sm:bottom-6 w-full sm:w-[400px] h-[100vh] sm:h-[650px] sm:rounded-2xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-5 duration-300 border-0 overflow-hidden ${isRTL ? 'left-0 sm:left-6' : 'right-0 sm:right-6'}`}>
          {/* Header with gradient and particles effect */}
          <CardHeader className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-none sm:rounded-t-2xl pb-4 sm:pb-5 pt-4 sm:pt-6 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <MascotCompanion state={mascotState} size={48} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-bold">Aiden</CardTitle>
                    <Badge className="bg-green-400/20 text-green-100 border-green-400/30 text-xs">
                      {t('online')}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/80 flex items-center gap-1.5 mt-0.5">
                    <Zap className="h-3.5 w-3.5 text-yellow-300" />
                    {t('aiLearningCompanion')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Quick action chips */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 relative z-10">
              <button
                onClick={() => setInputMessage(t('quickPromptExplainLesson'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {t('explainLesson')}
              </button>
              <button
                onClick={() => setInputMessage(t('quickPromptQuizMe'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <Zap className="h-3.5 w-3.5" />
                {t('quizMe')}
              </button>
              <button
                onClick={() => setInputMessage(t('quickPromptStudyTips'))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <img src="/images/mascot.png" alt="" className="h-3.5 w-3.5 object-contain" />
                {t('studyTips')}
              </button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 sm:p-5">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.isUser && (
                      <MascotCompanion state="idle" size={36} />  
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.isUser
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-md'
                          : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className={`text-[10px] mt-2 ${message.isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.isUser && (
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <MascotCompanion state="thinking" size={36} />
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" />
                        <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area - Enhanced */}
            <div className="border-t border-gray-100 p-4 bg-white">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('askMeAnythingPlaceholder')}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-200 bg-gray-50"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <MascotCompanion state="idle" size={16} />
                <p className="text-[11px] text-gray-400">
                  {t('poweredByGemini')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
