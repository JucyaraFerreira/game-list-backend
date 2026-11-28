-- AlterTable
ALTER TABLE "catalog_games" ADD COLUMN     "igdbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "catalog_games_igdbId_key" ON "catalog_games"("igdbId");
