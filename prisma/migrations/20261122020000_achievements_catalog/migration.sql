
-- AlterTable
ALTER TABLE "games" ADD COLUMN     "catalogGameId" TEXT;

-- CreateTable
CREATE TABLE "catalog_games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "developer" TEXT,
    "genre" TEXT,
    "coverUrl" TEXT,

    CONSTRAINT "catalog_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "catalogGameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_games_title_key" ON "catalog_games"("title");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_catalogGameId_title_key" ON "achievements"("catalogGameId", "title");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE INDEX "games_catalogGameId_idx" ON "games"("catalogGameId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_catalogGameId_fkey" FOREIGN KEY ("catalogGameId") REFERENCES "catalog_games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_catalogGameId_fkey" FOREIGN KEY ("catalogGameId") REFERENCES "catalog_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

