"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncContactsController = void 0;
const common_1 = require("@nestjs/common");
const sync_contacts_service_1 = require("./sync-contacts.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const google_to_db_sync_dto_1 = require("./dto/google-to-db-sync.dto");
const google_auth_code_dto_1 = require("./dto/google-auth-code.dto");
let SyncContactsController = class SyncContactsController {
    syncContactsService;
    constructor(syncContactsService) {
        this.syncContactsService = syncContactsService;
    }
    googleAuthUrl() {
        return this.syncContactsService.getGoogleAuthUrl();
    }
    googleAuthCallback(payload) {
        return this.syncContactsService.exchangeGoogleAuthCode(payload.code);
    }
    googlePreview(force) {
        return this.syncContactsService.getGooglePreview(force === 'true');
    }
    googleToDb(payload) {
        return this.syncContactsService.syncGoogleToDb(payload);
    }
    dbToGoogle() {
        return this.syncContactsService.syncDbToGoogle();
    }
    clearExclusions() {
        return this.syncContactsService.clearExclusions();
    }
};
exports.SyncContactsController = SyncContactsController;
__decorate([
    (0, common_1.Get)('google-auth-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncContactsController.prototype, "googleAuthUrl", null);
__decorate([
    (0, common_1.Post)('google-auth-callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_auth_code_dto_1.GoogleAuthCodeDto]),
    __metadata("design:returntype", void 0)
], SyncContactsController.prototype, "googleAuthCallback", null);
__decorate([
    (0, common_1.Get)('google-preview'),
    __param(0, (0, common_1.Query)('force')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SyncContactsController.prototype, "googlePreview", null);
__decorate([
    (0, common_1.Post)('google-to-db'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_to_db_sync_dto_1.GoogleToDbSyncDto]),
    __metadata("design:returntype", void 0)
], SyncContactsController.prototype, "googleToDb", null);
__decorate([
    (0, common_1.Post)('db-to-google'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncContactsController.prototype, "dbToGoogle", null);
__decorate([
    (0, common_1.Delete)('exclusions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncContactsController.prototype, "clearExclusions", null);
exports.SyncContactsController = SyncContactsController = __decorate([
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sync_contacts_service_1.SyncContactsService])
], SyncContactsController);
//# sourceMappingURL=sync-contacts.controller.js.map