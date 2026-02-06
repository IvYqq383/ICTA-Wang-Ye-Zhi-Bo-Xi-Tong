import { db } from "./db";
import { eq, and, lt, lte, desc, asc } from "drizzle-orm";
import {
  webinars, type InsertWebinar, type Webinar,
  registrations, type InsertRegistration, type Registration,
  fakeUsers, type InsertFakeUser, type FakeUser,
  scheduledMessages, type InsertScheduledMessage, type ScheduledMessage,
  ctaButtons, type InsertCtaButton, type CtaButton,
  tips, type InsertTip, type Tip,
  polls, type InsertPoll, type Poll,
  pollVotes, type InsertPollVote, type PollVote,
  questions, type InsertQuestion, type Question,
  feedbackSurveys, type InsertFeedbackSurvey, type FeedbackSurvey,
  feedbackResponses, type InsertFeedbackResponse, type FeedbackResponse,
  viewerProgress, type InsertViewerProgress, type ViewerProgress,
  webinarAnalytics, type InsertWebinarAnalytics, type WebinarAnalytics,
  emailReminders, type InsertEmailReminder, type EmailReminder,
  chatMessages, type InsertChatMessage, type ChatMessage,
  likes, type InsertLike, type Like,
  users, type InsertUser, type User,
  webinarSessions, type InsertWebinarSession, type WebinarSession,
} from "@shared/schema";

export interface IStorage {
  // Users (Admin)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Webinars
  createWebinar(data: InsertWebinar): Promise<Webinar>;
  getWebinar(id: string): Promise<Webinar | undefined>;
  getAllWebinars(): Promise<Webinar[]>;
  updateWebinar(id: string, data: Partial<InsertWebinar>): Promise<Webinar | undefined>;
  deleteWebinar(id: string): Promise<void>;
  
  // Registrations
  createRegistration(data: InsertRegistration): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrationsByWebinar(webinarId: string): Promise<Registration[]>;
  getRegistrationByEmail(webinarId: string, email: string): Promise<Registration | undefined>;
  updateRegistration(id: string, data: Partial<Registration>): Promise<Registration | undefined>;
  
  // Fake Users
  createFakeUser(data: InsertFakeUser): Promise<FakeUser>;
  getFakeUsersByWebinar(webinarId: string): Promise<FakeUser[]>;
  deleteFakeUser(id: string): Promise<void>;
  
  // Scheduled Messages
  createScheduledMessage(data: InsertScheduledMessage): Promise<ScheduledMessage>;
  getScheduledMessagesByWebinar(webinarId: string): Promise<ScheduledMessage[]>;
  deleteScheduledMessage(id: string): Promise<void>;
  
  // CTA Buttons
  createCtaButton(data: InsertCtaButton): Promise<CtaButton>;
  getCtaButtonsByWebinar(webinarId: string): Promise<CtaButton[]>;
  deleteCtaButton(id: string): Promise<void>;
  
  // Tips
  createTip(data: InsertTip): Promise<Tip>;
  getTipsByWebinar(webinarId: string): Promise<Tip[]>;
  deleteTip(id: string): Promise<void>;
  
  // Polls
  createPoll(data: InsertPoll): Promise<Poll>;
  getPollsByWebinar(webinarId: string): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | undefined>;
  deletePoll(id: string): Promise<void>;
  
  // Poll Votes
  createPollVote(data: InsertPollVote): Promise<PollVote>;
  getPollVotes(pollId: string): Promise<PollVote[]>;
  
  // Questions (Q&A)
  createQuestion(data: InsertQuestion): Promise<Question>;
  getQuestionsByWebinar(webinarId: string): Promise<Question[]>;
  getPresetQuestions(webinarId: string): Promise<Question[]>;
  updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined>;
  deleteQuestion(id: string): Promise<void>;
  
  // Feedback Surveys
  createFeedbackSurvey(data: InsertFeedbackSurvey): Promise<FeedbackSurvey>;
  getFeedbackSurveyByWebinar(webinarId: string): Promise<FeedbackSurvey | undefined>;
  updateFeedbackSurvey(id: string, data: Partial<FeedbackSurvey>): Promise<FeedbackSurvey | undefined>;
  
  // Feedback Responses
  createFeedbackResponse(data: InsertFeedbackResponse): Promise<FeedbackResponse>;
  getFeedbackResponsesBySurvey(surveyId: string): Promise<FeedbackResponse[]>;
  
  // Viewer Progress
  getViewerProgress(webinarId: string, sessionId: string): Promise<ViewerProgress | undefined>;
  upsertViewerProgress(data: InsertViewerProgress): Promise<ViewerProgress>;
  
