import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  // Security: Helmet for HTTP headers
  app.use(helmet());

  // CORS configuration from env
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [
        configService.get<string>("NEXT_PUBLIC_API_URL") ?? "http://localhost:3000",
        "http://localhost:3000",
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins for development; restrict in production
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix("api");

  // Global pipes - validate all input with whitelist
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Enable graceful shutdown hooks (for Kubernetes/Docker)
  app.enableShutdownHooks();

  const port = configService.get<number>("API_PORT") ?? 3001;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
}
bootstrap();