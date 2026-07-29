ALTER TABLE "webinar"."registrations" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "webinar"."registrations" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "webinar"."registrations" ADD COLUMN "verified_at" timestamp;