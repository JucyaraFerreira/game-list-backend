import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { IgdbService } from './igdb.service';
import { SteamService } from './steam.service';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IgdbService) private readonly igdb: IgdbService,
    @Inject(SteamService) private readonly steam: SteamService,
  ) {}

  // Sem busca: só o catálogo local. Com busca: local primeiro e, depois, jogos da IGDB ainda não importados (id nulo; use /import).
  async findAll(search?: string) {
    const local = await this.prisma.catalogGame.findMany({
      where: search ? { title: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { title: 'asc' },
      take: 50,
    });
    if (!search) return local;
    // O IGDB fora do ar não derruba a busca: devolve só o que já temos.
    const remote = await this.igdb.search(search).catch(() => []);
    // Jogo do seed (sem igdbId) com o mesmo título será reivindicado no import; os demais só se repetem pelo igdbId.
    const imported = new Set(local.map((game) => game.igdbId));
    const seeded = new Set(local.filter((game) => game.igdbId === null).map((game) => game.title.toLowerCase()));
    return [
      ...local,
      ...remote.filter((game) => !imported.has(game.igdbId) && !seeded.has(game.title.toLowerCase())).map((game) => ({ id: null, ...game })),
    ];
  }

  // Idempotente: reimportar atualiza o jogo e não duplica conquistas. Jogo do seed com o mesmo título ganha o igdbId;
  // título já usado por outro jogo da IGDB vira "Título (igdbId)" (title é único). Dois imports simultâneos: o perdedor tenta de novo.
  async importFromIgdb(igdbId: number) {
    const { steamAppId, ...game } = await this.igdb.findOne(igdbId);
    // Conquistas são opcionais: sem Steam, sem chave ou com a Steam fora do ar, o jogo importa sem elas.
    const achievements = steamAppId ? await this.steam.achievements(steamAppId).catch(() => []) : [];
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const claimable = (await tx.catalogGame.findUnique({ where: { igdbId } }))
            ?? (await tx.catalogGame.findFirst({ where: { title: game.title, igdbId: null } }));
          const taken = !claimable && (await tx.catalogGame.findUnique({ where: { title: game.title } }));
          // Campos nulos da IGDB não apagam o que já temos.
          const data = { igdbId, developer: game.developer ?? undefined, genre: game.genre ?? undefined, coverUrl: game.coverUrl ?? undefined };
          // O título de um jogo já existente nunca muda no update.
          const saved = claimable
            ? await tx.catalogGame.update({ where: { id: claimable.id }, data })
            : await tx.catalogGame.create({ data: { ...data, title: taken ? `${game.title} (${igdbId})` : game.title } });
          await tx.achievement.createMany({
            data: achievements.map((item) => ({ catalogGameId: saved.id, title: item.title, description: item.description })),
            skipDuplicates: true,
          });
          return saved;
        });
      } catch (error) {
        if (attempt === 0 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
        throw error;
      }
    }
  }
}
