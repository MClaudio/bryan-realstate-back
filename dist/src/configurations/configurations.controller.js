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
exports.ConfigurationsController = void 0;
const common_1 = require("@nestjs/common");
const configurations_service_1 = require("./configurations.service");
const create_configuration_dto_1 = require("./dto/create-configuration.dto");
const update_configuration_dto_1 = require("./dto/update-configuration.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ConfigurationsController = class ConfigurationsController {
    configurationsService;
    constructor(configurationsService) {
        this.configurationsService = configurationsService;
    }
    create(createConfigurationDto) {
        return this.configurationsService.create(createConfigurationDto);
    }
    find() {
        return this.configurationsService.findOne();
    }
    update(updateConfigurationDto) {
        return this.configurationsService.update(updateConfigurationDto);
    }
};
exports.ConfigurationsController = ConfigurationsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_configuration_dto_1.CreateConfigurationDto]),
    __metadata("design:returntype", void 0)
], ConfigurationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigurationsController.prototype, "find", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_configuration_dto_1.UpdateConfigurationDto]),
    __metadata("design:returntype", void 0)
], ConfigurationsController.prototype, "update", null);
exports.ConfigurationsController = ConfigurationsController = __decorate([
    (0, common_1.Controller)('configuration'),
    __metadata("design:paramtypes", [configurations_service_1.ConfigurationsService])
], ConfigurationsController);
//# sourceMappingURL=configurations.controller.js.map