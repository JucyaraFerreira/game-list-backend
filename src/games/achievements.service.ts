import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';

@Injectable()
export class AchievementsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // As conquistas de um jogo são as do catálogo (se vinculado) mais as criadas pelo usuário nele.
  async list(userId: string, gameId: string) {
    const scope = await this.scopeOf(userId, gameId);
    const rows = await this.prisma.achievement.findMany({
      where: scope,
      include: { unlocks: { where: { userId }, select: { unlockedAt: true } } },
      orderBy: { title: 'asc' },
    });
    return rows.map(({ unlocks, ...achievement }) => ({
      ...achievement, unlocked: unlocks.length > 0, unlockedAt: unlocks[0]?.unlockedAt ?? null,
    }));
  }

  async create(userId: string, gameId: string, dto: CreateAchievementDto) {
    await this.scopeOf(userId, gameId);
    try {
      const created = await this.prisma.achievement.create({
        data: { gameId, title: dto.title.trim(), description: dto.description, xp: dto.xp ?? 0 },
      });
      return { ...created, unlocked: false, unlockedAt: null };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma conquista sua com esse título neste jogo.');
      }
      throw error;
    }
  }

  async progress(userId: string, gameId: string) {
    const items = await this.list(userId, gameId);
    const done = items.filter((item) => item.unlocked);
    return {
      unlocked: done.length,
      total: items.length,
      percent: items.length ? Math.round((done.length / items.length) * 100) : 0,
      xp: done.reduce((sum, item) => sum + item.xp, 0),
      totalXp: items.reduce((sum, item) => sum + item.xp, 0),
    };
  }

  // Idempotente: marcar uma conquista já marcada mantém a data original.
  async unlock(userId: string, gameId: string, achievementId: string) {
    await this.ensureBelongs(userId, gameId, achievementId);
    await this.prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      update: {}, create: { userId, achievementId },
    });
    return (await this.list(userId, gameId)).find((item) => item.id === achievementId);
  }

  async lock(userId: string, gameId: string, achievementId: string) {
    await this.ensureBelongs(userId, gameId, achievementId);
    await this.prisma.userAchievement.deleteMany({ where: { userId, achievementId } });
  }

  private async scopeOf(userId: string, gameId: string): Promise<Prisma.AchievementWhereInput> {
    const game = await this.prisma.game.findFirst({ where: { id: gameId, userId }, select: { catalogGameId: true } });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    return { OR: [{ gameId }, ...(game.catalogGameId ? [{ catalogGameId: game.catalogGameId }] : [])] };
  }

  private async ensureBelongs(userId: string, gameId: string, achievementId: string) {
    const scope = await this.scopeOf(userId, gameId);
    const found = await this.prisma.achievement.findFirst({ where: { id: achievementId, ...scope }, select: { id: true } });
    if (!found) throw new NotFoundException('Conquista não encontrada neste jogo.');
  }
}
