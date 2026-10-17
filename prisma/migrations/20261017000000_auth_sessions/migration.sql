BEGIN;

-- Refuse ambiguous existing accounts without changing their emails or ownership.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        GROUP BY lower(btrim("email"))
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Existem emails equivalentes após normalização; revise as contas antes de aplicar a migration.';
    END IF;
END;
$$;

ALTER TABLE "User" ADD COLUMN "username" TEXT;

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Functional indexes are maintained here because Prisma cannot model this expression.
CREATE UNIQUE INDEX "User_email_normalized_key" ON "User"(lower(btrim("email")));

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
