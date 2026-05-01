"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncContactsModule = void 0;
const common_1 = require("@nestjs/common");
const sync_contacts_service_1 = require("./sync-contacts.service");
const sync_contacts_controller_1 = require("./sync-contacts.controller");
const google_contacts_module_1 = require("../google-contacts/google-contacts.module");
const prisma_module_1 = require("../prisma/prisma.module");
const exclusion_service_1 = require("./exclusion.service");
let SyncContactsModule = class SyncContactsModule {
};
exports.SyncContactsModule = SyncContactsModule;
exports.SyncContactsModule = SyncContactsModule = __decorate([
    (0, common_1.Module)({
        imports: [google_contacts_module_1.GoogleContactsModule, prisma_module_1.PrismaModule],
        controllers: [sync_contacts_controller_1.SyncContactsController],
        providers: [sync_contacts_service_1.SyncContactsService, exclusion_service_1.ExclusionService],
        exports: [sync_contacts_service_1.SyncContactsService],
    })
], SyncContactsModule);
//# sourceMappingURL=sync-contacts.module.js.map