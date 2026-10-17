import { 
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class GamesService {
constructor (
    @Inject(PrismaService) private readonly prisma: PrismaService,
) {}

    //TODO: trocar pelo id do usuario logado quando houver auth.
    async create(userId: string, dto: CreateGameDto) {
        const plataform = await this.prisma.platform.findUnique({
            where: { id: dto.platformId } ,
        });

        if (!plataform) {
            throw new BadRequestException (
                `Plataforma ${dto.platformId} não existe`,
            );
        }

        return this.prisma.game.create({
            data: { ...dto, userId },
            include: { platform: true},
        });
    }

    private async findOwnedOrFail(userId: string, id: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, userId },
    });

    if (!game) {
      throw new NotFoundException(`Jogo ${id} não encontrado`);
    }

    return game;
  }

  //TODO: trocar userId pelo usuário logado.
  async remove(userId: string, id: string) {
    await this.findOwnedOrFail(userId, id);
    await this.prisma.game.delete({ where: { id } });
  }

    //TODO: trocar userId pelo usuário logado.
  async updateStatus(userId: string, id: string, dto: UpdateStatusDto) {
    await this.findOwnedOrFail(userId, id);
    return this.prisma.game.update({
      where: { id },
      data: { status: dto.status },
      include: { platform: true },
    });
  }

  //TODO: trocar userId pelo usuário logado.
  async toggleFavorite(userId: string, id: string) {
    const game = await this.findOwnedOrFail(userId, id);
    return this.prisma.game.update({
      where: { id },
      data: { favorite: !game.favorite },
      include: { platform: true },
    });
  }

  // TODO: trocar userId pelo usuário logado.
  async updateRating(userId: string, id: string, dto: UpdateRatingDto) {
    await this.findOwnedOrFail(userId, id);
    return this.prisma.game.update({
      where: { id },
      data: { rating: dto.rating },
      include: { platform: true },
    });
  }

    //TODO: trocar userID pelo usuario logado
    findAll(userId: string) {
        return this.prisma.game.findMany({
            where: { userId },
            include: { platform: true },
            orderBy: { createdAt: 'desc'},
        });
    }
}
