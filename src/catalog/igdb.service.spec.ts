import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { IgdbService } from './igdb.service';
import { SteamService } from './steam.service';

const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;
const config = (values: Record<string, string> = { IGDB_CLIENT_ID: 'id', IGDB_CLIENT_SECRET: 'secret', STEAM_API_KEY: 'k' }) =>
  ({ get: (key: string, fallback = '') => values[key] ?? fallback }) as any;

// Responde ao token da Twitch e à consulta da IGDB.
const mockIgdb = (games: unknown) =>
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).includes('id.twitch.tv') ? json({ access_token: 't', expires_in: 3600 }) : json(games),
  );

describe('IgdbService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('monta o jogo com capa, gênero, desenvolvedora e id da Steam', async () => {
    mockIgdb([{
      id: 7, name: 'Hades', cover: { image_id: 'co1abc' }, genres: [{ name: 'Indie' }],
      involved_companies: [{ developer: false, company: { name: 'Editora' } }, { developer: true, company: { name: 'Supergiant' } }],
      external_games: [{ uid: 'abc', category: 5 }, { uid: '1145360', category: 1 }],
    }]);
    expect(await new IgdbService(config()).findOne(7)).toEqual({
      igdbId: 7, title: 'Hades', coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg',
      genre: 'Indie', developer: 'Supergiant', steamAppId: 1145360,
    });
  });

  it('tira aspas do termo, falha com 502 se a IGDB errar ou a rede cair e com 503 sem credenciais', async () => {
    const spy = mockIgdb([]);
    await new IgdbService(config()).search('a"; fields x');
    expect(String(spy.mock.calls[1][1]?.body)).toContain('search "a ; fields x"; fields name');
    spy.mockResolvedValue(json({}, false, 500));
    await expect(new IgdbService(config()).search('x')).rejects.toBeInstanceOf(BadGatewayException);
    spy.mockRejectedValue(new Error('rede'));
    await expect(new IgdbService(config()).search('x')).rejects.toBeInstanceOf(BadGatewayException);
    await expect(new IgdbService(config({})).search('x')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('SteamService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lê as conquistas e devolve vazio sem chave', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ game: { availableGameStats: { achievements: [{ displayName: 'Fuga', description: 'Escape' }, { displayName: ' ' }] } } }),
    );
    expect(await new SteamService(config()).achievements(1)).toEqual([{ title: 'Fuga', description: 'Escape' }]);
    expect(await new SteamService(config({})).achievements(1)).toEqual([]);
  });
});

describe('CatalogService', () => {
  const game = { igdbId: 7, title: 'Hades', developer: null, genre: 'Action', coverUrl: null, steamAppId: 10 };
  const txWith = (overrides: Record<string, unknown> = {}) => ({
    catalogGame: { findUnique: jest.fn().mockResolvedValue({ id: 'a', title: 'Hades' }), findFirst: jest.fn(), create: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'a' }), ...overrides },
    achievement: { createMany: jest.fn() },
  });
  const service = (tx: any, steam: unknown = { achievements: async () => [{ title: 'A', description: null }] }) =>
    new CatalogService({ $transaction: (fn: any) => fn(tx) } as any, { findOne: async () => game } as any, steam as any);

  it('a busca ignora a IGDB fora do ar e não repete jogos já importados', async () => {
    const prisma = { catalogGame: { findMany: async () => [{ id: 'a', igdbId: 7, title: 'Hades' }] } } as any;
    const igdb = { search: async () => [{ igdbId: 7, title: 'Hades' }, { igdbId: 8, title: 'Celeste' }] } as any;
    expect(await new CatalogService(prisma, igdb, {} as any).findAll('h')).toEqual([{ id: 'a', igdbId: 7, title: 'Hades' }, { id: null, igdbId: 8, title: 'Celeste' }]);
    const down = { search: async () => { throw new BadGatewayException(); } } as any;
    expect(await new CatalogService(prisma, down, {} as any).findAll('h')).toHaveLength(1);
  });

  it('reimportar atualiza pelo igdbId, sem apagar dados nem mudar o título, e não duplica conquistas', async () => {
    const tx = txWith();
    await service(tx).importFromIgdb(7);
    expect(tx.catalogGame.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { igdbId: 7, developer: undefined, genre: 'Action', coverUrl: undefined } });
    expect(tx.achievement.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it('título já usado por outro jogo da IGDB ganha o igdbId no nome em vez de sobrescrever', async () => {
    const tx = txWith({ findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'old', title: 'Hades', igdbId: 1 }), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'new' }) });
    await service(tx).importFromIgdb(7);
    expect(tx.catalogGame.update).not.toHaveBeenCalled();
    expect(tx.catalogGame.create).toHaveBeenCalledWith({ data: expect.objectContaining({ igdbId: 7, title: 'Hades (7)' }) });
  });

  it('Steam fora do ar não impede o import', async () => {
    const tx = txWith();
    await service(tx, { achievements: async () => { throw new BadGatewayException(); } }).importFromIgdb(7);
    expect(tx.achievement.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
  });
});
