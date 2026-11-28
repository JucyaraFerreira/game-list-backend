import { Inject, Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAGIC = [
  { ext: 'jpg', type: 'image/jpeg', matches: (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  { ext: 'png', type: 'image/png', matches: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', type: 'image/webp', matches: (b: Buffer) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

// Identifica a imagem pelos primeiros bytes: o mimetype enviado pelo cliente pode mentir.
export function detectImage(buffer: Buffer) {
  return MAGIC.find((format) => format.matches(buffer));
}

// Supabase Storage pela API REST (fetch), sem dependência extra.
@Injectable()
export class StorageService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private settings() {
    const url = this.config.get<string>('SUPABASE_URL', '').replace(/\/+$/, '');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY', '');
    const bucket = this.config.get<string>('SUPABASE_BUCKET', 'covers');
    if (!url || !key) throw new ServiceUnavailableException('Armazenamento de imagens não configurado.');
    return { url, bucket, headers: { Authorization: `Bearer ${key}`, apikey: key } };
  }

  // Envia o arquivo e devolve a URL pública do bucket.
  async upload(path: string, body: Buffer, contentType: string): Promise<string> {
    const { url, bucket, headers } = this.settings();
    const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': contentType }, body: new Uint8Array(body),
    }).catch(() => undefined);
    if (!response?.ok) throw new InternalServerErrorException('Não foi possível salvar a imagem.');
    return `${url}/storage/v1/object/public/${bucket}/${path}`;
  }

  // Melhor esforço: ignora URLs que não são do nosso bucket e falhas de rede (sobra no máximo um arquivo órfão).
  async remove(publicUrl: string | null | undefined): Promise<void> {
    if (!publicUrl) return;
    let settings: ReturnType<StorageService['settings']>;
    try { settings = this.settings(); } catch { return; }
    const prefix = `${settings.url}/storage/v1/object/public/${settings.bucket}/`;
    if (!publicUrl.startsWith(prefix)) return;
    await fetch(`${settings.url}/storage/v1/object/${settings.bucket}/${publicUrl.slice(prefix.length)}`, {
      method: 'DELETE', headers: settings.headers,
    }).catch(() => undefined);
  }
}
