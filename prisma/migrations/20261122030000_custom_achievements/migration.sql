
-- AlterTable
ALTER TABLE "achievements" ADD COLUMN     "gameId" TEXT,
ALTER COLUMN "catalogGameId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "achievements_gameId_idx" ON "achievements"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_gameId_title_key" ON "achievements"("gameId", "title");

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Prisma não modela CHECK: a conquista pertence ao catálogo ou a um jogo do usuário, nunca aos dois.
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_owner_check"
    CHECK (("catalogGameId" IS NULL) <> ("gameId" IS NULL));
