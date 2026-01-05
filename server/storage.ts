// Import all table definitions from server schema (actual DB tables)
import {
  users,
  courses,
  enrollments,
  lessons,
  assignments,
  submissions,
  grades,
  announcements,
  reportCards,
  studyGroups as groups,
  groupMembers,
  conversations,
  conversationParticipants,
  messages as groupMessages,
  messageReadReceipts,
  userPresence,
  notifications,
  blockedUsers,
  reportedUsers,
  parentChildren,
  events,
  eventParticipants,
  attendance,
  parentTeacherMessages,
  parentTeacherConversations,
  pushSubscriptions,
  studyActivities,
  studyStreaks,
  applications,
  contacts,
  chatMessages,
  newsArticles,
  newsComments,
  staffProfiles,
  staffAchievements
} from "./src/db/schema.js";

// Import types from shared schema (for client compatibility)
import type {
  User,
  InsertUser,
  Course,
  InsertCourse,
  Enrollment,
  InsertEnrollment,
  Lesson,
  InsertLesson,
  Group,
  GroupMember,
  GroupMessage,
  InsertGroupMessage,
  Application,
  InsertApplication,
  Contact,
  InsertContact,
  ChatMessage,
  InsertChatMessage,
  FileAttachment,
  InsertFileAttachment,
  MessageReaction,
  InsertMessageReaction,
  GroupPoll,
  InsertGroupPoll,
  PollVote,
  InsertPollVote,
  RaiseHandRequest,
  InsertRaiseHandRequest,
  NewsArticle,
  InsertNewsArticle,
  EventRegistration,
  InsertEventRegistration,
  InsertGroup,
  InsertGroupMember,
  Event,
  InsertEvent,
  StaffProfile,
  InsertStaffProfile,
  StaffAchievement,
  InsertStaffAchievement,
  NewsComment,
  InsertNewsComment
} from "@shared/schema";

import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { db } from "./db/index.js";

