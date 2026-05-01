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
exports.GoogleToDbSyncDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const google_contact_selection_dto_1 = require("./google-contact-selection.dto");
class GoogleToDbSyncDto {
    selectedContacts;
    excludedContacts;
    forceSync;
}
exports.GoogleToDbSyncDto = GoogleToDbSyncDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => google_contact_selection_dto_1.GoogleContactSelectionDto),
    __metadata("design:type", Array)
], GoogleToDbSyncDto.prototype, "selectedContacts", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => google_contact_selection_dto_1.GoogleContactSelectionDto),
    __metadata("design:type", Array)
], GoogleToDbSyncDto.prototype, "excludedContacts", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GoogleToDbSyncDto.prototype, "forceSync", void 0);
//# sourceMappingURL=google-to-db-sync.dto.js.map