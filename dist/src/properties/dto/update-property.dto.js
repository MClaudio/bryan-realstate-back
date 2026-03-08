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
exports.UpdatePropertyDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class UpdatePropertyDto {
    code;
    address;
    locationUrl;
    constructionArea;
    landArea;
    hasBasicServices;
    basicServices;
    features;
    propertyType;
    constructionYears;
    latitude;
    longitude;
    topography;
    zone;
    cityTime;
    observations;
    status;
    advisorId;
    owner;
    price;
    maxPrice;
    minPrice;
    commission;
    salePrice;
    isPublic;
    isActive;
    isFeatured;
    facebookUrl;
    tiktokUrl;
    instagramUrl;
    youtubeUrl;
    fileIds;
    documentFileIds;
    negotiationClientId;
}
exports.UpdatePropertyDto = UpdatePropertyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "locationUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "constructionArea", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "landArea", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePropertyDto.prototype, "hasBasicServices", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePropertyDto.prototype, "basicServices", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "features", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PropertyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "propertyType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "constructionYears", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "latitude", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "longitude", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.Topography),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "topography", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.Zone),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "zone", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "cityTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "observations", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.PropertyStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "advisorId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "owner", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "maxPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "minPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "commission", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdatePropertyDto.prototype, "salePrice", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePropertyDto.prototype, "isPublic", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePropertyDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdatePropertyDto.prototype, "isFeatured", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'facebookUrl must be a valid URL address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((obj, value) => value !== '' && value !== null && value !== undefined),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "facebookUrl", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'tiktokUrl must be a valid URL address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((obj, value) => value !== '' && value !== null && value !== undefined),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "tiktokUrl", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'instagramUrl must be a valid URL address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((obj, value) => value !== '' && value !== null && value !== undefined),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "instagramUrl", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'youtubeUrl must be a valid URL address' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((obj, value) => value !== '' && value !== null && value !== undefined),
    __metadata("design:type", String)
], UpdatePropertyDto.prototype, "youtubeUrl", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePropertyDto.prototype, "fileIds", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdatePropertyDto.prototype, "documentFileIds", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((obj, value) => value !== null && value !== undefined && value !== ''),
    __metadata("design:type", Object)
], UpdatePropertyDto.prototype, "negotiationClientId", void 0);
//# sourceMappingURL=update-property.dto.js.map