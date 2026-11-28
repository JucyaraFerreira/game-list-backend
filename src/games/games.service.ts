import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { StorageService, detectImage } from '../storage/storage.service';

@Injectable()
export class GamesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateGameDto) {
    await this.ensurePlatformExists(dto.platformId);
    // Jogo do catálogo: os dados vêm do catálogo, para todos verem o mesmo título. Jogo manual fica privado na conta.
    const catalog = dto.catalogGameId ? await this.findCatalogGame(dto.catalogGameId) : null;
    const title = (catalog?.title ?? dto.title ?? '').trim();
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
      await this.ensureUnique(tx, userId, title, dto.platformId);
      return tx.game.create({
        data: {
          title, platformId: dto.platformId, userId,
          developer: catalog ? catalog.developer : dto.developer,
          genre: catalog ? catalog.genre : dto.genre,
          coverUrl: catalog ? catalog.coverUrl : dto.coverUrl,
          status: dto.status, rating: dto.rating, catalogGameId: dto.catalogGameId,
        },
        include: { platform: true },
      });
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
    const data = {
      title: dto.title?.trim(), platformId: dto.platformId, developer: dto.developer,
      genre: dto.genre, coverUrl: dto.coverUrl,
    };
    if (dto.title === undefined && dto.platformId === undefined) return this.updateOwned(userId, id, data);
    try {
      return await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
        const current = await tx.game.findFirst({ where: { id, userId } });
        if (!current) throw new NotFoundException('Jogo não encontrado.');
        await this.ensureUnique(tx, userId, dto.title ?? current.title, dto.platformId ?? current.platformId, id);
        return tx.game.update({ where: { id, userId }, data, include: { platform: true } });
      });
    } catch (error) { this.rethrowMutationError(error); }
  }

  private async ensureUnique(tx: Prisma.TransactionClient, userId: string, title: string, platformId: number, excludeId?: string) {
    const duplicate = await tx.game.findFirst({
      where: { userId, platformId, title: { equals: title.trim(), mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (duplicate) throw new ConflictException('Este jogo já está na sua biblioteca nesta plataforma.');
  }

  async remove(userId: string, id: string) {
    const game = await this.findOne(userId, id);
    try {
      await this.prisma.game.delete({ where: { id, userId } });
    } catch (error) {
      this.rethrowMutationError(error);
    }
    await this.storage.remove(game.coverUrl);
  }

  // A capa vai para o Supabase Storage e a URL pública fica em coverUrl; a capa anterior é apagada.
  async setCover(userId: string, id: string, file?: { buffer: Buffer }) {
    const game = await this.findOne(userId, id);
    const image = file && detectImage(file.buffer);
    if (!file || !image) throw new BadRequestException('Envie uma imagem JPEG, PNG ou WebP no campo "file".');
    const coverUrl = await this.storage.upload(`${userId}/${id}-${Date.now()}.${image.ext}`, file.buffer, image.type);
    try {
      const updated = await this.updateOwned(userId, id, { coverUrl });
      await this.storage.remove(game.coverUrl);
      return updated;
    } catch (error) {
      await this.storage.remove(coverUrl);
      throw error;
    }
  }

  async updateStatus(userId: string, id: string, dto: UpdateStatusDto) {
    await this.findOne(userId, id);
    return this.updateOwned(userId, id, { status: dto.status });
  }

  async toggleFavorite(userId: string, id: string) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
        const game = await tx.game.findFirst({ where: { id, userId } });
        if (!game) throw new NotFoundException('Jogo não encontrado.');
        return tx.game.update({ where: { id, userId }, data: { favorite: !game.favorite }, include: { platform: true } });
      });
    } catch (error) { this.rethrowMutationError(error); }
  }

  async updateRating(userId: string, id: string, dto: UpdateRatingDto) {
    await this.findOne(userId, id);
    return this.updateOwned(userId, id, { rating: dto.rating });
  }

  private async ensurePlatformExists(id: number) {
    const platform = await this.prisma.platform.findUnique({ where: { id } });
    if (!platform) throw new BadRequestException('Plataforma não encontrada.');
  }

  private async findCatalogGame(id: string) {
    const game = await this.prisma.catalogGame.findUnique({ where: { id } });
    if (!game) throw new BadRequestException('Jogo do catálogo não encontrado.');
    return game;
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
