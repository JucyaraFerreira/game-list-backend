import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SteamAchievement { title: string; description: string | null }

// Conquistas pelo schema do jogo na Steam. A chave é opcional: sem ela o jogo importa sem conquistas.
@Injectable()
export class SteamService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async achievements(appId: number): Promise<SteamAchievement[]> {
    const key = this.config.get<string>('STEAM_API_KEY', '');
    if (!key) return [];
    const query = new URLSearchParams({ key, appid: String(appId), l: 'brazilian' });
    const response = await fetch(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?${query}`, { signal: AbortSignal.timeout(8000) }).catch(() => undefined);
    if (!response?.ok) throw new BadGatewayException('Não foi possível consultar a Steam.');
    const data = await response.json().catch(() => undefined);
    const list: any[] = data?.game?.availableGameStats?.achievements ?? [];
    return (Array.isArray(list) ? list : [])
      .filter((item) => typeof item?.displayName === 'string' && item.displayName.trim())
      .map((item) => ({ title: item.displayName.trim(), description: typeof item.description === 'string' && item.description ? item.description : null }));
  }
}
