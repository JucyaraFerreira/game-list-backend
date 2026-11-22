import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.catalogGame.findMany({
      where: search ? { title: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { title: 'asc' },
      take: 50,
    });
  }
}
