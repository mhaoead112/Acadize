// server/src/services/study-groups.service.ts

import { db } from '../db/index.js';
import {
    studyGroups,
    groupMembers,
    conversations,
    conversationParticipants,
    messages,
    users,
    courses,
    enrollments,
    messageReadReceipts,
    userPresence
} from '../db/schema.js';
import { eq, and, or, desc, sql, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireTenantId } from '../utils/tenant-query.js';

// ==================== TYPE DEFINITIONS ====================

export interface CreateStudyGroupInput {
    name: string;
    description?: string;
    courseId?: string;
    memberIds?: string[];
    createdBy: string;
    organizationId: string;
}

export interface AddMembersInput {
    groupId: string;
    memberIds: string[];
    requestingUserId: string;
    organizationId: string;
}

export interface ModerateMemberInput {
    groupId: string;
    targetUserId: string;
    action: 'mute' | 'unmute' | 'restrict' | 'unrestrict';
    duration?: number;
    requestingUserId: string;
    organizationId: string;
}

export interface GetMessagesInput {
    conversationId: string;
    userId: string;
    limit?: number;
    before?: string;
    organizationId: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Verify group belongs to organization via course or creator
 */
async function verifyGroupTenant(groupId: string, organizationId: string): Promise<boolean> {
    const [group] = await db
        .select({
            groupId: studyGroups.id,
            courseOrgId: courses.organizationId,
            creatorOrgId: users.organizationId,
        })
        .from(studyGroups)
        .leftJoin(courses, eq(studyGroups.courseId, courses.id))
        .leftJoin(users, eq(studyGroups.createdBy, users.id))
        .where(eq(studyGroups.id, groupId))
        .limit(1);

    if (!group) return false;

    // Group must belong to org via course OR creator
    return (group.courseOrgId === organizationId) || (group.creatorOrgId === organizationId);
}

/**
 * Verify user is member of group
 */
async function verifyMembership(groupId: string, userId: string): Promise<boolean> {
    const [member] = await db
        .select()
        .from(groupMembers)
        .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
        ))
        .limit(1);

    return !!member;
}

/**
 * Verify user is admin of group
 */
async function verifyAdminRole(groupId: string, userId: string): Promise<boolean> {
    const [member] = await db
        .select()
        .from(groupMembers)
        .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId),
            eq(groupMembers.role, 'admin')
        ))
        .limit(1);

    return !!member;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get all study groups for a user
 * Enforces tenant isolation
 */
export async function getUserStudyGroups(userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify user belongs to organization
    const [user] = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, userId),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!user) {
        throw new Error('User not found in organization');
    }

    const userGroups = await db
        .select({
            id: studyGroups.id,
            name: studyGroups.name,
            description: studyGroups.description,
            courseId: studyGroups.courseId,
            createdBy: studyGroups.createdBy,
            avatarUrl: studyGroups.avatarUrl,
            isActive: studyGroups.isActive,
            createdAt: studyGroups.createdAt,
            memberCount: sql<number>`COUNT(DISTINCT ${groupMembers.userId})`,
            userRole: groupMembers.role,
            conversationId: conversations.id,
        })
        .from(studyGroups)
        .leftJoin(groupMembers, eq(groupMembers.groupId, studyGroups.id))
        .leftJoin(conversations, eq(conversations.groupId, studyGroups.id))
        .leftJoin(courses, eq(studyGroups.courseId, courses.id))
        .leftJoin(users, eq(studyGroups.createdBy, users.id))
        .where(
            and(
                eq(groupMembers.userId, userId),
                eq(studyGroups.isActive, true),
                // TENANT ISOLATION: Group must belong to org via course OR creator
                or(
                    eq(courses.organizationId, orgId),
                    eq(users.organizationId, orgId),
                    isNull(studyGroups.courseId) // Groups without course checked via creator
                )!
            )
        )
        .groupBy(studyGroups.id, groupMembers.role, conversations.id);

    return userGroups;
}

