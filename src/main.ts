import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app, app.get(ConfigService));
  const config = new DocumentBuilder()
    .setTitle('Game List API')
    .setDescription('API para organizar a biblioteca pessoal de jogos')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
