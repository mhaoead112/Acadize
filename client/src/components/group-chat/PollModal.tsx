import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, BarChart3, Plus, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Group, User } from './types';

interface PollModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  user: User | null;
  onSendPoll: (pollData: any) => void;
}

export function PollModal({ open, onClose, group, user, onSendPoll }: PollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please enter a poll question');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      setError('Please provide at least 2 options');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const pollData = {
        question: question.trim(),
        options: validOptions,
        allowMultiple,
        anonymous,
        groupId: group.id,
        createdBy: user?.id
      };

      onSendPoll(pollData);
      
      // Reset form and close modal
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      setAnonymous(false);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create poll');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-eduverse-blue" />
            Create Poll for {group.name}
          </DialogTitle>
          <DialogDescription>
            Create an interactive poll to gather opinions and feedback from group members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poll-question">
              Poll Question <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="poll-question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              data-testid="textarea-poll-question"
              disabled={isLoading}
              maxLength={200}
              rows={2}
            />
          </div>
          
          <div className="space-y-3">
            <Label>
              Answer Options <span className="text-red-500">*</span>
            </Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    data-testid={`input-poll-option-${index}`}
                    disabled={isLoading}
                    maxLength={100}
                  />
                </div>
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    disabled={isLoading}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow-multiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setAllowMultiple(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="allow-multiple" className="text-sm">
                Allow multiple selections
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Anonymous responses
              </Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !question.trim() || options.filter(opt => opt.trim()).length < 2}
              className="flex-1 bg-eduverse-blue hover:bg-eduverse-dark"
              data-testid="button-create-poll"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Create Poll
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
