import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, User, Send, Info, Sparkles, Brain, Target, Lightbulb, Globe, Heart } from "lucide-react";
import { formatEducationalResponse, StudyProgressTracker } from "@/lib/response-formatter";

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  isUser: boolean;
  timestamp: Date;
  buddyType?: string;
  demoMode?: boolean;
}

interface StudyBuddy {
  id: string;
  name: string;
  personality: string;
  description: string;
  icon: any;
  color: string;
  welcomeMessage: string;
}

const studyBuddies: StudyBuddy[] = [
  {
    id: "funny",
    name: "Alex the Fun Learner",
    personality: "funny",
    description: "Makes learning fun with jokes, memes, and entertaining explanations!",
    icon: Sparkles,
    color: "from-yellow-500 to-orange-500",
    welcomeMessage: "Hey there, superstar! 🌟 I'm Alex, your fun-loving study buddy! Ready to turn boring lessons into exciting adventures? Let's make learning so fun, you'll forget you're even studying! What awesome topic should we dive into today? 🚀"
  },
  {
    id: "serious",
    name: "Dr. Focus",
    personality: "serious",
    description: "Structured, detailed, and methodical approach to deep learning.",
    icon: Brain,
    color: "from-blue-600 to-indigo-600",
    welcomeMessage: "Greetings, student. I am Dr. Focus, your dedicated academic companion. I am here to provide you with comprehensive, structured learning experiences. Together, we will master complex concepts through systematic analysis and methodical practice. What subject shall we explore with scholarly precision today?"
  },
  {
    id: "motivational",
    name: "Coach Inspire",
    personality: "motivational",
    description: "Your personal cheerleader who keeps you motivated and confident!",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    welcomeMessage: "Hey champion! 💪 I'm Coach Inspire, and I believe in YOU! Every great achiever started exactly where you are right now. You've got incredible potential, and I'm here to help you unlock it! Remember: You don't have to be perfect, you just have to start! What goal are we crushing today? 🏆"
  }
];

