import { 
    BadRequestException,
    Inject,
    Injectable 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';

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

    //TODO: trocar userID pelo usuario logado
    findAll(userId: string) {
        return this.prisma.game.findMany({
            where: { userId },
            include: { platform: true },
            orderBy: { createdAt: 'desc'},
        });
    }
}
