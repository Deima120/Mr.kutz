-- Token blacklist (logout JWT invalidation without Redis)
CREATE TABLE "token_blacklist" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "token_blacklist_token_hash_key" ON "token_blacklist"("token_hash");
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");

-- Generic rate-limit state (login + forgot-password) without Redis
CREATE TABLE "rate_limit_entries" (
    "id" SERIAL NOT NULL,
    "scope" VARCHAR(30) NOT NULL,
    "key" VARCHAR(320) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_entries_scope_key_key" ON "rate_limit_entries"("scope", "key");
CREATE INDEX "rate_limit_entries_scope_locked_until_idx" ON "rate_limit_entries"("scope", "locked_until");