  // Analytics
  getWebinarAnalytics(webinarId: string): Promise<WebinarAnalytics[]>;
  upsertWebinarAnalytics(data: InsertWebinarAnalytics): Promise<WebinarAnalytics>;
  
  // Email Reminders
  createEmailReminder(data: InsertEmailReminder): Promise<EmailReminder>;
  getPendingEmailReminders(before: Date): Promise<EmailReminder[]>;
  updateEmailReminder(id: string, data: Partial<EmailReminder>): Promise<void>;
  
  // Chat Messages
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByWebinar(webinarId: string): Promise<ChatMessage[]>;
  getChatMessagesBySession(webinarId: string, sessionId: string): Promise<ChatMessage[]>;
  
  // Likes
  getLikes(webinarId: string): Promise<Like | undefined>;
  incrementLikes(webinarId: string): Promise<number>;
  
  // Webinar Sessions
  createWebinarSession(data: InsertWebinarSession): Promise<WebinarSession>;
  getWebinarSessions(webinarId: string): Promise<WebinarSession[]>;
  getUpcomingSessions(webinarId: string): Promise<WebinarSession[]>;
  updateWebinarSession(id: string, data: Partial<WebinarSession>): Promise<void>;
  deleteWebinarSession(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users (Admin)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  // Webinars
  async createWebinar(data: InsertWebinar): Promise<Webinar> {
    const result = await db.insert(webinars).values(data as any).returning();
    return result[0];
  }

  async getWebinar(id: string): Promise<Webinar | undefined> {
    const result = await db.select().from(webinars).where(eq(webinars.id, id));
    return result[0];
  }

  async getAllWebinars(): Promise<Webinar[]> {
    return db.select().from(webinars).orderBy(desc(webinars.createdAt));
  }

  async updateWebinar(id: string, data: Partial<InsertWebinar>): Promise<Webinar | undefined> {
    const result = await db.update(webinars).set(data as any).where(eq(webinars.id, id)).returning();
    return result[0];
  }

  async deleteWebinar(id: string): Promise<void> {
    // Delete in order respecting FK constraints
    // First: tables referencing polls (pollVotes)
    const webinarPolls = await db.select({ id: polls.id }).from(polls).where(eq(polls.webinarId, id));
    for (const poll of webinarPolls) {
      await db.delete(pollVotes).where(eq(pollVotes.pollId, poll.id));
    }
    // Tables referencing feedbackSurveys (feedbackResponses)
    const surveys = await db.select({ id: feedbackSurveys.id }).from(feedbackSurveys).where(eq(feedbackSurveys.webinarId, id));
    for (const survey of surveys) {
      await db.delete(feedbackResponses).where(eq(feedbackResponses.surveyId, survey.id));
    }
    // Tables referencing registrations (emailReminders, viewerProgress, questions with registrationId)
    await db.delete(emailReminders).where(eq(emailReminders.webinarId, id));
    await db.delete(viewerProgress).where(eq(viewerProgress.webinarId, id));
    await db.delete(questions).where(eq(questions.webinarId, id));
    // Now delete registrations
    await db.delete(registrations).where(eq(registrations.webinarId, id));
    // Delete other direct children
    await db.delete(scheduledMessages).where(eq(scheduledMessages.webinarId, id));
    await db.delete(fakeUsers).where(eq(fakeUsers.webinarId, id));
    await db.delete(ctaButtons).where(eq(ctaButtons.webinarId, id));
    await db.delete(polls).where(eq(polls.webinarId, id));
    await db.delete(tips).where(eq(tips.webinarId, id));
    await db.delete(feedbackSurveys).where(eq(feedbackSurveys.webinarId, id));
    await db.delete(chatMessages).where(eq(chatMessages.webinarId, id));
    await db.delete(likes).where(eq(likes.webinarId, id));
    await db.delete(webinarAnalytics).where(eq(webinarAnalytics.webinarId, id));
    await db.delete(webinarSessions).where(eq(webinarSessions.webinarId, id));
    // Finally delete the webinar
    await db.delete(webinars).where(eq(webinars.id, id));
  }

  // Registrations
  async createRegistration(data: InsertRegistration): Promise<Registration> {
    const result = await db.insert(registrations).values(data).returning();
    return result[0];
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const result = await db.select().from(registrations).where(eq(registrations.id, id));
    return result[0];
  }

  async getRegistrationsByWebinar(webinarId: string): Promise<Registration[]> {
    return db.select().from(registrations).where(eq(registrations.webinarId, webinarId));
  }

  async getRegistrationByEmail(webinarId: string, email: string): Promise<Registration | undefined> {
    const result = await db.select().from(registrations)
      .where(and(eq(registrations.webinarId, webinarId), eq(registrations.email, email)));
    return result[0];
  }

  async updateRegistration(id: string, data: Partial<Registration>): Promise<Registration | undefined> {
    const result = await db.update(registrations).set(data).where(eq(registrations.id, id)).returning();
    return result[0];
  }

  // Fake Users
  async createFakeUser(data: InsertFakeUser): Promise<FakeUser> {
    const result = await db.insert(fakeUsers).values(data).returning();
    return result[0];
  }

  async getFakeUsersByWebinar(webinarId: string): Promise<FakeUser[]> {
    return db.select().from(fakeUsers).where(eq(fakeUsers.webinarId, webinarId));
  }

  async deleteFakeUser(id: string): Promise<void> {
    await db.delete(fakeUsers).where(eq(fakeUsers.id, id));
  }

  // Scheduled Messages
  async createScheduledMessage(data: InsertScheduledMessage): Promise<ScheduledMessage> {
    const result = await db.insert(scheduledMessages).values(data).returning();
    return result[0];
  }

  async getScheduledMessagesByWebinar(webinarId: string): Promise<ScheduledMessage[]> {
    return db.select().from(scheduledMessages)
      .where(eq(scheduledMessages.webinarId, webinarId))
      .orderBy(asc(scheduledMessages.triggerTime));
  }

  async deleteScheduledMessage(id: string): Promise<void> {
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
  }

  // CTA Buttons
  async createCtaButton(data: InsertCtaButton): Promise<CtaButton> {
    const result = await db.insert(ctaButtons).values(data).returning();
    return result[0];
  }

  async getCtaButtonsByWebinar(webinarId: string): Promise<CtaButton[]> {
    return db.select().from(ctaButtons)
      .where(eq(ctaButtons.webinarId, webinarId))
      .orderBy(asc(ctaButtons.startTime));
  }

  async deleteCtaButton(id: string): Promise<void> {
    await db.delete(ctaButtons).where(eq(ctaButtons.id, id));
  }

  // Tips
  async createTip(data: InsertTip): Promise<Tip> {
    const result = await db.insert(tips).values(data).returning();
    return result[0];
  }

  async getTipsByWebinar(webinarId: string): Promise<Tip[]> {
    return db.select().from(tips)
      .where(eq(tips.webinarId, webinarId))
      .orderBy(asc(tips.triggerTime));
  }

  async deleteTip(id: string): Promise<void> {
    await db.delete(tips).where(eq(tips.id, id));
  }

  // Polls
  async createPoll(data: InsertPoll): Promise<Poll> {
    const result = await db.insert(polls).values({
      ...data,
      options: data.options as string[]
    }).returning();
    return result[0];
  }

  async getPollsByWebinar(webinarId: string): Promise<Poll[]> {
    return db.select().from(polls)
      .where(eq(polls.webinarId, webinarId))
      .orderBy(asc(polls.triggerTime));
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    const result = await db.select().from(polls).where(eq(polls.id, id));
    return result[0];
  }

  async deletePoll(id: string): Promise<void> {
    await db.delete(polls).where(eq(polls.id, id));
  }

  // Poll Votes
  async createPollVote(data: InsertPollVote): Promise<PollVote> {
    const result = await db.insert(pollVotes).values(data).returning();
    return result[0];
  }

  async getPollVotes(pollId: string): Promise<PollVote[]> {
    return db.select().from(pollVotes).where(eq(pollVotes.pollId, pollId));
  }

  // Questions (Q&A)
  async createQuestion(data: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(data).returning();
    return result[0];
  }

  async getQuestionsByWebinar(webinarId: string): Promise<Question[]> {
    return db.select().from(questions)
      .where(eq(questions.webinarId, webinarId))
      .orderBy(desc(questions.askedAt));
  }

  async getPresetQuestions(webinarId: string): Promise<Question[]> {
    return db.select().from(questions)
      .where(and(eq(questions.webinarId, webinarId), eq(questions.isPreset, true)))
      .orderBy(asc(questions.displayOrder));
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question | undefined> {
    const result = await db.update(questions).set(data).where(eq(questions.id, id)).returning();
    return result[0];
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  // Feedback Surveys
  async createFeedbackSurvey(data: InsertFeedbackSurvey): Promise<FeedbackSurvey> {
    const result = await db.insert(feedbackSurveys).values(data as any).returning();
    return result[0];
  }

  async getFeedbackSurveyByWebinar(webinarId: string): Promise<FeedbackSurvey | undefined> {
    const result = await db.select().from(feedbackSurveys)
      .where(eq(feedbackSurveys.webinarId, webinarId));
    return result[0];
  }

  async updateFeedbackSurvey(id: string, data: Partial<FeedbackSurvey>): Promise<FeedbackSurvey | undefined> {
    const result = await db.update(feedbackSurveys).set(data).where(eq(feedbackSurveys.id, id)).returning();
    return result[0];
  }

  // Feedback Responses
  async createFeedbackResponse(data: InsertFeedbackResponse): Promise<FeedbackResponse> {
    const result = await db.insert(feedbackResponses).values(data).returning();
    return result[0];
  }

  async getFeedbackResponsesBySurvey(surveyId: string): Promise<FeedbackResponse[]> {
    return db.select().from(feedbackResponses).where(eq(feedbackResponses.surveyId, surveyId));
  }

  // Viewer Progress
  async getViewerProgress(webinarId: string, sessionId: string): Promise<ViewerProgress | undefined> {
    const result = await db.select().from(viewerProgress)
      .where(and(
        eq(viewerProgress.webinarId, webinarId),
        eq(viewerProgress.viewerSessionId, sessionId)
      ));
    return result[0];
  }

  async upsertViewerProgress(data: InsertViewerProgress): Promise<ViewerProgress> {
    const existing = await this.getViewerProgress(data.webinarId, data.viewerSessionId);
    if (existing) {
      const result = await db.update(viewerProgress)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(viewerProgress.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(viewerProgress).values(data as any).returning();
    return result[0];
  }

  // Analytics
  async getWebinarAnalytics(webinarId: string): Promise<WebinarAnalytics[]> {
    return db.select().from(webinarAnalytics)
      .where(eq(webinarAnalytics.webinarId, webinarId))
      .orderBy(desc(webinarAnalytics.sessionDate));
  }

  async upsertWebinarAnalytics(data: InsertWebinarAnalytics): Promise<WebinarAnalytics> {
    const result = await db.insert(webinarAnalytics).values(data as any).returning();
    return result[0];
  }

  // Email Reminders
  async createEmailReminder(data: InsertEmailReminder): Promise<EmailReminder> {
    const result = await db.insert(emailReminders).values(data).returning();
    return result[0];
  }

  async getPendingEmailReminders(before: Date): Promise<EmailReminder[]> {
    return db.select().from(emailReminders)
      .where(and(
        eq(emailReminders.status, "pending"),
        lte(emailReminders.scheduledFor, before)
      ));
  }

  async updateEmailReminder(id: string, data: Partial<EmailReminder>): Promise<void> {
    await db.update(emailReminders).set(data).where(eq(emailReminders.id, id));
  }

  // Chat Messages
  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(data).returning();
    return result[0];
  }

  async getChatMessagesByWebinar(webinarId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.webinarId, webinarId))
      .orderBy(asc(chatMessages.sentAt));
  }

  async getChatMessagesBySession(webinarId: string, sessionId: string): Promise<ChatMessage[]> {
    // Return only messages for this specific session (viewer's own messages + host replies to them)
    return db.select().from(chatMessages)
      .where(
        and(
          eq(chatMessages.webinarId, webinarId),
          eq(chatMessages.sessionId, sessionId)
        )
      )
      .orderBy(asc(chatMessages.sentAt));
  }

  // Likes
  async getLikes(webinarId: string): Promise<Like | undefined> {
    const result = await db.select().from(likes).where(eq(likes.webinarId, webinarId));
    return result[0];
  }

  async incrementLikes(webinarId: string): Promise<number> {
    let existing = await this.getLikes(webinarId);
    if (!existing) {
      const result = await db.insert(likes).values({ webinarId, count: 1 }).returning();
      return result[0].count;
    }
    const result = await db.update(likes)
      .set({ count: existing.count + 1 })
      .where(eq(likes.webinarId, webinarId))
      .returning();
    return result[0].count;
  }

  // Webinar Sessions
  async createWebinarSession(data: InsertWebinarSession): Promise<WebinarSession> {
    const result = await db.insert(webinarSessions).values(data).returning();
    return result[0];
  }

  async getWebinarSessions(webinarId: string): Promise<WebinarSession[]> {
    return db.select().from(webinarSessions)
      .where(eq(webinarSessions.webinarId, webinarId))
      .orderBy(asc(webinarSessions.scheduledStart));
  }

  async getUpcomingSessions(webinarId: string): Promise<WebinarSession[]> {
    return db.select().from(webinarSessions)
      .where(and(
        eq(webinarSessions.webinarId, webinarId),
        eq(webinarSessions.status, "scheduled")
      ))
      .orderBy(asc(webinarSessions.scheduledStart));
  }

  async updateWebinarSession(id: string, data: Partial<WebinarSession>): Promise<void> {
    await db.update(webinarSessions).set(data).where(eq(webinarSessions.id, id));
  }

  async deleteWebinarSession(id: string): Promise<void> {
    await db.delete(webinarSessions).where(eq(webinarSessions.id, id));
  }
}

export const storage = new DatabaseStorage();
