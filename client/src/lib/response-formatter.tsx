import { ReactNode } from 'react';
import { Lightbulb, Target, Brain, Palette, Star, Rocket, Sparkles, Terminal, FunctionSquare } from 'lucide-react';

// Code syntax highlighting patterns
const codeKeywords = [
  'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export',
  'def', 'print', 'int', 'str', 'float', 'bool', 'True', 'False', 'None',
  'public', 'private', 'static', 'void', 'main', 'String', 'int', 'boolean'
];

const codeStrings = /(".*?"|'.*?'|`.*?`)/g;
const codeNumbers = /\b\d+\.?\d*\b/g;
const codeComments = /(\/\/.*$|\/\*.*?\*\/|#.*$)/gm;
const codeFunctions = /(\w+)(?=\()/g;

interface HighlightedCodeProps {
  code: string;
  language?: string;
}

function HighlightedCode({ code, language = 'javascript' }: HighlightedCodeProps) {
  // Simple syntax highlighting
  let highlightedCode = code;
  
  // Highlight comments first (so they don't get affected by other highlighting)
  highlightedCode = highlightedCode.replace(codeComments, '<span class="comment">$1</span>');
  
  // Highlight strings
  highlightedCode = highlightedCode.replace(codeStrings, '<span class="string">$1</span>');
  
  // Highlight numbers
  highlightedCode = highlightedCode.replace(codeNumbers, '<span class="number">$1</span>');
  
  // Highlight keywords
  codeKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b(?![^<]*>)`, 'g');
    highlightedCode = highlightedCode.replace(regex, `<span class="keyword">${keyword}</span>`);
  });
  
  // Highlight function calls
  highlightedCode = highlightedCode.replace(codeFunctions, '<span class="function">$1</span>');
  
  return (
    <div className="eduverse-code-block">
      <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
        <span>{language}</span>
        <span className="flex items-center gap-1"><Terminal size={12} /> Code Example</span>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
}

interface MathEquationProps {
  equation: string;
}

function MathEquation({ equation }: MathEquationProps) {
  return (
    <div className="eduverse-math-equation">
      <div className="flex items-center justify-center mb-2 text-xs text-eduverse-blue">
        <span className="flex items-center gap-1"><FunctionSquare size={12} /> Mathematical Expression</span>
      </div>
      <div className="text-center font-mono text-lg">
        {equation}
      </div>
    </div>
  );
}

interface LearningWidgetProps {
  type: 'tip' | 'example' | 'practice' | 'visual';
  title: string;
  content: string;
}

function LearningWidget({ type, title, content }: LearningWidgetProps) {
  const getWidgetStyles = () => {
    switch (type) {
      case 'tip':
        return {
          classes: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800',
          icon: <Lightbulb className="text-green-600" size={20} />
        };
      case 'example':
        return {
          classes: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800',
          icon: <Target className="text-blue-600" size={20} />
        };
      case 'practice':
        return {
          classes: 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 text-purple-800',
          icon: <Brain className="text-purple-600" size={20} />
        };
      case 'visual':
        return {
          classes: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800',
          icon: <Palette className="text-orange-600" size={20} />
        };
      default:
        return {
          classes: 'bg-gray-50 border-gray-200 text-gray-800',
          icon: <Sparkles className="text-gray-600" size={20} />
        };
    }
  };

  const style = getWidgetStyles();

  return (
    <div className={`border-l-4 p-4 my-4 rounded-r-lg ${style.classes} eduverse-interactive-hover`}>
      <div className="flex items-center mb-2">
        <span className="mr-2">{style.icon}</span>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm leading-relaxed">{content}</p>
    </div>
  );
}

export function formatEducationalResponse(response: string): ReactNode {
  // Split response into sections and format each one
  const sections: ReactNode[] = [];
  let currentText = response;

  // Extract and format code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: { match: string; language: string; code: string; index: number }[] = [];
  let match;
  
  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push({
      match: match[0],
      language: match[1] || 'text',
      code: match[2].trim(),
      index: match.index
    });
  }

  // Extract and format math equations
  const mathRegex = /\$\$(.*?)\$\$/g;
  const mathEquations: { match: string; equation: string; index: number }[] = [];
  
  while ((match = mathRegex.exec(response)) !== null) {
    mathEquations.push({
      match: match[0],
      equation: match[1].trim(),
      index: match.index
    });
  }

  // Extract learning widgets from structured text
  const tipRegex = /💡\s*\*\*(.*?)\*\*\s*\n(.*?)(?=\n|$)/g;
  const exampleRegex = /🎯\s*\*\*(.*?)\*\*\s*\n(.*?)(?=\n|$)/g;
  const practiceRegex = /🤔\s*\*\*(.*?)\*\*\s*\n(.*?)(?=\n|$)/g;
  const visualRegex = /🎨\s*\*\*(.*?)\*\*\s*\n(.*?)(?=\n|$)/g;

  const widgets: { match: string; component: ReactNode; index: number }[] = [];

  // Process tips
  while ((match = tipRegex.exec(response)) !== null) {
    widgets.push({
      match: match[0],
      component: <LearningWidget key={match.index} type="tip" title={match[1]} content={match[2]} />,
      index: match.index
    });
  }

  // Process examples
  while ((match = exampleRegex.exec(response)) !== null) {
    widgets.push({
      match: match[0],
      component: <LearningWidget key={match.index} type="example" title={match[1]} content={match[2]} />,
      index: match.index
    });
  }

  // Process practice
  while ((match = practiceRegex.exec(response)) !== null) {
    widgets.push({
      match: match[0],
      component: <LearningWidget key={match.index} type="practice" title={match[1]} content={match[2]} />,
      index: match.index
    });
  }

  // Process visual aids
  while ((match = visualRegex.exec(response)) !== null) {
    widgets.push({
      match: match[0],
      component: <LearningWidget key={match.index} type="visual" title={match[1]} content={match[2]} />,
      index: match.index
    });
  }

  // Combine all special elements and sort by index
  const allElements = [
    ...codeBlocks.map(cb => ({ ...cb, type: 'code', component: <HighlightedCode key={cb.index} code={cb.code} language={cb.language} /> })),
    ...mathEquations.map(eq => ({ ...eq, type: 'math', component: <MathEquation key={eq.index} equation={eq.equation} /> })),
    ...widgets.map(w => ({ ...w, type: 'widget' }))
  ].sort((a, b) => a.index - b.index);

  // Build the formatted response
  let lastIndex = 0;
  const result: ReactNode[] = [];

  allElements.forEach((element, i) => {
    // Add text before this element
    if (element.index > lastIndex) {
      const textContent = response.slice(lastIndex, element.index);
      if (textContent.trim()) {
        result.push(
          <div key={`text-${lastIndex}`} className="whitespace-pre-wrap text-gray-800">
            {textContent}
          </div>
        );
      }
    }

    // Add the special element
    result.push(element.component);

    lastIndex = element.index + element.match.length;
  });

  // Add remaining text
  if (lastIndex < response.length) {
    const textContent = response.slice(lastIndex);
    if (textContent.trim()) {
      result.push(
        <div key={`text-${lastIndex}`} className="whitespace-pre-wrap text-gray-800">
          {textContent}
        </div>
      );
    }
  }

  // If no special formatting was needed, return plain text
  if (result.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-gray-800">
        {response}
      </div>
    );
  }

  return <div className="space-y-2">{result}</div>;
}

// Study progress tracking component
export function StudyProgressTracker({ progress = 0, subject = 'General', streak = 0 }: { 
  progress?: number; 
  subject?: string; 
  streak?: number;
}) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-gradient-to-r from-eduverse-light to-white p-4 rounded-lg border border-eduverse-blue/20 my-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-eduverse-blue">{subject} Progress</h4>
          <p className="text-sm text-gray-600 flex items-center gap-1">Keep it up! <Star size={12} className="text-yellow-500 fill-yellow-500" /></p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Progress Ring */}
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 eduverse-progress-ring">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#e5e7eb"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                style={{
                  strokeDasharray,
                  strokeDashoffset,
                }}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-eduverse-blue">{progress}%</span>
            </div>
          </div>
          
          {/* Streak Counter */}
          <div className="text-center">
            <div className="eduverse-badge w-8 h-8 text-xs">
              {streak}
            </div>
            <p className="text-xs text-gray-500 mt-1">day streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
