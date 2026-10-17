import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let module: TestingModule;
  let connect: jest.SpyInstance<Promise<void>, []>;
  let disconnect: jest.SpyInstance<Promise<void>, []>;
  const config = {
    getOrThrow: jest.fn().mockReturnValue(
      'postgresql://unit:unit@127.0.0.1:1/gamelist_unit',
    ),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [PrismaService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await module.close();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(config.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    expect(connect).not.toHaveBeenCalled();
  });

  it('connects on module initialization using a substituted connection', async () => {
    await module.init();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destruction using a substituted connection', async () => {
    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
