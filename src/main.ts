import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';
import { configureSwagger } from './config/configure-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, app.get(ConfigService));
  configureSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