export interface IStorage {
  // Applications
  createApplication(application: InsertApplication): Promise<Application>;
  getApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  
  // Contacts
  createContact(contact: InsertContact): Promise<Contact>;
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  
  // Chat Messages
  createChatMessage(chatMessage: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateLastLogin(userId: string): Promise<boolean>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUsersWithActiveResetTokens(): Promise<User[]>;
  clearPasswordResetToken(userId: string): Promise<boolean>;
  updatePassword(userId: string, password: string): Promise<boolean>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUsersWithActiveVerificationTokens(): Promise<User[]>;
  verifyEmail(userId: string): Promise<boolean>;
  updateUserRole(userId: string, newRole: string): Promise<boolean>;
  
  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  getUserGroups(userId: string): Promise<Group[]>;
  getPublicGroups(): Promise<Group[]>;
  updateGroupSettings(groupId: string, settings: any): Promise<boolean>;
  canUserJoinGroup(userId: string, groupId: string): Promise<{ canJoin: boolean; reason?: string }>;
  
  // Group Members
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<boolean>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  isGroupMember(userId: string, groupId: string): Promise<boolean>;
  updateMemberRole(groupId: string, userId: string, role: string): Promise<boolean>;
  getGroupMemberRole(groupId: string, userId: string): Promise<string | undefined>;
  getGroupMemberCount(groupId: string): Promise<number>;
  
  // Group Messages
  createGroupMessage(message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMessages(groupId: string): Promise<GroupMessage[]>;
  getGroupMessage(id: string): Promise<GroupMessage | undefined>;
  
  // Message Reactions
  addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<boolean>;
  getMessageReactions(messageId: string): Promise<MessageReaction[]>;
  
  // Group Polls
  createGroupPoll(poll: InsertGroupPoll): Promise<GroupPoll>;
  getGroupPoll(id: string): Promise<GroupPoll | undefined>;
  getGroupPolls(groupId: string): Promise<GroupPoll[]>;
  
  // Poll Votes
  addPollVote(vote: InsertPollVote): Promise<PollVote>;
  removePollVote(pollId: string, userId: string): Promise<boolean>;
  getPollVotes(pollId: string): Promise<PollVote[]>;
  
  // Raise Hand Requests
  createRaiseHandRequest(request: InsertRaiseHandRequest): Promise<RaiseHandRequest>;
  resolveRaiseHandRequest(id: string, resolvedBy: string): Promise<boolean>;
  getActiveRaiseHandRequests(groupId: string): Promise<RaiseHandRequest[]>;
  
  // File Attachments
  createFileAttachment(attachment: InsertFileAttachment): Promise<FileAttachment>;
  getFileAttachment(id: string): Promise<FileAttachment | undefined>;
  getMessageAttachments(messageId: string): Promise<FileAttachment[]>;
  incrementDownloadCount(id: string): Promise<boolean>;
  updateScanStatus(id: string, status: string): Promise<boolean>;
  deleteFileAttachment(id: string): Promise<boolean>;
  
  // News Articles
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  getNewsArticles(): Promise<NewsArticle[]>;
  getPublishedNewsArticles(): Promise<NewsArticle[]>;
  getNewsArticle(id: string): Promise<NewsArticle | undefined>;
  getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined>;
  updateNewsArticle(id: string, updates: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined>;
  deleteNewsArticle(id: string): Promise<boolean>;
  incrementNewsViews(id: string): Promise<boolean>;
  
  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvents(): Promise<Event[]>;
  getPublishedEvents(): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]>;
  
  // Event Registrations
  registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration>;
  getEventRegistrations(eventId: string): Promise<EventRegistration[]>;
  getUserEventRegistrations(userId: string): Promise<EventRegistration[]>;
  cancelEventRegistration(eventId: string, userId: string): Promise<boolean>;
  
  // News Comments
  createNewsComment(comment: InsertNewsComment): Promise<NewsComment>;
  getNewsComments(articleId: string): Promise<NewsComment[]>;
  approveNewsComment(id: string): Promise<boolean>;
  deleteNewsComment(id: string): Promise<boolean>;
  
  // Staff Profiles
  createStaffProfile(profile: InsertStaffProfile): Promise<StaffProfile>;
  getStaffProfiles(): Promise<StaffProfile[]>;
  getActiveStaffProfiles(): Promise<StaffProfile[]>;
  getStaffProfile(id: string): Promise<StaffProfile | undefined>;
  getStaffByDepartment(department: string): Promise<StaffProfile[]>;
  updateStaffProfile(id: string, updates: Partial<InsertStaffProfile>): Promise<StaffProfile | undefined>;
  deleteStaffProfile(id: string): Promise<boolean>;
  searchStaffProfiles(searchQuery: string): Promise<StaffProfile[]>;
  
  // Staff Achievements
  createStaffAchievement(achievement: InsertStaffAchievement): Promise<StaffAchievement>;
  getStaffAchievements(staffId: string): Promise<StaffAchievement[]>;
  getPublicStaffAchievements(staffId: string): Promise<StaffAchievement[]>;
  deleteStaffAchievement(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {

  // Applications
  async createApplication(insertApplication: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(insertApplication)
      .returning();
    return application;
  }

  async getApplications(): Promise<Application[]> {
    return await db.select().from(applications);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  // Contacts
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  // Chat Messages
  async createChatMessage(insertChatMessage: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values(insertChatMessage)
      .returning();
    return chatMessage;
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages);
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [chatMessage] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return chatMessage || undefined;
  }

  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateLastLogin(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async getUsersWithActiveResetTokens(): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.passwordResetToken} IS NOT NULL`,
          sql`${users.passwordResetExpires} IS NOT NULL`,
          sql`${users.passwordResetExpires} > NOW()`
        )
      );
    return result;
  }

  async clearPasswordResetToken(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async updatePassword(userId: string, password: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        password,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async getUsersWithActiveVerificationTokens(): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.emailVerificationToken} IS NOT NULL`,
          eq(users.emailVerified, false)
        )
      );
    return result;
  }

  async verifyEmail(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        emailVerified: true,
        emailVerificationToken: null, // Clear token after successful verification
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        role: newRole,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Groups
  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values(insertGroup)
      .returning();
    return group;
  }

  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const userGroupMembers = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const groupIds = userGroupMembers.map(member => member.groupId);
    if (groupIds.length === 0) return [];

    return await db
      .select()
      .from(groups)
      .where(inArray(groups.id, groupIds));
  }

