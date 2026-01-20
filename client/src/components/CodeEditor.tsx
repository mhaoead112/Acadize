import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  maxLines?: number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  height = '400px',
  maxLines
}) => {
  const handleChange = (val: string | undefined) => {
    const newValue = val || '';
    if (maxLines) {
      const lineCount = newValue.split('\n').length;
      if (lineCount > maxLines) return;
    }
    onChange(newValue);
  };

  const lineCount = value.split('\n').length;

  return (
    <div className="code-editor">
      <div className="border dark:border-navy-border border-slate-300 rounded-lg overflow-hidden">
        <Editor
          height={height}
          language={language}
          value={value}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs dark:text-slate-500 text-slate-600">
        <span>Lines: {lineCount}</span>
        {maxLines && (
          <span className={lineCount > maxLines * 0.9 ? 'dark:text-orange-400 text-orange-600 font-bold' : ''}>
            {lineCount > maxLines * 0.9 && lineCount < maxLines && 'Approaching line limit'}
            {lineCount >= maxLines && 'Line limit reached'}
          </span>
        )}
      </div>
    </div>
  );
};
