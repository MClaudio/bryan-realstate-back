"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationSchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const recommendation_scheduler_service_1 = require("./recommendation-scheduler.service");
const properties_module_1 = require("../properties/properties.module");
const property_interests_module_1 = require("../property-interests/property-interests.module");
const notifications_module_1 = require("../notifications/notifications.module");
let RecommendationSchedulerModule = class RecommendationSchedulerModule {
};
exports.RecommendationSchedulerModule = RecommendationSchedulerModule;
exports.RecommendationSchedulerModule = RecommendationSchedulerModule = __decorate([
    (0, common_1.Module)({
        imports: [properties_module_1.PropertiesModule, property_interests_module_1.PropertyInterestsModule, notifications_module_1.NotificationsModule],
        providers: [recommendation_scheduler_service_1.RecommendationSchedulerService],
        exports: [recommendation_scheduler_service_1.RecommendationSchedulerService],
    })
], RecommendationSchedulerModule);
//# sourceMappingURL=recommendation-scheduler.module.js.map