/**
 * Create a new study group
 * Enforces tenant isolation
 */
export async function createStudyGroup(input: CreateStudyGroupInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify creator belongs to organization
    const [creator] = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, input.createdBy),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!creator) {
        throw new Error('Creator not found in organization');
    }

    // If courseId provided, verify it belongs to organization
    if (input.courseId) {
        const [course] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.id, input.courseId),
                eq(courses.organizationId, orgId)
            ))
            .limit(1);

        if (!course) {
            throw new Error('Course not found in organization');
        }
    }

    // Verify all members belong to organization
    if (input.memberIds && input.memberIds.length > 0) {
        const members = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
                inArray(users.id, input.memberIds),
                eq(users.organizationId, orgId)
            ));

        if (members.length !== input.memberIds.length) {
            throw new Error('Some members do not belong to this organization');
        }
    }

    // Create study group
    const [group] = await db.insert(studyGroups).values({
        id: createId(),
        name: input.name,
        description: input.description,
        courseId: input.courseId || null,
        createdBy: input.createdBy,
    }).returning();

    // Create conversation for the group
    const [conversation] = await db.insert(conversations).values({
        id: createId(),
        type: 'group',
        groupId: group.id,
    }).returning();

    // Add creator as admin
    await db.insert(groupMembers).values({
        id: createId(),
        groupId: group.id,
        userId: input.createdBy,
        role: 'admin',
    });

    // Add creator to conversation
    await db.insert(conversationParticipants).values({
        id: createId(),
        conversationId: conversation.id,
        userId: input.createdBy,
    });

    // Add other members
    if (input.memberIds && input.memberIds.length > 0) {
        const memberValues = input.memberIds.map((memberId: string) => ({
            id: createId(),
            groupId: group.id,
            userId: memberId,
            role: 'member' as const,
        }));

        await db.insert(groupMembers).values(memberValues);

        const participantValues = input.memberIds.map((memberId: string) => ({
            id: createId(),
            conversationId: conversation.id,
            userId: memberId,
        }));

        await db.insert(conversationParticipants).values(participantValues);
    }

    return {
        ...group,
        conversationId: conversation.id,
    };
}

/**
 * Get group details with members
 * Enforces tenant isolation and membership verification
 */
export async function getStudyGroupById(groupId: string, userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(groupId, orgId)) {
        return null;
    }

    // Verify user is a member
    if (!await verifyMembership(groupId, userId)) {
        throw new Error('Not authorized - user is not a member');
    }

    const [group] = await db
        .select()
        .from(studyGroups)
        .where(eq(studyGroups.id, groupId));

    if (!group) {
        return null;
    }

    // Get members
    const members = await db
        .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            role: users.role,
            groupRole: groupMembers.role,
            joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .innerJoin(users, eq(users.id, groupMembers.userId))
        .where(eq(groupMembers.groupId, groupId));

    // Get conversation
    const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.groupId, groupId));

    return {
        ...group,
        members,
        conversationId: conversation?.id,
    };
}

/**
 * Add members to a study group
 * Enforces tenant isolation and admin verification
 */
