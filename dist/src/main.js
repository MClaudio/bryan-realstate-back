"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const path_1 = require("path");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const rawPort = process.env.PORT ?? '3000';
    const port = Number.parseInt(rawPort, 10);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        logger.error(`Puerto inválido en PORT='${rawPort}'. Usa un número entre 1 y 65535.`);
        process.exit(1);
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/uploads',
    });
    try {
        await app.listen(port);
        const url = await app.getUrl();
        logger.log(`Nest application successfully started on ${url}`);
    }
    catch (error) {
        const code = error?.code;
        if (code === 'EADDRINUSE') {
            logger.error(`No se pudo arrancar el backend: el puerto ${port} ya está en uso (EADDRINUSE). ` +
                `Cierra el proceso que lo ocupa o cambia el valor de PORT en tu .env.`);
        }
        else {
            logger.error(`No se pudo arrancar el backend: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map