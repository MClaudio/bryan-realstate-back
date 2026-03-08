"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const clients_module_1 = require("./clients/clients.module");
const properties_module_1 = require("./properties/properties.module");
const files_module_1 = require("./files/files.module");
const configurations_module_1 = require("./configurations/configurations.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const processes_module_1 = require("./processes/processes.module");
const property_interests_module_1 = require("./property-interests/property-interests.module");
const blacklist_module_1 = require("./blacklist/blacklist.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            clients_module_1.ClientsModule,
            properties_module_1.PropertiesModule,
            files_module_1.FilesModule,
            configurations_module_1.ConfigurationsModule,
            dashboard_module_1.DashboardModule,
            processes_module_1.ProcessesModule,
            property_interests_module_1.PropertyInterestsModule,
            blacklist_module_1.BlacklistModule,
        ],
        controllers: [],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map