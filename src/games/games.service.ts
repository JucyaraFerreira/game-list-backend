import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class GamesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGameDto) {
    await this.ensurePlatformExists(dto.platformId);
    return this.prisma.game.create({
      data: {
        title: dto.title, platformId: dto.platformId, userId,
        developer: dto.developer, genre: dto.genre, coverUrl: dto.coverUrl,
        status: dto.status, rating: dto.rating,
      },
      include: { platform: true },
    });
  }

  findAll(userId: string) {
    return this.prisma.game.findMany({
      where: { userId },
      include: { platform: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, userId },
      include: { platform: true },
    });
    if (!game) throw new NotFoundException('Jogo não encontrado.');
    return game;
  }

  async update(userId: string, id: string, dto: UpdateGameDto) {
    await this.findOne(userId, id);
    if (dto.platformId !== undefined) await this.ensurePlatformExists(dto.platformId);
    return this.updateOwned(userId, id, {
      title: dto.title, platformId: dto.platformId, developer: dto.developer,
      genre: dto.genre, coverUrl: dto.coverUrl,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    try {
      await this.prisma.game.delete({ where: { id, userId } });
    } catch (error) {
      this.rethrowMutationError(error);
    }
  }

  async updateStatus(userId: string, id: string, dto: UpdateStatusDto) {
    await this.findOne(userId, id);
    return this.updateOwned(userId, id, { status: dto.status });
  }

  async toggleFavorite(userId: string, id: string) {
    const game = await this.findOne(userId, id);
    return this.updateOwned(userId, id, { favorite: !game.favorite });
  }

  async updateRating(userId: string, id: string, dto: UpdateRatingDto) {
    await this.findOne(userId, id);
    return this.updateOwned(userId, id, { rating: dto.rating });
  }

  private async ensurePlatformExists(id: number) {
    const platform = await this.prisma.platform.findUnique({ where: { id } });
    if (!platform) throw new BadRequestException('Plataforma não encontrada.');
  }

  private async updateOwned(userId: string, id: string, data: Prisma.GameUncheckedUpdateInput) {
    try {
      return await this.prisma.game.update({
        where: { id, userId }, data, include: { platform: true },
      });
    } catch (error) {
      this.rethrowMutationError(error);
    }
  }

  private rethrowMutationError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Jogo não encontrado.');
    }
    throw error;
  }
}
