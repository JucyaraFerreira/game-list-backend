import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SessionTransport } from '../auth/transport/session-transport';

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('Game List API')
    .setDescription('API para organizar a biblioteca pessoal de jogos. Autenticação por sessão opaca, sem JWT. '
      + 'Na Web, POST /auth/login usa cookie HttpOnly por padrão. No app nativo, envie X-Auth-Transport: bearer '
      + 'e use o token retornado no botão Authorize. Cadastro e login: 10 tentativas por minuto por IP, por instância. '
      + 'Respostas de autenticação usam Cache-Control: no-store.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'Opaque session token' }, 'sessionBearer')
    .addCookieAuth(app.get(SessionTransport).cookieName, { type: 'apiKey', in: 'cookie' }, 'sessionCookie')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, { swaggerOptions: { persistAuthorization: false, withCredentials: true } });
  return document;
}