  async getPublicGroups(): Promise<Group[]> {
    return await db
      .select()
      .from(groups)
      .where(and(eq(groups.isActive, true), eq(groups.privacy, 'public')));
  }

  async updateGroupSettings(groupId: string, settings: any): Promise<boolean> {
    const result = await db
      .update(groups)
      .set({ settings })
      .where(eq(groups.id, groupId));
    return (result.rowCount ?? 0) > 0;
  }

  async canUserJoinGroup(userId: string, groupId: string): Promise<{ canJoin: boolean; reason?: string }> {
    const group = await this.getGroup(groupId);
    if (!group) {
      return { canJoin: false, reason: 'Group not found' };
    }

    if (!group.isActive) {
      return { canJoin: false, reason: 'Group is not active' };
    }

    // Check if already a member
    const isMember = await this.isGroupMember(userId, groupId);
    if (isMember) {
      return { canJoin: false, reason: 'Already a member' };
    }

    // Check member limit
    const memberCount = await this.getGroupMemberCount(groupId);
    if (memberCount >= group.memberLimit) {
      return { canJoin: false, reason: 'Group is full' };
    }

    // Check privacy settings
    if (group.privacy === 'private') {
      return { canJoin: false, reason: 'Group is private' };
    }

    if (group.privacy === 'invite_only') {
      return { canJoin: false, reason: 'Group is invite only' };
    }

    return { canJoin: true };
  }

  // Group Members
  async addGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db
      .insert(groupMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
  }

  async isGroupMember(userId: string, groupId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    return !!member;
  }

