import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  Loader2,
  RefreshCw,
  BookOpen,
  User,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface Persona {
  id: string;
  name: string;
}

/* ── Mascot avatar – reused everywhere ─────────────────────── */
function MascotAvatar({ size = 32, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <motion.div
      className="rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[var(--brand-primary-hex)] ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
      style={{ width: size, height: size }}
      animate={pulse ? { scale: [1, 1.06, 1] } : {}}
      transition={pulse ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <img
        src="/images/mascot.png"
        alt="AI Study Buddy mascot"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </motion.div>
  );
}

/* ── Typing dots ────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

export default function AIStudyBuddy() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState("alex");
  const [showTips, setShowTips] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPersonas();
    setMessages([
      {
        role: "assistant",
        content:
          "Hi there! I'm your AI Study Buddy — ask me anything about your lessons and I'll help you understand it better!",
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchPersonas = async () => {
    try {
      const response = await fetch(apiEndpoint("/api/ai-chat/personas"));
      if (response.ok) {
        const data = await response.json();
        setPersonas(data);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !token) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(apiEndpoint("/api/ai-chat/chat"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input, persona: selectedPersona }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I ran into an issue: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! Fire away with your next question.",
      },
    ]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col gap-4 h-[calc(100vh-7rem)]">

        {/* ── Page Header ─────────────────────────────────── */}
        <motion.div
          className="flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Left: mascot + title */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            >
              <MascotAvatar size={52} />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                AI Study Buddy
              </h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                Ask anything about your lessons
              </p>
            </div>
          </div>

          {/* Right: persona + actions */}
          <div className="flex items-center gap-2">
            {personas.length > 0 && (
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger className="w-44 h-9 text-xs rounded-lg border-slate-200 dark:border-white/10">
                  <SelectValue placeholder="Tutor style" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="h-9 gap-1.5 text-xs rounded-lg"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </motion.div>

        {/* ── Chat Window ─────────────────────────────────── */}
        <Card className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  className={`flex gap-3 items-end ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Avatar */}
                  {msg.role === "assistant" ? (
                    <MascotAvatar size={34} />
                  ) : (
                    <div className="flex-shrink-0 w-[34px] h-[34px] rounded-full bg-[var(--brand-primary-hex)] ring-2 ring-[var(--brand-primary-hex)] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-900" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <BookOpen className="h-3 w-3 text-slate-400 mt-0.5" />
                        {msg.sources.map((source, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] h-5 px-1.5 rounded-md"
                          >
                            {source}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading dots */}
            {loading && (
              <motion.div
                className="flex gap-3 items-end"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MascotAvatar size={34} pulse />
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <TypingDots />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ──────────────────────────────── */}
          <div className="border-t border-slate-100 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--brand-primary-hex)] transition-all">
              <MascotAvatar size={24} />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me about your lessons…"
                disabled={loading}
                className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm placeholder:text-slate-400"
              />
              <motion.button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-40 transition-opacity"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </motion.button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-2 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </Card>

        {/* ── Collapsible Tips ──────────────────────────── */}
        <motion.div
          className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setShowTips((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Tips for better answers
            </span>
            <motion.div animate={{ rotate: showTips ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <ul className="px-4 pb-4 pt-1 space-y-1.5 text-[13px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                  <li>Ask specific questions about concepts from your lessons</li>
                  <li>Try different tutor personalities for different learning styles</li>
                  <li>Check the source badges to see which lessons were referenced</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