export async function addMembersToGroup(input: AddMembersInput) {
    const orgId = requireTenantId(input.organizationId);

    if (!input.memberIds || input.memberIds.length === 0) {
        throw new Error('Member IDs required');
    }

    // Verify group belongs to organization
    if (!await verifyGroupTenant(input.groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Verify user is admin
    if (!await verifyAdminRole(input.groupId, input.requestingUserId)) {
        throw new Error('Only group admins can add members');
    }

    // Verify all new members belong to organization
    const newMembers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            inArray(users.id, input.memberIds),
            eq(users.organizationId, orgId)
        ));

    if (newMembers.length !== input.memberIds.length) {
        throw new Error('Some users do not belong to this organization');
    }

    // Get conversation
    const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.groupId, input.groupId));

    // Check for existing members
    const existingMembers = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, input.groupId));

    const existingMemberIds = existingMembers.map(m => m.userId);
    const newMemberIds = input.memberIds.filter(id => !existingMemberIds.includes(id));

    if (newMemberIds.length === 0) {
        throw new Error('All users are already members');
    }

    // Add members
    const memberValues = newMemberIds.map((memberId: string) => ({
        id: createId(),
        groupId: input.groupId,
        userId: memberId,
        role: 'member' as const,
    }));

    await db.insert(groupMembers).values(memberValues);

    // Check existing conversation participants
    const existingParticipants = await db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversation.id));

    const existingParticipantIds = existingParticipants.map(p => p.userId);
    const newParticipantIds = newMemberIds.filter(id => !existingParticipantIds.includes(id));

    // Add to conversation
    if (newParticipantIds.length > 0) {
        const participantValues = newParticipantIds.map((memberId: string) => ({
            id: createId(),
            conversationId: conversation.id,
            userId: memberId,
        }));

        await db.insert(conversationParticipants).values(participantValues);
    }

    return {
        addedCount: newMemberIds.length,
        skippedCount: input.memberIds.length - newMemberIds.length,
    };
}

/**
 * Remove member from group
 * Enforces tenant isolation and authorization
 */
export async function removeMemberFromGroup(
    groupId: string,
    memberId: string,
    requestingUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Verify user is admin or removing themselves
    if (memberId !== requestingUserId) {
        if (!await verifyAdminRole(groupId, requestingUserId)) {
            throw new Error('Not authorized');
        }
    }

    await db
        .delete(groupMembers)
        .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, memberId)
        ));

    return { success: true };
}

/**
 * Promote member to admin
 * Enforces tenant isolation and creator verification
 */
export async function promoteMemberToAdmin(
    groupId: string,
    memberId: string,
    requestingUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Verify user is the group creator
    const [group] = await db
        .select({ createdBy: studyGroups.createdBy })
        .from(studyGroups)
        .where(eq(studyGroups.id, groupId))
        .limit(1);

    if (!group || group.createdBy !== requestingUserId) {
        throw new Error('Only group creator can promote members to admin');
    }

    // Promote member
    await db
        .update(groupMembers)
        .set({ role: 'admin' })
        .where(and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, memberId)
        ));

    return { success: true };
}

/**
 * Moderate group member
 * Enforces tenant isolation and admin verification
 */
export async function moderateMember(input: ModerateMemberInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(input.groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Verify user is admin
    if (!await verifyAdminRole(input.groupId, input.requestingUserId)) {
        throw new Error('Only admins can moderate members');
    }

    // Apply moderation action
    const updates: any = {};
    if (input.action === 'mute') {
        updates.isMuted = true;
        if (input.duration) {
            const mutedUntil = new Date();
            mutedUntil.setMinutes(mutedUntil.getMinutes() + input.duration);
            updates.mutedUntil = mutedUntil;
        }
    } else if (input.action === 'unmute') {
        updates.isMuted = false;
        updates.mutedUntil = null;
    } else if (input.action === 'restrict') {
        updates.isRestricted = true;
    } else if (input.action === 'unrestrict') {
        updates.isRestricted = false;
    }

    await db
        .update(groupMembers)
        .set(updates)
        .where(and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, input.targetUserId)
        ));

    return { success: true };
}

/**
 * Update group avatar
 * Enforces tenant isolation and admin verification
 */
export async function updateGroupAvatar(
    groupId: string,
    avatarUrl: string,
    requestingUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Verify user is admin
    if (!await verifyAdminRole(groupId, requestingUserId)) {
        throw new Error('Only admins can update group avatar');
    }

    await db
        .update(studyGroups)
        .set({ avatarUrl })
        .where(eq(studyGroups.id, groupId));

    return { avatarUrl };
}

/**
 * Get messages for a conversation
 * Enforces tenant isolation and participant verification
 */
