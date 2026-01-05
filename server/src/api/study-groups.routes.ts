import { Router } from 'express';
import { db } from '../db/index.js';
import { studyGroups, groupMembers, conversations, conversationParticipants, messages, users, courses, enrollments, messageReadReceipts, userPresence } from '../db/schema.js';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { createId } from '@paralleldrive/cuid2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// GET /api/study-groups - Get all groups user is part of
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

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
      .where(
        and(
          eq(groupMembers.userId, userId),
          eq(studyGroups.isActive, true)
        )
      )
      .groupBy(studyGroups.id, groupMembers.role, conversations.id);

    res.json(userGroups);
  } catch (error) {
    console.error('Error fetching study groups:', error);
    res.status(500).json({ error: 'Failed to fetch study groups' });
  }
});

// POST /api/study-groups - Create a new study group
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, courseId, memberIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create study group
    const [group] = await db.insert(studyGroups).values({
      id: createId(),
      name,
      description,
      courseId: courseId || null,
      createdBy: userId,
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
      userId,
      role: 'admin',
    });

    // Add creator to conversation
    await db.insert(conversationParticipants).values({
      id: createId(),
      conversationId: conversation.id,
      userId,
    });

    // Add other members
    if (memberIds.length > 0) {
      const memberValues = memberIds.map((memberId: string) => ({
        id: createId(),
        groupId: group.id,
        userId: memberId,
        role: 'member',
      }));

      await db.insert(groupMembers).values(memberValues);

      const participantValues = memberIds.map((memberId: string) => ({
        id: createId(),
        conversationId: conversation.id,
        userId: memberId,
      }));

      await db.insert(conversationParticipants).values(participantValues);
    }

    res.status(201).json({ 
      ...group, 
      conversationId: conversation.id 
    });
  } catch (error) {
    console.error('Error creating study group:', error);
    res.status(500).json({ error: 'Failed to create study group' });
  }
});

// GET /api/study-groups/:id - Get group details
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const [group] = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, id));

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
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
      .where(eq(groupMembers.groupId, id));

    // Get conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.groupId, id));

    res.json({
      ...group,
      members,
      conversationId: conversation?.id,
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

// POST /api/study-groups/:id/members - Add members to group
router.post('/:id/members', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs required' });
    }

    // Verify user is admin
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    // Get conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.groupId, id));

    // Check for existing members
    const existingMembers = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, id));

    const existingMemberIds = existingMembers.map(m => m.userId);
    const newMemberIds = memberIds.filter((id: string) => !existingMemberIds.includes(id));

    if (newMemberIds.length === 0) {
      return res.status(400).json({ error: 'All users are already members' });
    }

    // Add members
    const memberValues = newMemberIds.map((memberId: string) => ({
      id: createId(),
      groupId: id,
      userId: memberId,
      role: 'member',
    }));

    await db.insert(groupMembers).values(memberValues);

    // Check existing conversation participants
    const existingParticipants = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversation.id));

    const existingParticipantIds = existingParticipants.map(p => p.userId);
    const newParticipantIds = newMemberIds.filter((id: string) => !existingParticipantIds.includes(id));

    // Add to conversation
    if (newParticipantIds.length > 0) {
      const participantValues = newParticipantIds.map((memberId: string) => ({
        id: createId(),
        conversationId: conversation.id,
        userId: memberId,
      }));

      await db.insert(conversationParticipants).values(participantValues);
    }

    res.json({ 
      message: `Successfully added ${newMemberIds.length} member(s)`,
      addedCount: newMemberIds.length,
      skippedCount: memberIds.length - newMemberIds.length
    });
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// DELETE /api/study-groups/:id/members/:memberId - Remove member
router.delete('/:id/members/:memberId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, memberId } = req.params;

    // Verify user is admin or removing themselves
    if (memberId !== userId) {
      const membership = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, userId),
            eq(groupMembers.role, 'admin')
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        )
      );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/study-groups/conversations/:conversationId/messages - Get messages
