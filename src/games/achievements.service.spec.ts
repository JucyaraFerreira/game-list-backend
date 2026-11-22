import { AchievementsService } from './achievements.service';

// Fake mínimo: g1 tem o catálogo informado; as conquistas c1 são do catálogo e a custom pertence a g1.
function setup(catalogGameId: string | null) {
  const achievements: any[] = [
    { id: 'a1', catalogGameId: 'c1', gameId: null, title: 'A', description: null, xp: 30 },
    { id: 'a2', catalogGameId: 'c1', gameId: null, title: 'B', description: null, xp: 70 },
  ];
  const unlocked = new Set<string>();
  const inScope = (a: any, where: any) => (where.OR ?? [where]).some((w: any) =>
    (w.gameId === undefined || a.gameId === w.gameId) && (w.catalogGameId === undefined || a.catalogGameId === w.catalogGameId)
    && (w.gameId !== undefined || w.catalogGameId !== undefined));
  const prisma = {
    game: { findFirst: async ({ where }: any) => (where.id === 'g1' ? { catalogGameId } : null) },
    achievement: {
      findMany: async ({ where }: any) => achievements.filter((a) => inScope(a, where))
        .map((a) => ({ ...a, unlocks: unlocked.has(a.id) ? [{ unlockedAt: new Date() }] : [] })),
      findFirst: async ({ where }: any) => achievements.find((a) => a.id === where.id && inScope(a, where)) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `x${achievements.length}`, catalogGameId: null, description: null, ...data };
        achievements.push(row);
        return row;
      },
    },
    userAchievement: {
      upsert: async ({ create }: any) => void unlocked.add(create.achievementId),
      deleteMany: async ({ where }: any) => void unlocked.delete(where.achievementId),
    },
  };
  return new AchievementsService(prisma as any);
}

describe('AchievementsService', () => {
  it('calcula o progresso ao marcar e desmarcar', async () => {
    const service = setup('c1');
    expect(await service.progress('u1', 'g1')).toMatchObject({ unlocked: 0, total: 2, percent: 0, xp: 0, totalXp: 100 });
    await service.unlock('u1', 'g1', 'a2');
    expect(await service.progress('u1', 'g1')).toMatchObject({ unlocked: 1, percent: 50, xp: 70 });
    await service.lock('u1', 'g1', 'a2');
    expect((await service.progress('u1', 'g1')).unlocked).toBe(0);
  });

  it('jogo sem catálogo começa vazio e passa a ter as conquistas que o usuário cria', async () => {
    const service = setup(null);
    expect(await service.list('u1', 'g1')).toEqual([]);
    await expect(service.unlock('u1', 'g1', 'a1')).rejects.toThrow('Conquista não encontrada');
    const created = await service.create('u1', 'g1', { title: ' Zerou ', xp: 20 });
    expect(created).toMatchObject({ title: 'Zerou', unlocked: false });
    await service.unlock('u1', 'g1', created.id);
    expect(await service.progress('u1', 'g1')).toMatchObject({ unlocked: 1, total: 1, percent: 100, xp: 20 });
  });

  it('soma conquistas do catálogo e as próprias no mesmo jogo', async () => {
    const service = setup('c1');
    await service.create('u1', 'g1', { title: 'Extra' });
    expect((await service.list('u1', 'g1')).length).toBe(3);
  });

  it('jogo de outra conta ou conquista de outro catálogo dá 404', async () => {
    await expect(setup('c1').list('u1', 'outro')).rejects.toThrow('Jogo não encontrado');
    await expect(setup('c1').create('u1', 'outro', { title: 'X' })).rejects.toThrow('Jogo não encontrado');
    await expect(setup('c2').unlock('u1', 'g1', 'a1')).rejects.toThrow('Conquista não encontrada');
  });
});