export async function getConversationMessages(input: GetMessagesInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify user is participant
    const participant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
            eq(conversationParticipants.conversationId, input.conversationId),
            eq(conversationParticipants.userId, input.userId)
        ))
        .limit(1);

    if (participant.length === 0) {
        throw new Error('Not authorized - user is not a participant');
    }

    // Verify conversation belongs to organization (via group)
    const [conversation] = await db
        .select({
            conversationId: conversations.id,
            groupId: studyGroups.id,
            courseOrgId: courses.organizationId,
            creatorOrgId: users.organizationId,
        })
        .from(conversations)
        .leftJoin(studyGroups, eq(conversations.groupId, studyGroups.id))
        .leftJoin(courses, eq(studyGroups.courseId, courses.id))
        .leftJoin(users, eq(studyGroups.createdBy, users.id))
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

    if (conversation && conversation.groupId) {
        // TENANT ISOLATION: Verify via course or creator
        const belongsToOrg = (conversation.courseOrgId === orgId) || (conversation.creatorOrgId === orgId);
        if (!belongsToOrg) {
            throw new Error('Not authorized');
        }
    }

    const limit = input.limit || 50;

    const messagesList = await db
        .select({
            id: messages.id,
            conversationId: messages.conversationId,
            senderId: messages.senderId,
            senderName: users.fullName,
            senderUsername: users.username,
            type: messages.type,
            content: messages.content,
            fileUrl: messages.fileUrl,
            fileName: messages.fileName,
            fileSize: messages.fileSize,
            fileType: messages.fileType,
            isEdited: messages.isEdited,
            isDeleted: messages.isDeleted,
            createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(and(
            eq(messages.conversationId, input.conversationId),
            eq(messages.isDeleted, false)
        ))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

    return messagesList.reverse();
}

/**
 * Delete message (soft delete)
 * Enforces tenant isolation and authorization
 */
export async function deleteMessage(
    groupId: string,
    messageId: string,
    requestingUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify group belongs to organization
    if (!await verifyGroupTenant(groupId, orgId)) {
        throw new Error('Group not found');
    }

    // Check if user is admin or message owner
    const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

    if (!message) {
        throw new Error('Message not found');
    }

    const isOwner = message.senderId === requestingUserId;

    if (!isOwner) {
        // Check if user is admin
        if (!await verifyAdminRole(groupId, requestingUserId)) {
            throw new Error('Not authorized to delete this message');
        }
    }

    // Soft delete
    await db
        .update(messages)
        .set({ isDeleted: true, content: '[Message deleted]' })
        .where(eq(messages.id, messageId));

    return { success: true };
}

/**
 * Get or create direct conversation
 * Enforces tenant isolation
 */
export async function getOrCreateDirectConversation(
    userId: string,
    targetUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify both users belong to organization
    const bothUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            inArray(users.id, [userId, targetUserId]),
            eq(users.organizationId, orgId)
        ));

    if (bothUsers.length !== 2) {
        throw new Error('Users not found in organization');
    }

    // Find existing direct conversation
    const existingConversations = await db
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId));

    const conversationIds = existingConversations.map(c => c.conversationId);

    if (conversationIds.length > 0) {
        const directConversation = await db
            .select({
                id: conversations.id,
                participantCount: sql<number>`COUNT(${conversationParticipants.userId})`,
            })
            .from(conversations)
            .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
            .where(and(
                eq(conversations.type, 'direct'),
                inArray(conversations.id, conversationIds)
            ))
            .groupBy(conversations.id)
            .having(sql`COUNT(${conversationParticipants.userId}) = 2`);

        for (const conv of directConversation) {
            const participants = await db
                .select({ userId: conversationParticipants.userId })
                .from(conversationParticipants)
                .where(eq(conversationParticipants.conversationId, conv.id));

            const participantIds = participants.map(p => p.userId);
            if (participantIds.includes(userId) && participantIds.includes(targetUserId)) {
                return { conversationId: conv.id };
            }
        }
    }

    // Create new direct conversation
    const [conversation] = await db.insert(conversations).values({
        id: createId(),
        type: 'direct',
    }).returning();

    await db.insert(conversationParticipants).values([
        { id: createId(), conversationId: conversation.id, userId },
        { id: createId(), conversationId: conversation.id, userId: targetUserId },
    ]);

    return { conversationId: conversation.id };
}

