
import React, { useState, useEffect } from 'react';

// --- Types & Interfaces ---
enum EventType {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  LOG = 'LOG',
  INFO = 'INFO'
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  description: string;
}

interface QuestionData {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  maxPoints: number;
  currentScore: number;
  prompt: string;
  studentResponse: string;
  modelSolution: string;
  isLatex?: boolean;
}

// --- Mock Data ---
const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: '1', timestamp: '04:21:12', type: EventType.CRITICAL, title: 'DevTools Opened', description: 'User attempted to inspect DOM' },
  { id: '2', timestamp: '03:45:01', type: EventType.WARNING, title: 'Tab Switch Detected', description: 'Inactive window for 12s' },
  { id: '3', timestamp: '02:12:44', type: EventType.LOG, title: 'Large Paste Operation', description: '450 chars from clipboard' },
  { id: '4', timestamp: '01:05:00', type: EventType.INFO, title: 'Exam Started', description: 'Session initialized' }
];

const QUESTION_DATA: QuestionData[] = [
  {
    id: 1,
    title: 'Binary Search Implementation',
    difficulty: 'Hard',
    maxPoints: 20,
    currentScore: 18,
    prompt: 'Write an efficient function to find the index of a target value in a sorted array using binary search. Handle edge cases.',
    studentResponse: `function binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
    modelSolution: `function binarySearch(arr, target) {\n  let low = 0, high = arr.length - 1;\n  while (low <= high) {\n    let mid = Math.floor((low + high) / 2);\n    if (arr[mid] === target) return mid;\n    ...\n  }\n}`
  },
  {
    id: 2,
    title: 'Complexity Analysis',
    difficulty: 'Medium',
    maxPoints: 10,
    currentScore: 10,
    prompt: 'Define the Big O time complexity for the previous algorithm using formal notation.',
    studentResponse: 'T(n) = O(log_2 n)',
    modelSolution: 'O(log n)',
    isLatex: true
  }
];

// --- Sub-Components (Internal to the single file) ---

const Header: React.FC = () => (
  <header className="sticky top-0 z-50 glass-card border-b border-slate-700/50 px-6 py-3 flex items-center justify-between">
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 text-primary">
        <span className="material-symbols-outlined text-3xl filled">shield_person</span>
        <h1 className="font-bold text-xl tracking-tight hidden md:block">PROCTOR_v2.0</h1>
      </div>
      <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <a className="hover:text-primary transition-colors" href="#">Exams</a>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <a className="hover:text-primary transition-colors" href="#">JS Final</a>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="text-white">Review</span>
      </nav>
    </div>
    <div className="flex items-center gap-4">
      <div className="hidden lg:flex flex-col items-end mr-4">
        <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Reviewing Session</span>
        <span className="text-sm font-mono text-primary">ID: 8829-JX-ALPHA</span>
      </div>
      <button className="bg-primary hover:bg-yellow-500 text-black px-5 py-2 rounded font-bold text-sm transition-all shadow-[0_0_15px_rgba(249,212,6,0.2)] flex items-center gap-2">
        <span className="material-symbols-outlined text-base filled">verified</span>
        GRADE APPROVED
      </button>
      <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden">
        <img alt="Instructor" src="https://picsum.photos/seed/instructor/100/100" className="w-full h-full object-cover" />
      </div>
    </div>
  </header>
);

const SidebarLeft: React.FC = () => (
  <div className="flex flex-col gap-6">
    <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <img alt="Screen capture" className="w-full h-full object-cover opacity-80" src="https://picsum.photos/seed/code/800/450" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        <div className="absolute top-3 right-3 w-24 aspect-square rounded-lg border-2 border-primary/50 overflow-hidden shadow-lg bg-slate-900">
          <img alt="Webcam" className="w-full h-full object-cover" src="https://picsum.photos/seed/face/200/200" />
        </div>
        <button className="absolute inset-0 m-auto size-14 rounded-full bg-primary/20 text-primary border border-primary/50 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-4xl filled">play_arrow</span>
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="flex gap-1 h-1">
            <div className="bg-primary h-full w-1/3 rounded-full"></div>
            <div className="bg-amber-500 h-full w-1/12 rounded-full"></div>
            <div className="bg-slate-700 h-full flex-1 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>04:22</span>
            <div className="flex gap-3">
              <span className="text-primary">1.5x</span>
              <span className="material-symbols-outlined text-base cursor-pointer hover:text-white transition-colors">fullscreen</span>
            </div>
            <span>15:00</span>
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Activity Waveform</h3>
          <span className="text-[10px] text-primary">LIVE SCAN</span>
        </div>
        <div className="h-10 flex items-end gap-[1px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className={`${i > 10 && i < 18 ? (i === 15 ? 'bg-amber-500' : 'bg-primary') : 'bg-slate-700'} w-full transition-all duration-500`} style={{ height: `${Math.floor(Math.random() * 80) + 20}%` }} />
          ))}
        </div>
      </div>
    </div>

    <div className="glass-card rounded-xl p-4 flex-1">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl filled">history_edu</span>
        FORENSIC TIMELINE
      </h3>
      <div className="space-y-4">
        {TIMELINE_EVENTS.map((event) => (
          <div key={event.id} className={`relative pl-6 border-l py-1 ${event.type === EventType.CRITICAL ? 'border-red-500/30' : event.type === EventType.WARNING ? 'border-amber-500/30' : event.type === EventType.LOG ? 'border-primary/30' : 'border-slate-700'}`}>
            <div className={`absolute -left-[5px] top-2 size-2 rounded-full ${event.type === EventType.CRITICAL ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : event.type === EventType.WARNING ? 'bg-amber-500' : event.type === EventType.LOG ? 'bg-primary' : 'bg-slate-700'}`} />
            <div className="flex justify-between items-start">
              <span className={`text-[11px] font-mono ${event.type === EventType.CRITICAL ? 'text-red-400' : event.type === EventType.WARNING ? 'text-amber-400' : event.type === EventType.LOG ? 'text-primary' : 'text-slate-500'}`}>{event.timestamp}</span>
              {event.type !== EventType.INFO && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${event.type === EventType.CRITICAL ? 'bg-red-500/10 text-red-500 border-red-500/20' : event.type === EventType.WARNING ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>{event.type}</span>
              )}
            </div>
            <p className="text-sm mt-1 text-slate-200 font-medium">{event.title}</p>
            <p className="text-xs text-slate-500 italic">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const QuestionCard: React.FC<{ question: QuestionData }> = ({ question }) => {
  const [score, setScore] = useState(question.currentScore);
  return (
    <div className={`glass-card rounded-xl overflow-hidden border-l-4 ${question.id === 1 ? 'border-l-primary' : 'border-l-slate-700'}`}>
      <div className="bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className={`${question.id === 1 ? 'bg-primary text-black' : 'bg-slate-700 text-white'} font-bold size-7 flex items-center justify-center rounded-lg text-sm`}>{question.id}</span>
          <span className="font-semibold">{question.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">Difficulty: <span className={question.difficulty === 'Hard' ? 'text-amber-400 font-bold' : 'text-green-400 font-bold'}>{question.difficulty}</span></span>
          <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded">{score}/{question.maxPoints} PTS</span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-slate-300 text-sm leading-relaxed">{question.prompt}</p>
        {question.isLatex ? (
          <div className="bg-slate-900/80 p-6 rounded-lg border border-slate-800 text-center">
            <p className="text-2xl font-serif text-white italic">{question.studentResponse}</p>
            <p className="text-xs text-slate-500 mt-2 font-mono uppercase tracking-widest">Rendered LaTeX Output</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student Response</label>
              <pre className="bg-[#1a1b26] rounded-lg p-4 font-mono text-sm border border-slate-800 overflow-x-auto text-blue-400 whitespace-pre custom-scrollbar">{question.studentResponse}</pre>
            </div>
            <div className="space-y-2 opacity-60">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Solution</label>
              <pre className="bg-slate-900 rounded-lg p-4 font-mono text-sm border border-slate-800 overflow-x-auto text-slate-400 whitespace-pre custom-scrollbar">{question.modelSolution}</pre>
            </div>
          </div>
        )}
        <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-500 uppercase font-bold tracking-widest">Adjust Score</span>
              <span className="text-primary font-bold">{score} / {question.maxPoints}</span>
            </div>
            <input type="range" min="0" max={question.maxPoints} value={score} onChange={(e) => setScore(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" />
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setScore(Math.min(question.maxPoints, score + 1))} className="size-8 flex items-center justify-center rounded bg-slate-800 border border-slate-700 hover:border-primary transition-colors text-slate-400">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
            <button onClick={() => setScore(Math.max(0, score - 1))} className="size-8 flex items-center justify-center rounded bg-slate-800 border border-slate-700 hover:border-primary transition-colors text-slate-400">
              <span className="material-symbols-outlined text-xl">remove</span>
            </button>
            <button className="px-4 h-8 flex items-center justify-center rounded bg-primary text-black font-bold text-xs hover:bg-yellow-500 transition-colors">APPLY</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarRight: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  const addSnippet = (snippet: string) => setFeedback(prev => prev + (prev ? ' ' : '') + snippet);
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="glass-card rounded-xl p-6 text-center">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">AI PROCTOR RISK LEVEL</h3>
        <div className="relative inline-flex items-center justify-center size-32 mx-auto">
          <svg className="size-full" viewBox="0 0 100 100">
            <circle className="text-slate-800 stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8" />
            <circle className="text-amber-500 stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset="180" strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <div className="absolute flex flex-col">
            <span className="text-3xl font-bold text-white">28%</span>
            <span className="text-[10px] text-amber-500 font-bold uppercase">Low-Mod</span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs"><span className="text-slate-400">Eye Gaze Track</span><span className="text-green-400">Normal</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-400">Window Focus</span><span className="text-amber-400">Suspicious (3x)</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-400">Audio Interference</span><span className="text-green-400">None</span></div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-500 text-xl filled">schedule</span>
          <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Total Time Spent</p><p className="text-sm font-semibold">1h 14m 22s</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-500 text-xl filled">public</span>
          <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">IP Location</p><p className="text-sm font-semibold">Dublin, IE (82.11.x.x)</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-500 text-xl filled">devices</span>
          <div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">OS / Browser</p><p className="text-sm font-semibold">macOS 14 / Chrome 122</p></div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-col gap-4 flex-1 mb-10">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-lg filled text-primary">chat_bubble</span> INSTRUCTOR FEEDBACK
        </h3>
        <textarea className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-600 resize-none custom-scrollbar min-h-[150px]" placeholder="Type detailed feedback here..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Quick Snippets</p>
          <div className="flex flex-wrap gap-2">
            {['Great logic!', 'Optimization needed', 'Handle edge cases'].map(s => (
              <button key={s} onClick={() => addSnippet(s)} className="px-2 py-1 bg-slate-800 text-xs rounded border border-slate-700 hover:border-primary text-slate-400 transition-colors">{s}</button>
            ))}
          </div>
        </div>
        <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded font-bold text-sm border border-primary/30 transition-colors mt-auto">SEND FEEDBACK</button>
      </div>
    </div>
  );
};

const Footer: React.FC<{ systemTime: string }> = ({ systemTime }) => (
  <footer className="fixed bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500 z-[60]">
    <div className="flex gap-4">
      <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500 animate-pulse" /> SERVER CONNECTED</span>
      <span>LATENCY: 42ms</span>
    </div>
    <div>SYSTEM_TIME: {systemTime}</div>
  </footer>
);

// --- Main Consolidated Dashboard Component ---

const TeacherAttemptReview: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const formatted = now.toISOString().replace('T', '_').substring(0, 19) + '_UTC';
      setCurrentTime(formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f172a] text-slate-200 selection:bg-primary/30">
      <Header />
      
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 lg:p-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left: Surveillance & Timeline */}
        <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto custom-scrollbar">
          <SidebarLeft />
        </div>

        {/* Center: Student Profile & Responses */}
        <div className="col-span-12 lg:col-span-6 h-full overflow-y-auto custom-scrollbar px-2">
          <div className="flex flex-col gap-6 pb-20">
            {/* Student Profile Card */}
            <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="size-24 rounded-full border-2 border-primary p-1 animate-pulse-gold">
                  <img alt="Alex Sterling" className="w-full h-full rounded-full object-cover" src="https://picsum.photos/seed/student/200/200" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 size-5 rounded-full border-4 border-[#1e293b]" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white tracking-tight">Alex Sterling</h2>
                <p className="text-slate-400 text-sm">Attempt #1 • Finalized • <span className="text-primary">Submission ID: 290192</span></p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">Javascript Engine</span>
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">Data Visualization</span>
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20 font-bold">Verified Identity</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center border-l border-slate-700 pl-6 h-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Raw Score</p>
                <div className="text-4xl font-bold text-primary font-mono">88<span className="text-lg opacity-50">%</span></div>
                <p className="text-[10px] text-green-400 mt-1 uppercase font-bold tracking-tighter">+12% vs avg</p>
              </div>
            </div>

            {/* Questions Feed */}
            <div className="space-y-6">
              {QUESTION_DATA.map((q) => (
                <QuestionCard key={q.id} question={q} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Risk & Feedback */}
        <div className="col-span-12 lg:col-span-3 h-full overflow-y-auto custom-scrollbar">
          <SidebarRight />
        </div>
      </main>

      <Footer systemTime={currentTime} />
    </div>
  );
};

export default TeacherAttemptReview;
