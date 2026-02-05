import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Webinars (直播間)
export const webinars = pgTable("webinars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  vimeoUrl: text("vimeo_url").notNull(),
  coverImage: text("cover_image"),
  startTime: timestamp("start_time").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, live, ended
  videoDuration: integer("video_duration").default(0), // in seconds
});

export const insertWebinarSchema = createInsertSchema(webinars).omit({ id: true }).extend({
  startTime: z.coerce.date(),
});
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinars.$inferSelect;

// Registrations (報名)
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  nickname: text("nickname"),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, registeredAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

// Fake Users / Bots (假人)
export const fakeUsers = pgTable("fake_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

export const insertFakeUserSchema = createInsertSchema(fakeUsers).omit({ id: true });
export type InsertFakeUser = z.infer<typeof insertFakeUserSchema>;
export type FakeUser = typeof fakeUsers.$inferSelect;

// Scheduled Messages (預排訊息)
export const scheduledMessages = pgTable("scheduled_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  fakeUserId: varchar("fake_user_id").references(() => fakeUsers.id),
  message: text("message").notNull(),
  triggerTime: integer("trigger_time").notNull(), // seconds from video start
  messageType: text("message_type").notNull().default("chat"), // chat, like, reaction
});

export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).omit({ id: true });
export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;

// CTA Buttons (行動呼籲按鈕)
export const ctaButtons = pgTable("cta_buttons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  text: text("text").notNull(),
  url: text("url").notNull(),
  startTime: integer("start_time").notNull(), // seconds when to show
  endTime: integer("end_time"), // seconds when to hide (null = until end)
  style: text("style").default("primary"), // primary, secondary, danger
});

export const insertCtaButtonSchema = createInsertSchema(ctaButtons).omit({ id: true });
export type InsertCtaButton = z.infer<typeof insertCtaButtonSchema>;
export type CtaButton = typeof ctaButtons.$inferSelect;

// Polls (投票)
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  triggerTime: integer("trigger_time").notNull(), // seconds from video start
  duration: integer("duration").default(60), // how long poll stays open (seconds)
});

export const insertPollSchema = createInsertSchema(polls).omit({ id: true });
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof polls.$inferSelect;

// Poll Votes (投票記錄)
export const pollVotes = pgTable("poll_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id),
  participantId: text("participant_id").notNull(), // could be registration id or session id
  optionIndex: integer("option_index").notNull(),
  votedAt: timestamp("voted_at").defaultNow(),
});

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({ id: true, votedAt: true });
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;
export type PollVote = typeof pollVotes.$inferSelect;

// Chat Messages (即時聊天)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  senderName: text("sender_name").notNull(),
  senderType: text("sender_type").notNull().default("viewer"), // viewer, host, bot
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, sentAt: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Likes (按讚)
export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webinarId: varchar("webinar_id").notNull().references(() => webinars.id),
  count: integer("count").notNull().default(0),
});

export const insertLikeSchema = createInsertSchema(likes).omit({ id: true });
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

// Admin users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
