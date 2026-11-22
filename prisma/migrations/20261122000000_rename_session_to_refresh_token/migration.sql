BEGIN;

ALTER TABLE "Session" RENAME TO "RefreshToken";
ALTER TABLE "RefreshToken" RENAME CONSTRAINT "Session_pkey" TO "RefreshToken_pkey";
ALTER TABLE "RefreshToken" RENAME CONSTRAINT "Session_userId_fkey" TO "RefreshToken_userId_fkey";
ALTER INDEX "Session_tokenHash_key" RENAME TO "RefreshToken_tokenHash_key";
ALTER INDEX "Session_userId_idx" RENAME TO "RefreshToken_userId_idx";
ALTER INDEX "Session_expiresAt_idx" RENAME TO "RefreshToken_expiresAt_idx";

COMMIT;