router.get('/conversations/:conversationId/messages', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let query = db
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
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(Number(limit));

    const messagesList = await query;

    res.json(messagesList.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/study-groups/upload - Upload file for chat
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;
    
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size.toString(),
      fileType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// POST /api/study-groups/:id/avatar - Upload group avatar
router.post('/:id/avatar', isAuthenticated, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify user is admin
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only admins can update group avatar' });
    }

    const avatarUrl = `/uploads/chat/${req.file.filename}`;

    // Update group avatar
    await db
      .update(studyGroups)
      .set({ avatarUrl })
      .where(eq(studyGroups.id, id));

    res.json({ avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// GET /api/study-groups/direct/:userId - Get or create direct conversation
router.get('/direct/:targetUserId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.params;

    // Find existing direct conversation
    const existingConversations = await db
      .select({
        conversationId: conversationParticipants.conversationId,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = existingConversations.map((c: { conversationId: string }) => c.conversationId);

    if (conversationIds.length > 0) {
      const directConversation = await db
        .select({
          id: conversations.id,
          participantCount: sql<number>`COUNT(${conversationParticipants.userId})`,
        })
        .from(conversations)
        .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.type, 'direct'),
            inArray(conversations.id, conversationIds)
          )
        )
        .groupBy(conversations.id)
        .having(sql`COUNT(${conversationParticipants.userId}) = 2`);

      for (const conv of directConversation) {
        const participants = await db
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conv.id));

        const participantIds = participants.map((p: { userId: string }) => p.userId);
        if (participantIds.includes(userId) && participantIds.includes(targetUserId)) {
          return res.json({ conversationId: conv.id });
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

    res.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('Error getting direct conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// POST /api/study-groups/:id/members/:memberId/promote - Promote member to admin
router.post('/:id/members/:memberId/promote', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, memberId } = req.params;

    // Verify user is the group creator
    const [group] = await db
      .select({ createdBy: studyGroups.createdBy })
      .from(studyGroups)
      .where(eq(studyGroups.id, id))
      .limit(1);

    if (!group || group.createdBy !== userId) {
      return res.status(403).json({ error: 'Only group creator can promote members to admin' });
    }

    // Promote member
    await db
      .update(groupMembers)
      .set({ role: 'admin' })
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, memberId)
        )
      );

    res.json({ message: 'Member promoted to admin successfully' });
  } catch (error) {
    console.error('Error promoting member:', error);
    res.status(500).json({ error: 'Failed to promote member' });
  }
});

// POST /api/study-groups/:id/moderate - Moderate group member (mute/restrict)
router.post('/:id/moderate', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { targetUserId, action, duration } = req.body; // action: 'mute' | 'unmute' | 'restrict' | 'unrestrict'

    // Verify user is admin
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, userId),
          eq(groupMembers.role, 'admin')
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Only admins can moderate members' });
    }

    // Apply moderation action
    const updates: any = {};
    if (action === 'mute') {
      updates.isMuted = true;
      if (duration) {
        const mutedUntil = new Date();
        mutedUntil.setMinutes(mutedUntil.getMinutes() + duration);
        updates.mutedUntil = mutedUntil;
      }
    } else if (action === 'unmute') {
      updates.isMuted = false;
      updates.mutedUntil = null;
    } else if (action === 'restrict') {
      updates.isRestricted = true;
    } else if (action === 'unrestrict') {
      updates.isRestricted = false;
    }

    await db
      .update(groupMembers)
      .set(updates)
      .where(
        and(
          eq(groupMembers.groupId, id),
          eq(groupMembers.userId, targetUserId)
        )
      );

    res.json({ message: 'Moderation action applied successfully' });
  } catch (error) {
    console.error('Error moderating member:', error);
    res.status(500).json({ error: 'Failed to moderate member' });
  }
});

// DELETE /api/study-groups/:id/messages/:messageId - Delete message (moderation)
router.delete('/:id/messages/:messageId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, messageId } = req.params;

    // Check if user is admin or message owner
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isOwner = message.senderId === userId;
    
    if (!isOwner) {
      // Check if user is admin
      const membership = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, id),
            eq(groupMembers.userId, userId),
            eq(groupMembers.role, 'admin')
          )
        )
        .limit(1);

      if (membership.length === 0) {
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }
    }

    // Soft delete
    await db
      .update(messages)
      .set({ isDeleted: true, content: '[Message deleted]' })
      .where(eq(messages.id, messageId));

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/study-groups/auto-generate - Auto-generate study groups for all courses
router.post('/auto-generate', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Verify user is teacher or admin
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Only teachers and admins can auto-generate groups' });
    }

    // Get all courses
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description
      })
      .from(courses);

    const createdGroups = [];

    for (const course of allCourses) {
      // Check if auto-generated group already exists
      const existing = await db
        .select()
        .from(studyGroups)
        .where(
          and(
            eq(studyGroups.courseId, course.id),
            eq(studyGroups.autoGenerated, true)
          )
        )
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

    res.json({ 
      message: `Successfully created ${createdGroups.length} study groups`,
      groups: createdGroups 
    });
  } catch (error) {
    console.error('Error auto-generating groups:', error);
    res.status(500).json({ error: 'Failed to auto-generate study groups' });
  }
});

// GET /api/study-groups/presence/:userId - Get user presence
router.get('/presence/:userId', isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    const [presence] = await db
      .select()
      .from(userPresence)
      .where(eq(userPresence.userId, userId))
      .limit(1);

    if (!presence) {
      return res.json({ status: 'offline', lastSeen: null });
    }

    res.json(presence);
  } catch (error) {
    console.error('Error fetching presence:', error);
    res.status(500).json({ error: 'Failed to fetch user presence' });
  }
});

// GET /api/study-groups/conversations/:conversationId/read-receipts - Get read receipts for conversation
router.get('/conversations/:conversationId/read-receipts', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
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

    res.json(receipts);
  } catch (error) {
    console.error('Error fetching read receipts:', error);
    res.status(500).json({ error: 'Failed to fetch read receipts' });
  }
});

export default router;
