"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateConfigurationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_configuration_dto_1 = require("./create-configuration.dto");
class UpdateConfigurationDto extends (0, mapped_types_1.PartialType)(create_configuration_dto_1.CreateConfigurationDto) {
}
exports.UpdateConfigurationDto = UpdateConfigurationDto;
//# sourceMappingURL=update-configuration.dto.js.map