export default function AiChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedBuddy, setSelectedBuddy] = useState<StudyBuddy | null>(null);
  const [chatMode, setChatMode] = useState<'buddy' | 'simulation' | 'debate' | 'creative'>('buddy');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedBuddy) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        message: "",
        response: selectedBuddy.welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        buddyType: selectedBuddy.id,
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedBuddy]);

  // Check for demo mode on component mount
  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const response = await apiRequest("POST", "/api/chat", { 
          message: "demo check", 
          buddyType: "general", 
          chatMode: "buddy" 
        });
        const data = await response.json();
        if (data.demoMode !== undefined) {
          setIsDemoMode(data.demoMode);
        }
      } catch (error) {
        // If there's an error, assume demo mode for better UX
        setIsDemoMode(true);
      }
    };
    
    checkDemoMode();
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const chatData = {
        message,
        buddyType: selectedBuddy?.personality || 'general',
        chatMode: chatMode
      };
      const response = await apiRequest("POST", "/api/chat", chatData);
      return response.json();
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        message: data.message,
        response: data.response,
        isUser: false,
        timestamp: new Date(),
        buddyType: selectedBuddy?.id,
        demoMode: data.demoMode
      };
      setMessages(prev => [...prev, newMessage]);
      if (data.demoMode !== undefined) {
        setIsDemoMode(data.demoMode);
      }
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: inputMessage,
      response: "",
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Send to AI
    chatMutation.mutate(inputMessage);
    setInputMessage("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  const getBuddyQuestions = (personality: string): string[] => {
    switch (personality) {
      case 'funny':
        return [
          "Tell me a math joke! 😂",
          "Make chemistry fun to learn!",
          "What's the weirdest fact about space?",
          "Turn history into a fun story!"
        ];
      case 'serious':
        return [
          "Explain quantum mechanics principles",
          "Analyze literary themes in Shakespeare",
          "Discuss economic theory fundamentals",
          "Review advanced calculus concepts"
        ];
      case 'motivational':
        return [
          "How can I improve my study habits?",
          "Build my confidence in public speaking",
          "Overcome my fear of math!",
          "Set achievable academic goals"
        ];
      default:
        return [
          "Help me with my homework",
          "Explain this concept",
          "Study tips please",
          "How do I prepare for exams?"
        ];
    }
  };

  const suggestedQuestions = [
    "Help me understand quadratic equations",
    "What are effective study techniques?",
    "Explain photosynthesis in simple terms",
    "How do I write a strong essay?",
    "What is the IB curriculum?",
    "Tips for managing exam stress",
    "How do I prepare for university?",
    "Explain the water cycle",
    "What languages can I learn at EduVerse?",
    "Help with research methods",
    "Tell me about STEM programs",
    "How to improve my presentation skills"
  ];

  return (
    <div className="pt-24 luxury-gradient min-h-screen">
      {/* AI Chat Header with Enhanced Background */}
      <section className="py-20 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating geometric shapes */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute top-32 right-16 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-green-400 rounded-full opacity-15 animate-float"></div>
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-purple-400 rounded-full opacity-12 animate-pulse-slow"></div>
          
          {/* Circuit-like patterns */}
          <div className="absolute top-1/4 left-1/2 w-40 h-40 border-2 border-blue-300 rounded-lg opacity-10 transform rotate-45 animate-spin-slow"></div>
          <div className="absolute bottom-1/3 right-20 w-28 h-28 border-2 border-yellow-300 rounded-full opacity-15 animate-float"></div>
          
          {/* Tech/AI themed dots */}
          <div className="absolute top-16 left-1/3 flex space-x-2">
            <div className="w-2 h-2 bg-blue-300 rounded-full opacity-40 animate-ping animate-tech-glow"></div>
            <div className="w-2 h-2 bg-green-300 rounded-full opacity-40 animate-ping animate-tech-glow" style={{animationDelay: '0.5s'}}></div>
            <div className="w-2 h-2 bg-yellow-300 rounded-full opacity-40 animate-ping animate-tech-glow" style={{animationDelay: '1s'}}></div>
          </div>
          
          {/* Additional AI/Neural Network Visual */}
          <div className="absolute top-1/3 left-16 flex items-center space-x-4 opacity-20">
            <div className="w-3 h-3 bg-cyan-300 rounded-full animate-pulse"></div>
            <div className="w-px h-8 bg-cyan-300 animate-circuit"></div>
            <div className="w-4 h-4 bg-cyan-300 rounded-full animate-tech-glow"></div>
            <div className="w-px h-6 bg-cyan-300 animate-circuit" style={{animationDelay: '1s'}}></div>
            <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          {/* Binary pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 2px, transparent 2px)',
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bot className="text-white" size={48} />
            </div>
            <h1 className="text-4xl font-luxury text-white/90 mb-4 drop-shadow-2xl">🤖 EduVerse AI Study Buddy</h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto font-elegant drop-shadow-lg">
              Meet your new AI study companion! Choose your perfect learning buddy with a unique personality 
              that matches your style. They'll help with homework, explain concepts, and support your 
              educational journey with personalized interactions.
            </p>
          </div>
          
          {!selectedBuddy && (
            <div className="max-w-6xl mx-auto">
              {/* Demo Mode Banner for Selection Screen */}
              {isDemoMode && (
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-lg mb-8 text-center shadow-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Sparkles className="text-white" size={20} />
                    <span className="font-bold text-lg">🎭 Demo Mode Active!</span>
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <p className="mt-2 text-sm">
                    Experience the Study Buddy personalities with simulated responses! 
                    Each buddy has a unique style to make learning engaging and fun.
                  </p>
                </div>
              )}
              <h2 className="text-3xl font-luxury text-white/90 text-center mb-8 drop-shadow-lg">Choose Your Study Buddy!</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {studyBuddies.map((buddy) => {
                  const IconComponent = buddy.icon;
                  return (
                    <Card 
                      key={buddy.id}
                      className="luxury-card hover:scale-105 transition-all duration-400 cursor-pointer border-0 shadow-2xl text-white"
                      onClick={() => setSelectedBuddy(buddy)}
                      data-testid={`buddy-card-${buddy.id}`}
                    >
                      <CardContent className="p-8 text-center">
                        <div className={`w-20 h-20 bg-gradient-to-r ${buddy.color} rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in`}>
                          <IconComponent className="text-white" size={36} />
                        </div>
                        <h3 className="text-2xl font-luxury mb-4 text-[#1a1c25]">{buddy.name}</h3>
                        <p className="mb-6 leading-relaxed font-elegant text-[#23252f]">{buddy.description}</p>
                        <Button 
                          className="luxury-button bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:shadow-2xl transition-all duration-400 border-2 border-yellow-300/40 relative overflow-hidden font-luxury"
                          data-testid={`button-select-${buddy.id}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse"></div>
                          <span className="relative z-10">Choose {buddy.name.split(' ')[0]} ✨</span>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Feature Modes */}
              <div className="mt-16">
                <h3 className="text-2xl font-luxury text-white/90 text-center mb-8 drop-shadow-lg">🚀 Advanced AI Features Coming Soon!</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="luxury-card border-0 shadow-2xl text-white">
                    <CardContent className="p-6 text-center">
                      <Lightbulb className="mx-auto mb-4 text-yellow-400" size={32} />
                      <h4 className="font-luxury mb-2 text-[#23252f]">🧪 Interactive Simulations</h4>
                      <p className="text-sm font-elegant text-[#23252f]">Visual demos for science & math</p>
                    </CardContent>
                  </Card>
                  <Card className="luxury-card border-0 shadow-2xl text-white">
                    <CardContent className="p-6 text-center">
                      <Target className="mx-auto mb-4 text-red-400" size={32} />
                      <h4 className="font-luxury mb-2 text-[#23252f]">🎯 AI Debate Mode</h4>
                      <p className="text-sm font-elegant text-[#23252f]">Practice critical thinking</p>
                    </CardContent>
                  </Card>
                  <Card className="luxury-card border-0 shadow-2xl text-white">
                    <CardContent className="p-6 text-center">
                      <Globe className="mx-auto mb-4 text-green-400" size={32} />
                      <h4 className="font-luxury mb-2 text-[#23252f]">🌍 Global Classroom</h4>
                      <p className="text-sm font-elegant text-[#23252f]">Connect with students worldwide</p>
                    </CardContent>
                  </Card>
                  <Card className="luxury-card border-0 shadow-2xl text-white">
                    <CardContent className="p-6 text-center">
                      <Heart className="mx-auto mb-4 text-pink-400" size={32} />
                      <h4 className="font-luxury mb-2 text-[#23252f]">❤️ Emotion-Aware AI</h4>
                      <p className="text-sm font-elegant text-[#23252f]">Adapts to your mood & needs</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
          
          {selectedBuddy && (
            <div className="max-w-4xl mx-auto">
              {/* Chat Interface */}
              <Card className="luxury-card overflow-hidden border-0 shadow-2xl">
                {/* Demo Mode Banner */}
                {isDemoMode && (
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Sparkles className="text-white" size={16} />
                      <span className="font-semibold">🎭 Demo Mode Active!</span>
                      <span className="text-sm">Responses are simulated to showcase Study Buddy personalities</span>
                    </div>
                  </div>
                )}
                
                {/* Chat Header */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${selectedBuddy.color} rounded-full flex items-center justify-center`}>
                        <selectedBuddy.icon className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-luxury text-gray-800">
                          {selectedBuddy.name}
                          {isDemoMode && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Demo</span>}
                        </h3>
                        <p className="text-gray-600 font-elegant">{selectedBuddy.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>{isDemoMode ? 'Demo Ready!' : 'Online & Ready!'}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBuddy(null)}
                        data-testid="button-change-buddy"
                      >
                        Change Buddy
                      </Button>
                    </div>
                  </div>
                </div>
              
              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4" id="chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.isUser ? (
                      <div className="flex items-start space-x-3 justify-end">
                        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-4 max-w-md text-white shadow-lg">
                          <p>{msg.message}</p>
                        </div>
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="text-gray-600" size={16} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 bg-gradient-to-r ${selectedBuddy.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <selectedBuddy.icon className="text-white" size={16} />
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 max-w-md shadow-sm border border-gray-200">
                          {formatEducationalResponse(msg.response)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {chatMutation.isPending && (
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 bg-gradient-to-r ${selectedBuddy.color} rounded-full flex items-center justify-center flex-shrink-0 animate-pulse`}>
                      <selectedBuddy.icon className="text-white" size={16} />
                    </div>
                    <div className="bg-eduverse-light rounded-lg p-4 max-w-md">
                      <p className="text-gray-800">
                        {selectedBuddy.personality === 'funny' ? '🤔 Thinking of something awesome...' :
                         selectedBuddy.personality === 'serious' ? 'Analyzing your question thoroughly...' :
                         '💪 Working on the perfect answer for you!'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Study Progress Tracker (demo) */}
                {messages.length > 2 && selectedBuddy && (
                  <StudyProgressTracker 
                    progress={Math.min(85, messages.length * 10)} 
                    subject={selectedBuddy.name.includes('Fun') ? 'Fun Learning' : selectedBuddy.name.includes('Focus') ? 'Advanced Studies' : 'Motivation & Goals'}
                    streak={Math.floor(messages.length / 3)}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="border-t p-6">
                <form onSubmit={handleSubmit} className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder={selectedBuddy.personality === 'funny' ? "Ask me anything! Let's make learning fun! 🎉" :
                                   selectedBuddy.personality === 'serious' ? "Present your academic inquiry for thorough analysis." :
                                   "What challenge are we conquering today? 💪"}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={chatMutation.isPending}
                      className="focus:ring-2 focus:ring-eduverse-blue focus:border-transparent"
                      data-testid="input-chat-message"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className={`bg-gradient-to-r ${selectedBuddy.color} text-white hover:opacity-90 flex items-center space-x-2 transition-all`}
                    disabled={chatMutation.isPending || !inputMessage.trim()}
                    data-testid="button-send-message"
                  >
                    <Send size={16} />
                    <span>Send</span>
                  </Button>
                </form>
                
                {/* Buddy-Specific Suggested Questions */}
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {selectedBuddy.personality === 'funny' ? '🎈 Fun questions to try:' :
                     selectedBuddy.personality === 'serious' ? '📋 Recommended academic inquiries:' :
                     '🎯 Let\'s tackle these together:'}
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                    {getBuddyQuestions(selectedBuddy.personality).map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedQuestion(question)}
                        className={`text-xs hover:bg-gradient-to-r hover:${selectedBuddy.color} hover:text-white transition-colors`}
                        data-testid={`button-suggested-question-${index}`}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            </div>
          )}
            
          {/* AI Disclaimer */}
          <div className="mt-8 text-center">
            <p className="text-blue-100 text-sm flex items-center justify-center">
              <Info className="mr-2" size={16} />
              EduVerse AI focuses on educational support and learning assistance. For admissions, enrollment, and school administration, please contact our admissions team.
            </p>
          </div>
        </div>
        
        {/* Enhanced Bottom Background Section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-eduverse-dark to-transparent">
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating tech elements at bottom */}
            <div className="absolute bottom-5 left-1/4 w-6 h-6 border-2 border-blue-300 rotate-45 opacity-20 animate-spin"></div>
            <div className="absolute bottom-8 right-1/3 w-4 h-4 bg-yellow-300 rounded-full opacity-30 animate-ping"></div>
            <div className="absolute bottom-12 left-1/2 w-8 h-8 border border-green-300 rounded-full opacity-25 animate-pulse"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
