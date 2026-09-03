-- Schema for the CloudDesk remote-desktop app.
--
-- Mirrors lib/db/schema.ts exactly. Drizzle's pgTable definitions use
-- camelCase column names, which Postgres folds to lowercase unless quoted,
-- so every camelCase identifier below is double-quoted. "user" is also a
-- reserved word and must stay quoted.
--
-- Apply with:  node scripts/apply-schema.mjs

BEGIN;

CREATE TABLE IF NOT EXISTS "user" (
  "id"            text PRIMARY KEY,
  "name"          text NOT NULL,
  "email"         text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image"         text,
  "createdAt"     timestamp NOT NULL,
  "updatedAt"     timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"        text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token"     text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL
);

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    text PRIMARY KEY,
  "accountId"             text NOT NULL,
  "providerId"            text NOT NULL,
  "userId"                text NOT NULL,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope"                 text,
  "password"              text,
  "issuer"                 text,
  "createdAt"             timestamp NOT NULL,
  "updatedAt"             timestamp NOT NULL
);

ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;

CREATE TABLE IF NOT EXISTS "verification" (
  "id"         text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value"      text NOT NULL,
  "expiresAt"  timestamp NOT NULL,
  "createdAt"  timestamp,
  "updatedAt"  timestamp
);

CREATE TABLE IF NOT EXISTS "remote_devices" (
  "id"                  text PRIMARY KEY,
  "userId"              text NOT NULL,
  "name"                text NOT NULL,
  "hostname"            text NOT NULL,
  "os"                  text NOT NULL,
  "status"              text NOT NULL,
  "pairingCode"         text,
  "enrollmentTokenHash" text,
  "agentVersion"        text NOT NULL,
  "lastSeenAt"          timestamp,
  "createdAt"           timestamp NOT NULL,
  "updatedAt"           timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "remote_sessions" (
  "id"        text PRIMARY KEY,
  "userId"    text NOT NULL,
  "deviceId"  text NOT NULL,
  "status"    text NOT NULL,
  "startedAt" timestamp NOT NULL,
  "endedAt"   timestamp,
  "createdAt" timestamp NOT NULL
);

-- Not declared in schema.ts, but every read path filters on these columns.
-- Drizzle ignores indexes it does not know about, so these are safe to keep.
CREATE INDEX IF NOT EXISTS "session_userId_idx"         ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx"         ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE INDEX IF NOT EXISTS "remote_devices_userId_idx"  ON "remote_devices" ("userId");
CREATE INDEX IF NOT EXISTS "remote_sessions_userId_idx" ON "remote_sessions" ("userId");

COMMIT;
