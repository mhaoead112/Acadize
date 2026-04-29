import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Shield, 
  User, 
  Search,
  MoreVertical,
  Trash2,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import type { Group, User as UserType, GroupMember } from './types';

interface GroupMembersModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  currentUser: UserType | null;
}

interface GroupMemberWithUser extends GroupMember {
  user?: UserType;
}

export function GroupMembersModal({ open, onClose, group, currentUser }: GroupMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  // Fetch group members
  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch group members');
      return response.json();
    },
    enabled: open
  });

  // Mock member data with user info (in real app, this would come from joined query)
  const membersWithUserInfo: GroupMemberWithUser[] = members.map((member: GroupMember) => ({
    ...member,
    user: {
      id: member.userId,
      fullName: `Member ${member.userId.slice(-4)}`,
      username: `user${member.userId.slice(-4)}`,
      email: `user${member.userId.slice(-4)}@example.com`,
      role: member.userId === currentUser?.id ? currentUser.role : 'student'
    } as UserType
  }));

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/groups/${group.id}/members/${userId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member role');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/groups/${group.id}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Add member mutation (mock implementation)
  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      // In real implementation, this would search for user by email and add them
      throw new Error('Add member functionality requires user lookup by email - not implemented yet');
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const filteredMembers = membersWithUserInfo.filter(member =>
    member.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentUserRole = membersWithUserInfo.find(m => m.userId === currentUser?.id)?.role || 'member';
  const canManageMembers = currentUserRole === 'admin' || currentUserRole === 'moderator';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'moderator': return <Shield className="h-4 w-4 text-blue-600" />;
      default: return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-100 text-yellow-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleRemoveMember = (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Error",
        description: "You cannot remove yourself from the group",
        variant: "destructive",
      });
      return;
    }
    removeMemberMutation.mutate(userId);
  };

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    addMemberMutation.mutate(newMemberEmail.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-eduverse-blue" />
            Manage Members - {group.name}
          </DialogTitle>
          <DialogDescription>
            Add, remove, and manage roles for group members. Current members: {members.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Add Member Section */}
          {canManageMembers && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add New Member
              </h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    data-testid="input-member-email"
                    disabled={addMemberMutation.isPending}
                  />
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending || !newMemberEmail.trim()}
                  data-testid="button-add-member"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
              <Alert>
                <AlertDescription className="text-xs">
                  Note: Add member functionality requires user lookup implementation
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Search Members */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-members"
            />
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No members found' : 'No members in this group'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  data-testid={`member-item-${member.userId}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-eduverse-blue text-white">
                      {member.user?.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {member.user?.fullName}
                        {member.userId === currentUser?.id && (
                          <span className="text-sm text-gray-500 ml-1">(You)</span>
                        )}
                      </p>
                      <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                        <span className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>@{member.user?.username}</span>
                      <span>•</span>
                      <span>{member.user?.email}</span>
                    </div>
                  </div>

                  {canManageMembers && member.userId !== currentUser?.id && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => handleRoleChange(member.userId, newRole)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          {currentUserRole === 'admin' && (
                            <SelectItem value="admin">Admin</SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-remove-${member.userId}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
