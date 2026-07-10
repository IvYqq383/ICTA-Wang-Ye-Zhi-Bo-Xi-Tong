CREATE SCHEMA "webinar";
--> statement-breakpoint
CREATE TABLE "webinar"."ai_point_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"amount_twd" integer,
	"stripe_session_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_point_transactions_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "webinar"."chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"session_id" varchar,
	"sender_name" text NOT NULL,
	"sender_type" text DEFAULT 'viewer' NOT NULL,
	"message" text NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"is_private" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "webinar"."cta_buttons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"text" text NOT NULL,
	"url" text NOT NULL,
	"start_time" integer NOT NULL,
	"end_time" integer,
	"style" text DEFAULT 'primary'
);
--> statement-breakpoint
CREATE TABLE "webinar"."email_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"registration_id" varchar NOT NULL,
	"reminder_type" text NOT NULL,
	"sequence_id" varchar,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "webinar"."email_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"name" text NOT NULL,
	"segment" text DEFAULT 'all' NOT NULL,
	"delay_minutes" integer DEFAULT 60 NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."fake_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"name" text NOT NULL,
	"avatar" text
);
--> statement-breakpoint
CREATE TABLE "webinar"."feedback_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar NOT NULL,
	"registration_id" varchar,
	"responses" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."feedback_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"title" text DEFAULT '請給我們回饋' NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "webinar"."likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar"."poll_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" varchar NOT NULL,
	"participant_id" text NOT NULL,
	"option_index" integer NOT NULL,
	"voted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."polls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"trigger_time" integer NOT NULL,
	"duration" integer DEFAULT 60
);
--> statement-breakpoint
CREATE TABLE "webinar"."questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"registration_id" varchar,
	"asker_name" text NOT NULL,
	"asker_email" text,
	"question" text NOT NULL,
	"answer" text,
	"answered_by" text,
	"answered_at" timestamp,
	"is_preset" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"asked_at" timestamp DEFAULT now(),
	"is_public" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "webinar"."registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '',
	"email" text NOT NULL,
	"nickname" text,
	"registered_at" timestamp DEFAULT now(),
	"attended" boolean DEFAULT false,
	"attended_at" timestamp,
	"left_at" timestamp,
	"watch_duration" integer DEFAULT 0,
	"viewer_timezone" text,
	"source" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"landing_url" text,
	"selected_session" timestamp,
	"custom_field_data" jsonb DEFAULT '{}'::jsonb,
	"tags" text[] DEFAULT '{}'::text[]
);
--> statement-breakpoint
CREATE TABLE "webinar"."scheduled_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"fake_user_id" varchar,
	"message" text NOT NULL,
	"trigger_time" integer NOT NULL,
	"message_type" text DEFAULT 'chat' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar"."social_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"platform" text DEFAULT 'facebook' NOT NULL,
	"content" text NOT NULL,
	"scheduled_for" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."tips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"trigger_time" integer NOT NULL,
	"duration" integer DEFAULT 10,
	"icon" text DEFAULT 'info'
);
--> statement-breakpoint
CREATE TABLE "webinar"."users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"company_name" text DEFAULT '',
	"subscription_plan" text DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp,
	"max_webinars" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"ai_points" integer DEFAULT 20 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "webinar"."viewer_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"registration_id" varchar,
	"viewer_session_id" text NOT NULL,
	"last_position" integer DEFAULT 0,
	"total_watched" integer DEFAULT 0,
	"watched_ranges" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"target_url" text NOT NULL,
	"secret" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."webinar_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"session_date" timestamp NOT NULL,
	"page_views" integer DEFAULT 0,
	"registrations" integer DEFAULT 0,
	"registration_rate" real DEFAULT 0,
	"attendees" integer DEFAULT 0,
	"attendance_rate" real DEFAULT 0,
	"avg_watch_time" integer DEFAULT 0,
	"avg_watch_percent" real DEFAULT 0,
	"chat_messages" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"poll_participation" real DEFAULT 0,
	"questions_asked" integer DEFAULT 0,
	"cta_clicks" integer DEFAULT 0,
	"cta_conversion_rate" real DEFAULT 0,
	"viewer_retention" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."webinar_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webinar"."webinar_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webinar_id" varchar NOT NULL,
	"scheduled_start" timestamp NOT NULL,
	"scheduled_end" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"attendee_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "webinar"."webinars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"vimeo_url" text NOT NULL,
	"cover_image" text,
	"start_time" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"publish_status" text DEFAULT 'draft' NOT NULL,
	"video_duration" integer DEFAULT 0,
	"schedule_mode" jsonb DEFAULT '{"recurring":false,"onDemand":false,"justInTime":false,"justInTimeMinutes":15}'::jsonb,
	"recurring_schedule" jsonb,
	"timezone" text DEFAULT 'Asia/Taipei',
	"brand_settings" jsonb,
	"ai_settings" jsonb DEFAULT '{"enabled":false,"teacherName":""}'::jsonb,
	"custom_fields" jsonb DEFAULT '[]'::jsonb,
	"scarcity_settings" jsonb DEFAULT '{"countdownEnabled":false,"seatsEnabled":false,"totalSeats":100,"urgencyText":""}'::jsonb,
	"thank_you_settings" jsonb DEFAULT '{"enabled":false,"headline":"","message":"","ctaText":"","ctaUrl":""}'::jsonb,
	"replay_settings" jsonb DEFAULT '{"headline":"","message":"","ctaText":"","ctaUrl":""}'::jsonb,
	"notify_settings" jsonb DEFAULT '{"questionEmailEnabled":false,"notifyEmail":""}'::jsonb,
	"replay_enabled" boolean DEFAULT true,
	"replay_available_hours" integer DEFAULT 48,
	"email_settings" jsonb DEFAULT '{"confirmationEnabled":true,"reminder24hEnabled":true,"reminder1hEnabled":true,"followUpEnabled":true,"customSubject":"","customTemplate":""}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "webinar"."ai_point_transactions" ADD CONSTRAINT "ai_point_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "webinar"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."chat_messages" ADD CONSTRAINT "chat_messages_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."cta_buttons" ADD CONSTRAINT "cta_buttons_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."email_reminders" ADD CONSTRAINT "email_reminders_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."email_reminders" ADD CONSTRAINT "email_reminders_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "webinar"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."email_sequences" ADD CONSTRAINT "email_sequences_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."fake_users" ADD CONSTRAINT "fake_users_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."feedback_responses" ADD CONSTRAINT "feedback_responses_survey_id_feedback_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "webinar"."feedback_surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."feedback_responses" ADD CONSTRAINT "feedback_responses_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "webinar"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."feedback_surveys" ADD CONSTRAINT "feedback_surveys_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."likes" ADD CONSTRAINT "likes_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "webinar"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."polls" ADD CONSTRAINT "polls_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."questions" ADD CONSTRAINT "questions_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."questions" ADD CONSTRAINT "questions_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "webinar"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."registrations" ADD CONSTRAINT "registrations_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."scheduled_messages" ADD CONSTRAINT "scheduled_messages_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."scheduled_messages" ADD CONSTRAINT "scheduled_messages_fake_user_id_fake_users_id_fk" FOREIGN KEY ("fake_user_id") REFERENCES "webinar"."fake_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."social_posts" ADD CONSTRAINT "social_posts_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."tips" ADD CONSTRAINT "tips_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."viewer_progress" ADD CONSTRAINT "viewer_progress_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."viewer_progress" ADD CONSTRAINT "viewer_progress_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "webinar"."registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."webhooks" ADD CONSTRAINT "webhooks_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."webinar_analytics" ADD CONSTRAINT "webinar_analytics_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."webinar_documents" ADD CONSTRAINT "webinar_documents_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar"."webinar_sessions" ADD CONSTRAINT "webinar_sessions_webinar_id_webinars_id_fk" FOREIGN KEY ("webinar_id") REFERENCES "webinar"."webinars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_reminders_reg_seq_uniq" ON "webinar"."email_reminders" USING btree ("registration_id","sequence_id") WHERE sequence_id IS NOT NULL;