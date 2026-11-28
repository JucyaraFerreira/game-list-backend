import { detectImage } from './storage.service';

describe('detectImage', () => {
  it('reconhece JPEG, PNG e WebP pelos bytes iniciais', () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.type).toBe('image/jpeg');
    expect(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.type).toBe('image/png');
    expect(detectImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))?.type).toBe('image/webp');
  });

  it('recusa outros formatos, mesmo que o cliente diga que é imagem', () => {
    expect(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeUndefined();
    expect(detectImage(Buffer.from('GIF89a'))).toBeUndefined();
    expect(detectImage(Buffer.alloc(0))).toBeUndefined();
  });
});
