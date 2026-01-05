import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings,
  Globe,
  Lock,
  Mail,
  Users,
  Shield,
  AlertTriangle,
  Save,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import type { Group, User } from '@shared/schema';

interface GroupSettingsModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  currentUser: User | null;
  userRole?: string;
}

export function GroupSettingsModal({ open, onClose, group, currentUser, userRole = 'member' }: GroupSettingsModalProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState(group.privacy);
  const [memberLimit, setMemberLimit] = useState(group.memberLimit);
  const [requireApproval, setRequireApproval] = useState(group.requireApproval);
  const [allowMemberInvite, setAllowMemberInvite] = useState(group.allowMemberInvite);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const canManageSettings = userRole === 'admin';

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: <Globe className="h-4 w-4" />, description: 'Anyone can discover and join' },
    { value: 'private', label: 'Private', icon: <Lock className="h-4 w-4" />, description: 'Invite only, not discoverable' },
    { value: 'invite_only', label: 'Invite Only', icon: <Mail className="h-4 w-4" />, description: 'Discoverable but requires invitation' }
  ];

  // Update group settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch(`/api/groups/${group.id}/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update group settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['public-groups'] });
      toast({
        title: "Success",
        description: "Group settings updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const handleSaveSettings = async () => {
    if (!canManageSettings) {
      toast({
        title: "Error",
        description: "You don't have permission to modify group settings",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (memberLimit < 2 || memberLimit > 1000) {
      setError('Member limit must be between 2 and 1000');
      return;
    }

    setIsLoading(true);
    setError('');

    const updatedSettings = {
      name: name.trim(),
      description: description.trim() || null,
      privacy,
      memberLimit,
      requireApproval,
      allowMemberInvite
    };

    updateSettingsMutation.mutate(updatedSettings);
    setIsLoading(false);
  };

  const resetToDefaults = () => {
    setName(group.name);
    setDescription(group.description || '');
    setPrivacy(group.privacy);
    setMemberLimit(group.memberLimit);
    setRequireApproval(group.requireApproval);
    setAllowMemberInvite(group.allowMemberInvite);
    setError('');
  };

  const hasChanges = () => {
    return (
      name !== group.name ||
      description !== (group.description || '') ||
      privacy !== group.privacy ||
      memberLimit !== group.memberLimit ||
      requireApproval !== group.requireApproval ||
      allowMemberInvite !== group.allowMemberInvite
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-eduverse-blue" />
            Group Settings - {group.name}
          </DialogTitle>
          <DialogDescription>
            Manage group information, privacy settings, and member permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="settings-group-name">
                Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="settings-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManageSettings || isLoading}
                maxLength={100}
                data-testid="input-settings-group-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-group-description">Description</Label>
              <Textarea
                id="settings-group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canManageSettings || isLoading}
                maxLength={300}
                rows={3}
                data-testid="textarea-settings-group-description"
              />
              <div className="text-xs text-gray-500 text-right">
                {description.length}/300 characters
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Privacy & Access</h3>
            
            <div className="space-y-2">
              <Label htmlFor="settings-privacy">Privacy Level</Label>
              <Select
                value={privacy}
                onValueChange={setPrivacy}
                disabled={!canManageSettings || isLoading}
              >
                <SelectTrigger data-testid="select-settings-privacy">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {privacyOptions.find(p => p.value === privacy)?.icon}
                      <span>{privacyOptions.find(p => p.value === privacy)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {privacyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-3">
                        {option.icon}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="settings-member-limit">
                Member Limit: {memberLimit} members
              </Label>
              <Slider
                id="settings-member-limit"
                min={2}
                max={1000}
                step={1}
                value={[memberLimit]}
                onValueChange={(value) => setMemberLimit(value[0])}
                disabled={!canManageSettings || isLoading}
                className="w-full"
                data-testid="slider-settings-member-limit"
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
                    id="settings-require-approval"
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                    disabled={!canManageSettings || isLoading}
                    data-testid="checkbox-settings-require-approval"
                  />
                  <Label htmlFor="settings-require-approval" className="text-sm font-normal">
                    Require approval to join
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="settings-allow-member-invite"
                    checked={allowMemberInvite}
                    onCheckedChange={setAllowMemberInvite}
                    disabled={!canManageSettings || isLoading}
                    data-testid="checkbox-settings-allow-member-invite"
                  />
                  <Label htmlFor="settings-allow-member-invite" className="text-sm font-normal">
                    Allow members to invite others
                  </Label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Group Stats */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Group Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="h-4 w-4" />
                  Members
                </div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-500">of {memberLimit} max</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Shield className="h-4 w-4" />
                  Created
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {new Date(group.createdAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">by you</div>
              </div>
            </div>
          </div>

          {canManageSettings && (
            <>
              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowDangerZone(!showDangerZone)}
                  className="w-full justify-between text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </span>
                </Button>

                {showDangerZone && (
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-900 mb-2">Delete Group</h4>
                    <p className="text-sm text-red-700 mb-3">
                      Once you delete a group, there is no going back. All messages, files, and member data will be permanently removed.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={isLoading}
                      data-testid="button-delete-group"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Group
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!canManageSettings && (
            <Alert>
              <AlertDescription>
                You need admin permissions to modify group settings.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {canManageSettings && hasChanges() && (
              <Button variant="ghost" onClick={resetToDefaults}>
                Reset
              </Button>
            )}
          </div>
          
          {canManageSettings && (
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading || !hasChanges()}
              className="bg-eduverse-blue hover:bg-eduverse-dark"
              data-testid="button-save-settings"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
