import { BadGatewayException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IgdbSearchItem { igdbId: number; title: string; coverUrl: string | null; genre: string | null }
export interface IgdbGame extends IgdbSearchItem { developer: string | null; steamAppId: number | null }

type Json = Record<string, any>;

// Cliente mínimo da IGDB (fetch, sem dependência). Campos lidos de forma tolerante: o formato real não foi validado com credenciais.
@Injectable()
export class IgdbService {
  private token?: { value: string; expiresAt: number };

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private credentials() {
    const id = this.config.get<string>('IGDB_CLIENT_ID', '');
    const secret = this.config.get<string>('IGDB_CLIENT_SECRET', '');
    if (!id || !secret) throw new ServiceUnavailableException('Catálogo IGDB não configurado.');
    return { id, secret };
  }

  // Token de app da Twitch, guardado em memória até perto de expirar.
  private async accessToken(force = false): Promise<string> {
    if (!force && this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const { id, secret } = this.credentials();
    const query = new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' });
    const response = await fetch(`https://id.twitch.tv/oauth2/token?${query}`, { method: 'POST', signal: AbortSignal.timeout(8000) }).catch(() => undefined);
    const body = response?.ok ? await response.json().catch(() => undefined) : undefined;
    if (typeof body?.access_token !== 'string') throw new BadGatewayException('Não foi possível autenticar na IGDB.');
    this.token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 0) * 1000 };
    return this.token.value;
  }

  private async query(body: string, retry = true): Promise<Json[]> {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST', body, signal: AbortSignal.timeout(8000),
      headers: { 'Client-ID': this.credentials().id, Authorization: `Bearer ${await this.accessToken(!retry)}`, Accept: 'application/json' },
    }).catch(() => undefined);
    if (response?.status === 401 && retry) return this.query(body, false);
    if (!response?.ok) throw new BadGatewayException('Não foi possível consultar a IGDB.');
    const data = await response.json().catch(() => undefined);
    return Array.isArray(data) ? data : [];
  }

  private static names(list: unknown): string[] {
    return Array.isArray(list) ? list.map((item) => item?.name).filter((name): name is string => typeof name === 'string' && !!name) : [];
  }

  private static summary(raw: Json): IgdbSearchItem {
    const imageId = raw.cover?.image_id;
    return {
      igdbId: raw.id, title: String(raw.name ?? '').trim(),
      coverUrl: typeof imageId === 'string' && imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : null,
      genre: IgdbService.names(raw.genres)[0] ?? null,
    };
  }

  async search(term: string): Promise<IgdbSearchItem[]> {
    // Aspas e barras saem do termo para ele não fechar a string da consulta.
    const results = await this.query(`search "${term.replace(/["\\]/g, ' ')}"; fields name,cover.image_id,genres.name; limit 20;`);
    return results.map(IgdbService.summary).filter((game) => Number.isInteger(game.igdbId) && game.title);
  }

  async findOne(igdbId: number): Promise<IgdbGame> {
    const [raw] = await this.query(
      `fields name,cover.image_id,genres.name,involved_companies.developer,involved_companies.company.name,external_games.uid,external_games.url,external_games.category,external_games.external_game_source; where id = ${igdbId}; limit 1;`,
    );
    const base = raw ? IgdbService.summary(raw) : undefined;
    if (!base || !Number.isInteger(base.igdbId) || !base.title) throw new BadGatewayException('Resposta inesperada da IGDB.');
    const developers: Json[] = Array.isArray(raw.involved_companies) ? raw.involved_companies.filter((item: Json) => item?.developer) : [];
    const steam = (Array.isArray(raw.external_games) ? raw.external_games : []).find(
      (item: Json) => item?.category === 1 || item?.external_game_source === 1 || /store\.steampowered\.com\/app\//.test(String(item?.url ?? '')),
    );
    const steamAppId = /^\d+$/.test(String(steam?.uid ?? '')) ? Number(steam.uid) : null;
    return { ...base, developer: IgdbService.names(developers.map((item) => item.company))[0] ?? null, steamAppId };
  }
}
