import React from 'react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
}

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved
}) => {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <div className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" />
          <span className="dark:text-slate-400 text-slate-600">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <span className="text-green-500">✓</span>
          <span className="dark:text-slate-400 text-slate-600">
            Saved {lastSaved && formatTimeAgo(lastSaved)}
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <span className="text-red-500">⚠</span>
          <span className="text-red-500">Failed to save</span>
        </>
      )}
    </div>
  );
};
