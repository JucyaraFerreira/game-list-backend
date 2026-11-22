BEGIN;

ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "RefreshToken" RENAME TO "refresh_tokens";
ALTER TABLE "Game" RENAME TO "games";
ALTER TABLE "Platform" RENAME TO "platforms";

ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER TABLE "refresh_tokens" RENAME CONSTRAINT "RefreshToken_pkey" TO "refresh_tokens_pkey";
ALTER TABLE "refresh_tokens" RENAME CONSTRAINT "RefreshToken_userId_fkey" TO "refresh_tokens_userId_fkey";
ALTER TABLE "games" RENAME CONSTRAINT "Game_pkey" TO "games_pkey";
ALTER TABLE "games" RENAME CONSTRAINT "Game_userId_fkey" TO "games_userId_fkey";
ALTER TABLE "games" RENAME CONSTRAINT "Game_platformId_fkey" TO "games_platformId_fkey";
ALTER TABLE "platforms" RENAME CONSTRAINT "Platform_pkey" TO "platforms_pkey";

ALTER INDEX "User_email_key" RENAME TO "users_email_key";
ALTER INDEX "User_username_key" RENAME TO "users_username_key";
ALTER INDEX "User_email_normalized_key" RENAME TO "users_email_normalized_key";
ALTER INDEX "RefreshToken_tokenHash_key" RENAME TO "refresh_tokens_tokenHash_key";
ALTER INDEX "RefreshToken_userId_idx" RENAME TO "refresh_tokens_userId_idx";
ALTER INDEX "RefreshToken_expiresAt_idx" RENAME TO "refresh_tokens_expiresAt_idx";
ALTER INDEX "Platform_name_key" RENAME TO "platforms_name_key";

ALTER SEQUENCE "Platform_id_seq" RENAME TO "platforms_id_seq";

COMMIT;
