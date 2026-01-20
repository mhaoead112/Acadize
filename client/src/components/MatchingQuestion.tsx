import React from 'react';

interface MatchingQuestionProps {
  leftItems: string[];
  rightItems: string[];
  value: Record<string, string>;
  onChange: (matches: Record<string, string>) => void;
}

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  leftItems,
  rightItems,
  value,
  onChange
}) => {
  const handleMatchChange = (leftIndex: number, rightValue: string) => {
    const newMatches = { ...value, [leftIndex]: rightValue };
    onChange(newMatches);
  };

  return (
    <div className="matching-question">
      <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-4">
        Match each item on the left with the correct item on the right:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Items to Match */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-2">
            Items
          </h4>
          {leftItems.map((item, i) => (
            <div 
              key={i} 
              className="p-4 dark:bg-navy-dark dark:border-navy-border bg-slate-100 border border-slate-200 rounded-lg"
            >
              <span className="font-bold dark:text-primary text-yellow-600 mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              <span className="dark:text-white text-slate-900">{item}</span>
            </div>
          ))}
        </div>

        {/* Right Column - Dropdowns for Matching */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-2">
            Select Match
          </h4>
          {leftItems.map((_, i) => (
            <select
              key={i}
              className="w-full p-4 dark:bg-navy-dark dark:border-navy-border dark:text-white bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              value={value[i] || ''}
              onChange={(e) => handleMatchChange(i, e.target.value)}
            >
              <option value="">Select a match for {String.fromCharCode(65 + i)}...</option>
              {rightItems.map((item, j) => (
                <option key={j} value={j.toString()}>
                  {j + 1}. {item}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Reference List */}
      <div className="mt-6 p-4 dark:bg-navy-darker dark:border-navy-border bg-slate-50 border border-slate-200 rounded-lg">
        <h4 className="text-xs font-bold dark:text-slate-500 text-slate-600 uppercase tracking-wider mb-3">
          Reference - Options to Match
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rightItems.map((item, i) => (
            <div key={i} className="text-sm dark:text-slate-300 text-slate-700">
              <span className="font-bold dark:text-primary text-yellow-600 mr-2">{i + 1}.</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
