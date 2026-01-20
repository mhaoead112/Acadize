import React from 'react';

interface FillBlankQuestionProps {
  questionText: string;
  value: string[];
  onChange: (answers: string[]) => void;
}

export const FillBlankQuestion: React.FC<FillBlankQuestionProps> = ({
  questionText,
  value,
  onChange
}) => {
  // Parse question text for blanks: "The ___ is ___" or "The [blank] is [blank]"
  const parts = questionText.split(/___|\[blank\]/i);
  const blankCount = parts.length - 1;

  // Initialize value array if empty
  const answers = value.length > 0 ? value : new Array(blankCount).fill('');

  const handleBlankChange = (index: number, text: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = text;
    onChange(newAnswers);
  };

  return (
    <div className="fill-blank-question">
      <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-4">
        Fill in the blank(s):
      </p>
      <div className="text-lg dark:text-slate-200 text-slate-800 leading-relaxed">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < blankCount && (
              <input
                type="text"
                className="inline-block mx-2 px-3 py-1 border-b-2 dark:border-primary dark:bg-navy-dark dark:text-white border-yellow-400 bg-transparent focus:outline-none dark:focus:bg-navy-darker focus:bg-yellow-50 transition-colors min-w-[120px]"
                value={answers[i] || ''}
                onChange={(e) => handleBlankChange(i, e.target.value)}
                placeholder={`Blank ${i + 1}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <p className="text-xs dark:text-slate-500 text-slate-600 mt-4">
        {blankCount} blank{blankCount !== 1 ? 's' : ''} to fill
      </p>
    </div>
  );
};
