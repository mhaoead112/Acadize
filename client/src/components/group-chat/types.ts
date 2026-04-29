// Local type definitions for group-chat components
// These mirror the types that were previously imported from @shared/schema
// but are not actually exported by the shared schema module.

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  profilePicture?: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  type: string;
  createdBy: string;
  isPrivate?: boolean;
  privacy?: string;
  memberLimit?: number;
  requireApproval?: boolean;
  allowMemberInvite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  messageType: string;
  senderName?: string;
  isPinned?: boolean;
  replyTo?: string;
  metadata?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt?: string;
}