  async updateMemberRole(groupId: string, userId: string, role: string): Promise<boolean> {
    const result = await db
      .update(groupMembers)
      .set({ role })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getGroupMemberRole(groupId: string, userId: string): Promise<string | undefined> {
    const [member] = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return member?.role;
  }

  async getGroupMemberCount(groupId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return result[0]?.count || 0;
  }

  // Group Messages
  async createGroupMessage(insertMessage: InsertGroupMessage): Promise<GroupMessage> {
    const [message] = await db
      .insert(groupMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    return await db
      .select()
      .from(groupMessages)
      .where(and(eq(groupMessages.groupId, groupId), eq(groupMessages.isDeleted, false)))
      .orderBy(asc(groupMessages.createdAt));
  }

  async getGroupMessage(id: string): Promise<GroupMessage | undefined> {
    const [message] = await db.select().from(groupMessages).where(eq(groupMessages.id, id));
    return message || undefined;
  }

  // Message Reactions
  async addMessageReaction(insertReaction: InsertMessageReaction): Promise<MessageReaction> {
    const [reaction] = await db
      .insert(messageReactions)
      .values(insertReaction)
      .returning();
    return reaction;
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const result = await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
  }

  // Group Polls
  async createGroupPoll(insertPoll: InsertGroupPoll): Promise<GroupPoll> {
    const [poll] = await db
      .insert(groupPolls)
      .values(insertPoll)
      .returning();
    return poll;
  }

  async getGroupPoll(id: string): Promise<GroupPoll | undefined> {
    const [poll] = await db.select().from(groupPolls).where(eq(groupPolls.id, id));
    return poll || undefined;
  }

  async getGroupPolls(groupId: string): Promise<GroupPoll[]> {
    return await db
      .select()
      .from(groupPolls)
      .where(eq(groupPolls.groupId, groupId));
  }

  // Poll Votes
  async addPollVote(insertVote: InsertPollVote): Promise<PollVote> {
    const [vote] = await db
      .insert(pollVotes)
      .values(insertVote)
      .returning();
    return vote;
  }

  async removePollVote(pollId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getPollVotes(pollId: string): Promise<PollVote[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
  }

  // Raise Hand Requests
  async createRaiseHandRequest(insertRequest: InsertRaiseHandRequest): Promise<RaiseHandRequest> {
    const [request] = await db
      .insert(raiseHandRequests)
      .values(insertRequest)
      .returning();
    return request;
  }

  async resolveRaiseHandRequest(id: string, resolvedBy: string): Promise<boolean> {
    const result = await db
      .update(raiseHandRequests)
      .set({
        isActive: false,
        resolvedBy,
        resolvedAt: new Date(),
      })
      .where(and(eq(raiseHandRequests.id, id), eq(raiseHandRequests.isActive, true)));
    return (result.rowCount ?? 0) > 0;
  }

  async getActiveRaiseHandRequests(groupId: string): Promise<RaiseHandRequest[]> {
    return await db
      .select()
      .from(raiseHandRequests)
      .where(and(eq(raiseHandRequests.groupId, groupId), eq(raiseHandRequests.isActive, true)))
      .orderBy(asc(raiseHandRequests.createdAt));
  }

  // File Attachments
  async createFileAttachment(insertAttachment: InsertFileAttachment): Promise<FileAttachment> {
    const [attachment] = await db
      .insert(fileAttachments)
      .values(insertAttachment)
      .returning();
    return attachment;
  }

  async getFileAttachment(id: string): Promise<FileAttachment | undefined> {
    const [attachment] = await db.select().from(fileAttachments).where(eq(fileAttachments.id, id));
    return attachment || undefined;
  }

  async getMessageAttachments(messageId: string): Promise<FileAttachment[]> {
    return await db
      .select()
      .from(fileAttachments)
      .where(eq(fileAttachments.messageId, messageId))
      .orderBy(asc(fileAttachments.createdAt));
  }

  async incrementDownloadCount(id: string): Promise<boolean> {
    const result = await db
      .update(fileAttachments)
      .set({ downloadCount: sql`${fileAttachments.downloadCount} + 1` })
      .where(eq(fileAttachments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateScanStatus(id: string, status: string): Promise<boolean> {
    const result = await db
      .update(fileAttachments)
      .set({ scanStatus: status })
      .where(eq(fileAttachments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteFileAttachment(id: string): Promise<boolean> {
    const result = await db
      .delete(fileAttachments)
      .where(eq(fileAttachments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // === NEWS ARTICLES METHODS ===

  async createNewsArticle(insertArticle: InsertNewsArticle): Promise<NewsArticle> {
    const [article] = await db
      .insert(newsArticles)
      .values(insertArticle)
      .returning();
    return article;
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    return await db
      .select()
      .from(newsArticles)
      .orderBy(asc(newsArticles.createdAt));
  }

  async getPublishedNewsArticles(): Promise<NewsArticle[]> {
    return await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.isPublished, true))
      .orderBy(asc(newsArticles.publishedAt));
  }

  async getNewsArticle(id: string): Promise<NewsArticle | undefined> {
    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id));
    return article || undefined;
  }

  async getNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined> {
    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.slug, slug));
    return article || undefined;
  }

  async updateNewsArticle(id: string, updates: Partial<InsertNewsArticle>): Promise<NewsArticle | undefined> {
    const [article] = await db
      .update(newsArticles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(newsArticles.id, id))
      .returning();
    return article || undefined;
  }

  async deleteNewsArticle(id: string): Promise<boolean> {
    const result = await db.delete(newsArticles).where(eq(newsArticles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementNewsViews(id: string): Promise<boolean> {
    const result = await db
      .update(newsArticles)
      .set({ views: sql`${newsArticles.views} + 1` })
      .where(eq(newsArticles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // === EVENTS METHODS ===

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async getEvents(): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .orderBy(asc(events.startTime));
  }

  async getPublishedEvents(): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.isPublic, true))
      .orderBy(asc(events.startTime));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.isPublic, true),
        sql`${events.startTime} >= ${now}`
      ))
      .orderBy(asc(events.startTime));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event || undefined;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.isPublic, true),
        sql`${events.startTime} >= ${startDate}`,
        sql`${events.startTime} <= ${endDate}`
      ))
      .orderBy(asc(events.startTime));
  }

  // === EVENT REGISTRATIONS METHODS ===

  async registerForEvent(insertRegistration: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db
      .insert(eventRegistrations)
      .values(insertRegistration)
      .returning();
    return registration;
  }

  async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async getUserEventRegistrations(userId: string): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(asc(eventRegistrations.registeredAt));
  }

  async cancelEventRegistration(eventId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(eventRegistrations)
      .set({ status: 'cancelled' })
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.userId, userId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // === NEWS COMMENTS METHODS ===

  async createNewsComment(insertComment: InsertNewsComment): Promise<NewsComment> {
    const [comment] = await db
      .insert(newsComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  async getNewsComments(articleId: string): Promise<NewsComment[]> {
    return await db
      .select()
      .from(newsComments)
      .where(and(
        eq(newsComments.articleId, articleId),
        eq(newsComments.isApproved, true)
      ))
      .orderBy(asc(newsComments.createdAt));
  }

  async approveNewsComment(id: string): Promise<boolean> {
    const result = await db
      .update(newsComments)
      .set({ isApproved: true })
      .where(eq(newsComments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNewsComment(id: string): Promise<boolean> {
    const result = await db.delete(newsComments).where(eq(newsComments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // === STAFF DIRECTORY METHODS ===

  async createStaffProfile(insertProfile: InsertStaffProfile): Promise<StaffProfile> {
    const [profile] = await db
      .insert(staffProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async getStaffProfiles(): Promise<StaffProfile[]> {
    return await db
      .select()
      .from(staffProfiles)
      .orderBy(asc(staffProfiles.displayOrder), asc(staffProfiles.lastName));
  }

  async getActiveStaffProfiles(): Promise<StaffProfile[]> {
    return await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.isActive, true))
      .orderBy(asc(staffProfiles.displayOrder), asc(staffProfiles.lastName));
  }

  async getStaffProfile(id: string): Promise<StaffProfile | undefined> {
    const [profile] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.id, id));
    return profile || undefined;
  }

  async getStaffByDepartment(department: string): Promise<StaffProfile[]> {
    return await db
      .select()
      .from(staffProfiles)
      .where(and(
        eq(staffProfiles.department, department),
        eq(staffProfiles.isActive, true)
      ))
      .orderBy(asc(staffProfiles.displayOrder), asc(staffProfiles.lastName));
  }

  async updateStaffProfile(id: string, updates: Partial<InsertStaffProfile>): Promise<StaffProfile | undefined> {
    const [profile] = await db
      .update(staffProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(staffProfiles.id, id))
      .returning();
    return profile || undefined;
  }

  async deleteStaffProfile(id: string): Promise<boolean> {
    const result = await db.delete(staffProfiles).where(eq(staffProfiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchStaffProfiles(searchQuery: string): Promise<StaffProfile[]> {
    const searchTerm = `%${searchQuery.toLowerCase()}%`;
    return await db
      .select()
      .from(staffProfiles)
      .where(and(
        eq(staffProfiles.isActive, true),
        sql`(
          LOWER(${staffProfiles.firstName}) LIKE ${searchTerm} OR
          LOWER(${staffProfiles.lastName}) LIKE ${searchTerm} OR
          LOWER(${staffProfiles.title}) LIKE ${searchTerm} OR
          LOWER(${staffProfiles.department}) LIKE ${searchTerm} OR
          LOWER(${staffProfiles.bio}) LIKE ${searchTerm}
        )`
      ))
      .orderBy(asc(staffProfiles.displayOrder), asc(staffProfiles.lastName));
  }

  // === STAFF ACHIEVEMENTS METHODS ===

  async createStaffAchievement(insertAchievement: InsertStaffAchievement): Promise<StaffAchievement> {
    const [achievement] = await db
      .insert(staffAchievements)
      .values(insertAchievement)
      .returning();
    return achievement;
  }

  async getStaffAchievements(staffId: string): Promise<StaffAchievement[]> {
    return await db
      .select()
      .from(staffAchievements)
      .where(eq(staffAchievements.staffId, staffId))
      .orderBy(asc(staffAchievements.date));
  }

  async getPublicStaffAchievements(staffId: string): Promise<StaffAchievement[]> {
    return await db
      .select()
      .from(staffAchievements)
      .where(and(
        eq(staffAchievements.staffId, staffId),
        eq(staffAchievements.isPublic, true)
      ))
      .orderBy(asc(staffAchievements.date));
  }

  async deleteStaffAchievement(id: string): Promise<boolean> {
    const result = await db.delete(staffAchievements).where(eq(staffAchievements.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== COURSE MANAGEMENT ====================
  
  async createCourse(courseData: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values(courseData)
      .returning();
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .orderBy(sql`${courses.createdAt} DESC`);
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    return course;
  }

  async getCoursesByTeacher(teacherId: string): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.teacherId, teacherId))
      .orderBy(sql`${courses.createdAt} DESC`);
  }

  async getPublishedCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.isPublished, true))
      .orderBy(sql`${courses.createdAt} DESC`);
  }

  async updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async deleteCourse(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async publishCourse(id: string): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async unpublishCourse(id: string): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  // ==================== ENROLLMENT MANAGEMENT ====================
  
  async enrollStudent(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db
      .insert(enrollments)
      .values(enrollmentData)
      .returning();
    return enrollment;
  }

  async unenrollStudent(studentId: string, courseId: string): Promise<boolean> {
    const result = await db
      .delete(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .orderBy(sql`${enrollments.enrolledAt} DESC`);
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId))
      .orderBy(sql`${enrollments.enrolledAt} DESC`);
  }

  async isStudentEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId)
      ))
      .limit(1);
    return !!enrollment;
  }

  async getEnrolledCourses(studentId: string): Promise<Course[]> {
    const studentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));
    
    if (studentEnrollments.length === 0) {
      return [];
    }

    const courseIds = studentEnrollments.map(e => e.courseId);
    return await db
      .select()
      .from(courses)
      .where(inArray(courses.id, courseIds))
      .orderBy(sql`${courses.createdAt} DESC`);
  }

  async getEnrollmentCount(courseId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));
    return result[0]?.count ?? 0;
  }

  async getEnrolledStudents(courseId: string): Promise<any[]> {
    const result = await db
      .select({
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
        studentId: users.id,
        studentName: users.name,
        studentEmail: users.email,
        studentRole: users.role
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId))
      .orderBy(sql`${enrollments.enrolledAt} DESC`);
    return result;
  }

  // ==================== LESSON MANAGEMENT ====================
  
  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const [lesson] = await db
      .insert(lessons)
      .values(lessonData)
      .returning();
    return lesson;
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(sql`${lessons.createdAt} DESC`);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id));
    return lesson;
  }

  async updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [lesson] = await db
      .update(lessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLesson(id: string): Promise<boolean> {
    const result = await db.delete(lessons).where(eq(lessons.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
