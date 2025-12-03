CREATE TYPE "public"."asset_type" AS ENUM('mutual_fund', 'stock', 'fixed_deposit', 'recurring_deposit', 'insurance', 'bond', 'real_estate', 'gold', 'other');--> statement-breakpoint
CREATE TYPE "public"."consent_mode" AS ENUM('VIEW', 'STORE', 'QUERY', 'STREAM');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED', 'EXPIRED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."deposit_type" AS ENUM('fixed_deposit', 'recurring_deposit', 'savings_account', 'current_account');--> statement-breakpoint
CREATE TYPE "public"."fetch_type" AS ENUM('ONETIME', 'PERIODIC');--> statement-breakpoint
CREATE TYPE "public"."fi_type" AS ENUM('DEPOSIT', 'MUTUAL_FUNDS', 'EQUITIES', 'INSURANCE_POLICIES', 'BONDS', 'DEBENTURES', 'ETF', 'IDR', 'CIS', 'GOVT_SECURITIES', 'NPS', 'GSTR', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."institution_type" AS ENUM('amc', 'broker', 'bank', 'insurer', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_type" AS ENUM('life', 'health', 'term', 'endowment', 'ulip', 'vehicle', 'property', 'other');--> statement-breakpoint
CREATE TYPE "public"."linking_status" AS ENUM('pending', 'in_progress', 'awaiting_otp', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recommendation_action" AS ENUM('buy', 'sell', 'hold', 'increase', 'decrease');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('very_low', 'low', 'moderate', 'high', 'very_high');--> statement-breakpoint
CREATE TYPE "public"."sip_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal');--> statement-breakpoint
CREATE TABLE "aa_consent_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_handle" text NOT NULL,
	"previous_status" "consent_status",
	"new_status" "consent_status" NOT NULL,
	"event_type" text NOT NULL,
	"event_source" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aa_consents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"consent_handle" text NOT NULL,
	"consent_id" text,
	"fiu_id" text NOT NULL,
	"status" "consent_status" DEFAULT 'PENDING' NOT NULL,
	"consent_mode" "consent_mode" DEFAULT 'VIEW' NOT NULL,
	"fetch_type" "fetch_type" DEFAULT 'ONETIME' NOT NULL,
	"fi_types" "fi_type"[] NOT NULL,
	"purpose" text NOT NULL,
	"consent_start" timestamp NOT NULL,
	"consent_expiry" timestamp NOT NULL,
	"data_range_from" timestamp NOT NULL,
	"data_range_to" timestamp NOT NULL,
	"frequency_unit" text,
	"frequency_value" integer,
	"data_life_unit" text,
	"data_life_value" integer,
	"fi_data_range_months" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aa_consents_consent_handle_unique" UNIQUE("consent_handle"),
	CONSTRAINT "aa_consents_consent_id_unique" UNIQUE("consent_id")
);
--> statement-breakpoint
CREATE TABLE "asset_allocations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"current_allocation" numeric(5, 2) NOT NULL,
	"recommended_allocation" numeric(5, 2),
	"current_value" numeric(15, 2) NOT NULL,
	"deviation" numeric(5, 2),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fi_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"consent_id" varchar NOT NULL,
	"link_ref_number" text,
	"fi_type" "fi_type" NOT NULL,
	"account_id" text NOT NULL,
	"masked_account_number" text,
	"fip_id" text NOT NULL,
	"fip_name" text,
	"account_type" text,
	"account_status" text DEFAULT 'ACTIVE' NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	"last_fetched_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fi_accounts_link_ref_number_unique" UNIQUE("link_ref_number")
);
--> statement-breakpoint
CREATE TABLE "fi_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_id" varchar NOT NULL,
	"session_id" text NOT NULL,
	"fi_type" "fi_type" NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"records_fetched" integer DEFAULT 0,
	"records_processed" integer DEFAULT 0,
	"raw_payload" jsonb,
	"error_details" jsonb,
	"fetch_started_at" timestamp,
	"fetch_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fi_holdings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"batch_id" varchar,
	"fi_type" "fi_type" NOT NULL,
	"instrument_name" text,
	"instrument_id" text,
	"quantity" numeric(15, 4),
	"average_price" numeric(15, 2),
	"current_value" numeric(15, 2),
	"invested_amount" numeric(15, 2),
	"holding_details" jsonb,
	"idempotency_key" text NOT NULL,
	"as_of_date" timestamp NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fi_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"batch_id" varchar,
	"fi_type" "fi_type" NOT NULL,
	"transaction_id" text,
	"transaction_type" text NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"narration" text,
	"reference" text,
	"transaction_details" jsonb,
	"idempotency_key" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"asset_name" text NOT NULL,
	"asset_symbol" text,
	"quantity" numeric(15, 4) NOT NULL,
	"average_price" numeric(15, 2) NOT NULL,
	"current_price" numeric(15, 2) NOT NULL,
	"invested_amount" numeric(15, 2) NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"returns" numeric(15, 2) NOT NULL,
	"returns_percentage" numeric(5, 2) NOT NULL,
	"aa_account_id" text,
	"metadata" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutual_fund_nav_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holding_id" varchar NOT NULL,
	"scheme_code" text,
	"nav" numeric(15, 4) NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"total_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_invested" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_returns" numeric(15, 2) DEFAULT '0' NOT NULL,
	"returns_percentage" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulse_labs_mutual_fund_schemes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_code" text NOT NULL,
	"scheme_name" text NOT NULL,
	"isin" text,
	"amc_code" text,
	"amc_name" text,
	"category" text,
	"sub_category" text,
	"scheme_type" text,
	"nav_date" text,
	"current_nav" numeric(12, 4),
	"rating" integer,
	"risk_level" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pulse_labs_mutual_fund_schemes_scheme_code_unique" UNIQUE("scheme_code")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"holding_id" varchar,
	"action" "recommendation_action" NOT NULL,
	"asset_type" "asset_type",
	"asset_name" text,
	"reasoning" text NOT NULL,
	"suggested_amount" numeric(15, 2),
	"priority" integer DEFAULT 5,
	"confidence" numeric(3, 2),
	"risk_impact" "risk_level",
	"expected_return" numeric(5, 2),
	"ai_model" text DEFAULT 'rudo',
	"metadata" jsonb,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "risk_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"risk_score" integer NOT NULL,
	"investment_horizon" integer NOT NULL,
	"monthly_income" numeric(15, 2),
	"monthly_expenses" numeric(15, 2),
	"dependents" integer DEFAULT 0,
	"investment_goals" text[],
	"assessment_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_price_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holding_id" varchar NOT NULL,
	"symbol" text NOT NULL,
	"open" numeric(15, 2) NOT NULL,
	"high" numeric(15, 2) NOT NULL,
	"low" numeric(15, 2) NOT NULL,
	"close" numeric(15, 2) NOT NULL,
	"volume" numeric(15, 0),
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holding_id" varchar NOT NULL,
	"portfolio_id" varchar NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"fees" numeric(15, 2) DEFAULT '0',
	"transaction_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "aa_consents" ADD CONSTRAINT "aa_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_allocations" ADD CONSTRAINT "asset_allocations_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fi_accounts" ADD CONSTRAINT "fi_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fi_accounts" ADD CONSTRAINT "fi_accounts_consent_id_aa_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."aa_consents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fi_batches" ADD CONSTRAINT "fi_batches_consent_id_aa_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."aa_consents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fi_holdings" ADD CONSTRAINT "fi_holdings_account_id_fi_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fi_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fi_transactions" ADD CONSTRAINT "fi_transactions_account_id_fi_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."fi_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_fund_nav_history" ADD CONSTRAINT "mutual_fund_nav_history_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_price_history" ADD CONSTRAINT "stock_price_history_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_aa_consent_events_handle" ON "aa_consent_events" USING btree ("consent_handle");--> statement-breakpoint
CREATE INDEX "idx_aa_consents_user_id" ON "aa_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_aa_consents_consent_id" ON "aa_consents" USING btree ("consent_id");--> statement-breakpoint
CREATE INDEX "idx_aa_consents_status" ON "aa_consents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fi_accounts_user_id" ON "fi_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_fi_accounts_consent_id" ON "fi_accounts" USING btree ("consent_id");--> statement-breakpoint
CREATE INDEX "idx_fi_accounts_fip_id" ON "fi_accounts" USING btree ("fip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fi_accounts_unique" ON "fi_accounts" USING btree ("user_id","account_id","fi_type");--> statement-breakpoint
CREATE INDEX "idx_fi_batches_consent_id" ON "fi_batches" USING btree ("consent_id");--> statement-breakpoint
CREATE INDEX "idx_fi_batches_session_id" ON "fi_batches" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_fi_holdings_account_id" ON "fi_holdings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_fi_holdings_fi_type" ON "fi_holdings" USING btree ("fi_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fi_holdings_unique" ON "fi_holdings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_fi_transactions_account_id" ON "fi_transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_fi_transactions_date" ON "fi_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fi_transactions_unique" ON "fi_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_pl_scheme_code" ON "pulse_labs_mutual_fund_schemes" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "idx_pl_isin" ON "pulse_labs_mutual_fund_schemes" USING btree ("isin");--> statement-breakpoint
CREATE INDEX "idx_pl_category" ON "pulse_labs_mutual_fund_schemes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_pl_amc_code" ON "pulse_labs_mutual_fund_schemes" USING btree ("amc_code");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");