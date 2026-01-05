import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { Send, Bot, User, Sparkles, GraduationCap, Zap, Heart, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  lessonId?: string;
  lessonTitle?: string;
}

interface ChatMessage {
  id: string;
  message: string;
  response?: string;
  isUser?: boolean;
  persona?: string;
}

// Persona definitions with avatars and colors
const PERSONAS = {
  alex: {
    id: 'alex',
    name: 'Alex',
    subtitle: 'The Fun Learner',
    emoji: '🎮',
    icon: Zap,
    color: 'from-amber-400 to-orange-500',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Makes learning fun with jokes & pop-culture!',
  },
  doctor: {
    id: 'doctor',
    name: 'Dr. Focus',
    subtitle: 'The Academic',
    emoji: '🎓',
    icon: GraduationCap,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Structured, detailed & methodical approach',
  },
  coach: {
    id: 'coach',
    name: 'Coach Inspire',
    subtitle: 'The Motivator',
    emoji: '💪',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    description: 'Your personal cheerleader & motivator!',
  }
};

type PersonaKey = keyof typeof PERSONAS;

export const StudyBuddyChat: React.FC<Props> = ({ lessonId, lessonTitle }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaKey>('alex');
  const [showPersonaSelector, setShowPersonaSelector] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentPersona = PERSONAS[selectedPersona];

  useEffect(() => {
    // Welcome message contextualized to lesson and persona
    const persona = PERSONAS[selectedPersona];
    const welcomeMessages: Record<PersonaKey, string> = {
      alex: `Hey there! 🎮 I'm Alex, your fun study buddy! Let's make "${lessonTitle || "this lesson"}" super interesting! Got questions? Hit me up! 🚀`,
      doctor: `Good day. I'm Dr. Focus. I'll help you understand "${lessonTitle || "this lesson"}" with clear, structured explanations. What would you like to explore?`,
      coach: `YOU'VE GOT THIS! 💪 I'm Coach Inspire, and together we'll conquer "${lessonTitle || "this lesson"}"! What's on your mind, champion?`
    };
    
    const welcome: ChatMessage = {
      id: "welcome",
      message: welcomeMessages[selectedPersona],
      isUser: false,
      persona: selectedPersona,
    };
    setMessages([welcome]);
    setShowPersonaSelector(true);
  }, [lessonId, lessonTitle, selectedPersona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    setShowPersonaSelector(false);

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      message: inputMessage, 
      isUser: true 
    };
    
    setMessages((s) => [...s, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
      const response = await fetch(apiEndpoint("/api/ai-chat/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          question: inputMessage,
          lessonId: lessonId,
          persona: selectedPersona
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: data.answer || "",
        isUser: false,
        persona: selectedPersona,
      };
      
      setMessages((s) => [...s, aiMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      toast({ 
        title: "Chat error", 
        description: err.message || "Failed to send message", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaChange = (persona: PersonaKey) => {
    setSelectedPersona(persona);
  };

  const PersonaAvatar = ({ persona, size = 'md' }: { persona: PersonaKey; size?: 'sm' | 'md' | 'lg' }) => {
    const p = PERSONAS[persona];
    const sizeClasses = {
      sm: 'h-8 w-8 text-lg',
      md: 'h-10 w-10 text-xl',
      lg: 'h-14 w-14 text-2xl'
    };
    
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
        <span>{p.emoji}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-[#0a192f] dark:via-[#112240] dark:to-[#0a192f]">
      {/* Persona Selector - Enhanced */}
      {showPersonaSelector && (
        <div className="p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 border-b border-purple-200/50 dark:border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
            <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 text-center uppercase tracking-wide">
              Choose Your Study Buddy
            </p>
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          <div className="flex gap-3 justify-center">
            {(Object.keys(PERSONAS) as PersonaKey[]).map((key) => {
              const p = PERSONAS[key];
              const isSelected = selectedPersona === key;
              const Icon = p.icon;
              return (
                <button
                  key={key}
                  onClick={() => handlePersonaChange(key)}
                  className={`group flex flex-col items-center p-3 rounded-2xl transition-all duration-300 min-w-[90px] ${
                    isSelected 
                      ? `bg-gradient-to-br ${p.color} shadow-lg shadow-${p.color}/30 scale-105 border-2 border-white/50` 
                      : 'bg-white/80 dark:bg-slate-800/50 border-2 border-slate-200/50 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md hover:scale-102'
                  }`}
                  title={p.description}
                >
                  <div className={`relative mb-2 ${isSelected ? 'animate-bounce' : ''}`}>
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-white/30 backdrop-blur-sm' 
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                    }`}>
                      {isSelected ? (
                        <span className="text-2xl">{p.emoji}</span>
                      ) : (
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-purple-600'}`} />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-bold mb-0.5 transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-purple-600'
                  }`}>
                    {p.name}
                  </span>
                  <span className={`text-[9px] font-medium text-center leading-tight ${
                    isSelected ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {p.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Messages - Enhanced */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((m) => {
            const msgPersona = m.persona ? PERSONAS[m.persona as PersonaKey] : currentPersona;
            
            return (
              <div key={m.id} className={m.isUser ? "flex justify-end gap-3 animate-in slide-in-from-right duration-300" : "flex gap-3 animate-in slide-in-from-left duration-300"}>
                {!m.isUser && (
                  <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${msgPersona.color} flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-white dark:ring-slate-800`}>
                    <span className="text-xl">{msgPersona.emoji}</span>
                  </div>
                )}
                {m.isUser ? (
                  <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-4 rounded-2xl rounded-tr-md max-w-[80%] shadow-xl shadow-purple-500/20 backdrop-blur-sm border border-white/20">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 border-2 border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl rounded-tl-md max-w-[85%] shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold bg-gradient-to-r ${msgPersona.color} bg-clip-text text-transparent`}>
                        {msgPersona.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">{msgPersona.subtitle}</span>
                    </div>
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  </div>
                )}
                {m.isUser && (
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white dark:ring-slate-800">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex gap-3 animate-in fade-in duration-300">
              <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${currentPersona.color} flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ring-white dark:ring-slate-800 animate-pulse`}>
                <span className="text-xl">{currentPersona.emoji}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 border-2 border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl rounded-tl-md shadow-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{currentPersona.name} is thinking</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Enhanced */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input 
            value={inputMessage} 
            onChange={(e) => setInputMessage(e.target.value)} 
            placeholder={`Ask ${currentPersona.name} anything...`}
            disabled={isLoading}
            className="flex-1 border-2 border-slate-200 dark:border-slate-700 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/30 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputMessage.trim()} 
            className={`bg-gradient-to-r ${currentPersona.color} hover:opacity-90 shadow-lg hover:shadow-xl transition-all h-10 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
        
        {/* Persona indicator - Enhanced */}
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Sparkles className="h-3 w-3 text-purple-400 dark:text-purple-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Chatting with</span>
          <button
            onClick={() => setShowPersonaSelector(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${currentPersona.color} hover:shadow-lg transition-all hover:scale-105`}
          >
            <span className="text-sm">{currentPersona.emoji}</span>
            <span className="text-xs font-bold text-white">
              {currentPersona.name}
            </span>
          </button>
          <Sparkles className="h-3 w-3 text-purple-400 dark:text-purple-500" />
        </div>
      </div>
    </div>
  );
};

export default StudyBuddyChat;
