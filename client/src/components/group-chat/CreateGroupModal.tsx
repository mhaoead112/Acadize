import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiEndpoint } from '@/lib/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Loader2, Users, BookOpen, Megaphone, FolderOpen, Globe, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('');
  const [privacy, setPrivacy] = useState<string>('public');
  const [memberLimit, setMemberLimit] = useState<number>(100);
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowMemberInvite, setAllowMemberInvite] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { getAuthHeaders, user } = useAuth();

  const groupTypes = [
    { value: 'class', label: 'Class Discussion', icon: '🏫', description: 'Subject-based learning group' },
    { value: 'project', label: 'Project Team', icon: '📋', description: 'Collaborative project work' },
    { value: 'announcement', label: 'Announcements', icon: '📢', description: 'Important updates and news' },
    { value: 'study', label: 'Study Group', icon: '📚', description: 'Peer learning and support' }
  ];

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: '🌐', description: 'Anyone can discover and join' },
    { value: 'private', label: 'Private', icon: '🔒', description: 'Invite only, not discoverable' },
    { value: 'invite_only', label: 'Invite Only', icon: '📨', description: 'Discoverable but requires invitation' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !type) {
      setError('Please fill in all required fields');
      return;
    }

    if (memberLimit < 2 || memberLimit > 1000) {
      setError('Member limit must be between 2 and 1000');
      return;
    }

    setIsLoading(true);
    setError('');

    const requestData = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      privacy,
      memberLimit,
      requireApproval,
      allowMemberInvite
    };

    try {
      const response = await fetch(apiEndpoint('/api/groups'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to create group');
      }

      // Invalidate groups query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['public-groups'] });
      
      // Reset form and close modal
      setName('');
      setDescription('');
      setType('');
      setPrivacy('public');
      setMemberLimit(100);
      setRequireApproval(false);
      setAllowMemberInvite(true);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (typeValue: string) => {
    return groupTypes.find(t => t.value === typeValue)?.icon || '💬';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-eduverse-blue" />
            Create New Group
          </DialogTitle>
          <DialogDescription>
            Create a new group for collaboration, discussions, or announcements.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              type="text"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-group-name"
              disabled={isLoading}
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="group-type">
              Group Type <span className="text-red-500">*</span>
            </Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger data-testid="select-group-type">
                <SelectValue placeholder="Select a group type">
                  {type && (
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(type)}</span>
                      <span>{groupTypes.find(t => t.value === type)?.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groupTypes.map((groupType) => (
                  <SelectItem key={groupType.value} value={groupType.value}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{groupType.icon}</span>
                      <div>
                        <div className="font-medium">{groupType.label}</div>
                        <div className="text-xs text-gray-500">{groupType.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (Optional)</Label>
            <Textarea
              id="group-description"
              placeholder="Describe the purpose of this group"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="textarea-group-description"
              disabled={isLoading}
              maxLength={300}
              rows={3}
            />
            <div className="text-xs text-gray-500 text-right">
              {description.length}/300 characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-privacy">
              Privacy Settings <span className="text-red-500">*</span>
            </Label>
            <Select value={privacy} onValueChange={setPrivacy} disabled={isLoading}>
              <SelectTrigger data-testid="select-group-privacy">
                <SelectValue placeholder="Select privacy level">
                  {privacy && (
                    <div className="flex items-center gap-2">
                      <span>
                        {privacy === 'public' && <Globe className="h-4 w-4" />}
                        {privacy === 'private' && <Lock className="h-4 w-4" />}
                        {privacy === 'invite_only' && <Mail className="h-4 w-4" />}
                      </span>
                      <span>{privacyOptions.find(p => p.value === privacy)?.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map((privacyOption) => (
                  <SelectItem key={privacyOption.value} value={privacyOption.value}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{privacyOption.icon}</span>
                      <div>
                        <div className="font-medium">{privacyOption.label}</div>
                        <div className="text-xs text-gray-500">{privacyOption.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="member-limit">
              Member Limit: {memberLimit} members
            </Label>
            <Slider
              id="member-limit"
              min={2}
              max={1000}
              step={1}
              value={[memberLimit]}
              onValueChange={(value) => setMemberLimit(value[0])}
              disabled={isLoading}
              className="w-full"
              data-testid="slider-member-limit"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>2 members</span>
              <span>1000 members</span>
            </div>
          </div>

          {privacy !== 'private' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="require-approval"
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                  disabled={isLoading}
                  data-testid="checkbox-require-approval"
                />
                <Label htmlFor="require-approval" className="text-sm font-normal">
                  Require approval to join
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-member-invite"
                  checked={allowMemberInvite}
                  onCheckedChange={setAllowMemberInvite}
                  disabled={isLoading}
                  data-testid="checkbox-allow-member-invite"
                />
                <Label htmlFor="allow-member-invite" className="text-sm font-normal">
                  Allow members to invite others
                </Label>
              </div>
            </div>
          )}

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
              disabled={isLoading || !name.trim() || !type}
              className="flex-1 bg-eduverse-blue hover:bg-eduverse-dark"
              data-testid="button-create-group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
