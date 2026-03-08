"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBlacklistDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_blacklist_dto_1 = require("./create-blacklist.dto");
class UpdateBlacklistDto extends (0, mapped_types_1.PartialType)(create_blacklist_dto_1.CreateBlacklistDto) {
}
exports.UpdateBlacklistDto = UpdateBlacklistDto;
//# sourceMappingURL=update-blacklist.dto.js.map