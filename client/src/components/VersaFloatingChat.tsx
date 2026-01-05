import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function VersaFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm Versa, your AI learning assistant! 🌟 Ask me anything about any subject - from math to history, science to literature. I'm here to help you learn!",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        throw new Error(errorData.message || errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group">
          {/* Pulsing glow effect */}
          <div className="absolute inset-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 opacity-40 blur-lg animate-pulse group-hover:opacity-60 transition-opacity" />
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span>Ask Versa anything!</span>
            </div>
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
          
          <Button
            onClick={() => setIsOpen(true)}
            className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-110 hover:shadow-purple-500/25 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border-2 border-white/20"
            size="icon"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse" />
              {/* Notification dot */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white" />
              </span>
            </div>
          </Button>
          
          {/* "AI" label */}
          <div className="absolute -left-2 -bottom-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
            AI
          </div>
        </div>
      )}

      {/* Chat Window - Enhanced Design */}
      {isOpen && (
        <Card className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[400px] h-[100vh] sm:h-[650px] sm:rounded-2xl shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-5 duration-300 border-0 overflow-hidden">
          {/* Header with gradient and particles effect */}
          <CardHeader className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-none sm:rounded-t-2xl pb-4 sm:pb-5 pt-4 sm:pt-6 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-bold">Versa</CardTitle>
                    <Badge className="bg-green-400/20 text-green-100 border-green-400/30 text-xs">
                      Online
                    </Badge>
                  </div>
                  <p className="text-sm text-white/80 flex items-center gap-1.5 mt-0.5">
                    <Zap className="h-3.5 w-3.5 text-yellow-300" />
                    Your AI Learning Companion
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
                onClick={() => setInputMessage("Help me understand my lesson")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Explain lesson
              </button>
              <button
                onClick={() => setInputMessage("Quiz me on this topic")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <Zap className="h-3.5 w-3.5" />
                Quiz me
              </button>
              <button
                onClick={() => setInputMessage("Give me study tips")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs text-white/90 whitespace-nowrap transition-colors border border-white/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Study tips
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
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
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
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
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
                  placeholder="Ask me anything..."
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
                <Sparkles className="h-3 w-3 text-purple-400" />
                <p className="text-[11px] text-gray-400">
                  Powered by Google Gemini AI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
