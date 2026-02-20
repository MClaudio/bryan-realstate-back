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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateConfigurationDto = void 0;
const class_validator_1 = require("class-validator");
class CreateConfigurationDto {
    logoId;
    companyName;
    businessName;
    ruc;
    phone;
    email;
    facebookProfile;
    instagramProfile;
    youtubeProfile;
    whatsappLink;
}
exports.CreateConfigurationDto = CreateConfigurationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "logoId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "businessName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(13),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "ruc", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'email must be an email' }),
    (0, class_validator_1.ValidateIf)((o) => o.email !== undefined && o.email !== ''),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'facebookProfile must be a URL address' }),
    (0, class_validator_1.ValidateIf)((o) => o.facebookProfile !== undefined && o.facebookProfile !== ''),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "facebookProfile", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'instagramProfile must be a URL address' }),
    (0, class_validator_1.ValidateIf)((o) => o.instagramProfile !== undefined && o.instagramProfile !== ''),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "instagramProfile", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'youtubeProfile must be a URL address' }),
    (0, class_validator_1.ValidateIf)((o) => o.youtubeProfile !== undefined && o.youtubeProfile !== ''),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "youtubeProfile", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'whatsappLink must be a URL address' }),
    (0, class_validator_1.ValidateIf)((o) => o.whatsappLink !== undefined && o.whatsappLink !== ''),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateConfigurationDto.prototype, "whatsappLink", void 0);
//# sourceMappingURL=create-configuration.dto.js.map