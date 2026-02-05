import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  webinars, insertWebinarSchema, type InsertWebinar, type Webinar,
  registrations, type InsertRegistration, type Registration,
  fakeUsers, type InsertFakeUser, type FakeUser,
  scheduledMessages, type InsertScheduledMessage, type ScheduledMessage,
  ctaButtons, type InsertCtaButton, type CtaButton,
  polls, type InsertPoll, type Poll,
  pollVotes, type InsertPollVote, type PollVote,
  chatMessages, type InsertChatMessage, type ChatMessage,
  likes, type InsertLike, type Like,
  users, type InsertUser, type User,
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
  getRegistrationsByWebinar(webinarId: string): Promise<Registration[]>;
  getRegistrationByEmail(webinarId: string, email: string): Promise<Registration | undefined>;
  
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
  
  // Polls
  createPoll(data: InsertPoll): Promise<Poll>;
  getPollsByWebinar(webinarId: string): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | undefined>;
  deletePoll(id: string): Promise<void>;
  
  // Poll Votes
  createPollVote(data: InsertPollVote): Promise<PollVote>;
  getPollVotes(pollId: string): Promise<PollVote[]>;
  
  // Chat Messages
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByWebinar(webinarId: string): Promise<ChatMessage[]>;
  
  // Likes
  getLikes(webinarId: string): Promise<Like | undefined>;
  incrementLikes(webinarId: string): Promise<number>;
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
    const result = await db.insert(webinars).values(data).returning();
    return result[0];
  }

  async getWebinar(id: string): Promise<Webinar | undefined> {
    const result = await db.select().from(webinars).where(eq(webinars.id, id));
    return result[0];
  }

  async getAllWebinars(): Promise<Webinar[]> {
    return db.select().from(webinars);
  }

  async updateWebinar(id: string, data: Partial<InsertWebinar>): Promise<Webinar | undefined> {
    const result = await db.update(webinars).set(data).where(eq(webinars.id, id)).returning();
    return result[0];
  }

  async deleteWebinar(id: string): Promise<void> {
    await db.delete(webinars).where(eq(webinars.id, id));
  }

  // Registrations
  async createRegistration(data: InsertRegistration): Promise<Registration> {
    const result = await db.insert(registrations).values(data).returning();
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
    return db.select().from(scheduledMessages).where(eq(scheduledMessages.webinarId, webinarId));
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
    return db.select().from(ctaButtons).where(eq(ctaButtons.webinarId, webinarId));
  }

  async deleteCtaButton(id: string): Promise<void> {
    await db.delete(ctaButtons).where(eq(ctaButtons.id, id));
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
    return db.select().from(polls).where(eq(polls.webinarId, webinarId));
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

  // Chat Messages
  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const result = await db.insert(chatMessages).values(data).returning();
    return result[0];
  }

  async getChatMessagesByWebinar(webinarId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.webinarId, webinarId));
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
}

export const storage = new DatabaseStorage();
