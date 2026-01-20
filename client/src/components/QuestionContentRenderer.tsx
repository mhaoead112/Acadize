import React from 'react';
import 'katex/dist/katex.min.css';
import './QuestionRichEditor.css';

interface QuestionContentRendererProps {
  content: string;
  className?: string;
}

export default function QuestionContentRenderer({ content, className = '' }: QuestionContentRendererProps) {
  // If content is empty, return null
  if (!content) return null;

  return (
    <div 
      className={`question-content-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