/**
 * Auto-generate study groups for all courses
 * Enforces tenant isolation
 */
export async function autoGenerateStudyGroups(userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify user is teacher or admin in organization
    const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(and(
            eq(users.id, userId),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        throw new Error('Only teachers and admins can auto-generate groups');
    }

    // Get all courses in organization
    const allCourses = await db
        .select({
            id: courses.id,
            title: courses.title,
            description: courses.description,
        })
        .from(courses)
        .where(eq(courses.organizationId, orgId));

    const createdGroups = [];

    for (const course of allCourses) {
        // Check if auto-generated group already exists
        const existing = await db
            .select()
            .from(studyGroups)
            .where(and(
                eq(studyGroups.courseId, course.id),
                eq(studyGroups.autoGenerated, true)
            ))
            .limit(1);

        if (existing.length > 0) {
            continue; // Skip if already exists
        }

        // Create study group
        const [group] = await db.insert(studyGroups).values({
            id: createId(),
            name: `${course.title} - Study Group`,
            description: `Auto-generated study group for ${course.title}`,
            courseId: course.id,
            createdBy: userId,
            autoGenerated: true,
        }).returning();

        // Create conversation
        const [conversation] = await db.insert(conversations).values({
            id: createId(),
            type: 'group',
            groupId: group.id,
        }).returning();

        // Get all enrolled students
        const enrolledStudents = await db
            .select({ userId: enrollments.studentId })
            .from(enrollments)
            .where(eq(enrollments.courseId, course.id));

        // Add all enrolled students as members
        if (enrolledStudents.length > 0) {
            const memberValues = enrolledStudents.map(student => ({
                id: createId(),
                groupId: group.id,
                userId: student.userId,
                role: 'member' as const,
            }));

            await db.insert(groupMembers).values(memberValues);

            const participantValues = enrolledStudents.map(student => ({
                id: createId(),
                conversationId: conversation.id,
                userId: student.userId,
            }));

            await db.insert(conversationParticipants).values(participantValues);
        }

        // Add creator as admin
        await db.insert(groupMembers).values({
            id: createId(),
            groupId: group.id,
            userId,
            role: 'admin',
        });

        await db.insert(conversationParticipants).values({
            id: createId(),
            conversationId: conversation.id,
            userId,
        });

        createdGroups.push({ ...group, conversationId: conversation.id });
    }

    return {
        createdCount: createdGroups.length,
        groups: createdGroups,
    };
}

/**
 * Get user presence
 */
export async function getUserPresence(userId: string) {
    const [presence] = await db
        .select()
        .from(userPresence)
        .where(eq(userPresence.userId, userId))
        .limit(1);

    if (!presence) {
        return { status: 'offline', lastSeen: null };
    }

    return presence;
}

/**
 * Get read receipts for conversation
 * Enforces tenant isolation and participant verification
 */
export async function getConversationReadReceipts(
    conversationId: string,
    userId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify user is participant
    const participant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId)
        ))
        .limit(1);

    if (participant.length === 0) {
        throw new Error('Not authorized');
    }

    // Get read receipts grouped by message
    const receipts = await db
        .select({
            messageId: messageReadReceipts.messageId,
            userId: messageReadReceipts.userId,
            username: users.username,
            fullName: users.fullName,
            readAt: messageReadReceipts.readAt,
        })
        .from(messageReadReceipts)
        .innerJoin(users, eq(users.id, messageReadReceipts.userId))
        .innerJoin(messages, eq(messages.id, messageReadReceipts.messageId))
        .where(eq(messages.conversationId, conversationId));

    return receipts;
}
