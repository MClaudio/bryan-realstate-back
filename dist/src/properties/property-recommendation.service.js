"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PropertyRecommendationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyRecommendationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt = __importStar(require("jsonwebtoken"));
let PropertyRecommendationService = PropertyRecommendationService_1 = class PropertyRecommendationService {
    configService;
    logger = new common_1.Logger(PropertyRecommendationService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async recommendCandidates(property) {
        const endpointBase = this.configService.get('N8N_RECOMMENDER_URL');
        const endpoint = endpointBase
            ? `${endpointBase.replace(/\/$/, '')}/agent-http-router`
            : undefined;
        const jwtSecret = this.configService.get('N8N_JWT_SECRET');
        const jwtAlgorithm = this.configService.get('N8N_JWT_ALGORITHM') || 'HS256';
        const jwtExpiresIn = this.configService.get('N8N_JWT_EXPIRES_IN') || '3600';
        const timeoutMs = Number(this.configService.get('N8N_RECOMMENDER_TIMEOUT_MS') ?? '12000');
        if (!endpoint || !jwtSecret) {
            this.logger.warn('N8N recommender disabled because N8N_RECOMMENDER_URL or N8N_JWT_SECRET is missing');
            return [];
        }
        try {
            const signOptions = {
                algorithm: jwtAlgorithm,
            };
            if (jwtExpiresIn && jwtExpiresIn.trim() !== '') {
                signOptions.expiresIn = parseInt(jwtExpiresIn, 10);
            }
            const jwtToken = jwt.sign({ timestamp: Date.now(), type: 'property-recommendation' }, jwtSecret, signOptions);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwtToken}`,
                },
                body: JSON.stringify(property),
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!response.ok) {
                this.logger.warn(`N8N recommender returned ${response.status} ${response.statusText}`);
                return [];
            }
            const payload = (await response.json());
            const candidates = this.extractCandidates(payload);
            if (!Array.isArray(candidates)) {
                return [];
            }
            return candidates
                .map((candidate) => ({
                client_id: String(candidate?.client_id ?? ''),
                name: String(candidate?.name ?? '').trim(),
                interest_level: this.normalizeLevel(candidate?.interest_level),
                reason: String(candidate?.reason ?? '').trim(),
                score: candidate?.score !== undefined &&
                    !Number.isNaN(Number(candidate.score))
                    ? Number(candidate.score)
                    : undefined,
            }))
                .filter((candidate) => candidate.client_id && candidate.name && candidate.reason);
        }
        catch (error) {
            this.logger.error(`Error calling N8N recommender: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    normalizeLevel(level) {
        const raw = typeof level === 'string' ? level.toUpperCase() : '';
        if (raw === 'ALTO')
            return 'ALTO';
        if (raw === 'BAJO')
            return 'BAJO';
        return 'MEDIO';
    }
    extractCandidates(payload) {
        if (Array.isArray(payload?.candidates)) {
            return payload.candidates;
        }
        if (typeof payload?.output === 'string') {
            try {
                const parsed = JSON.parse(payload.output);
                if (Array.isArray(parsed?.candidates)) {
                    return parsed.candidates;
                }
            }
            catch {
                return undefined;
            }
        }
        if (payload?.output &&
            typeof payload.output === 'object' &&
            Array.isArray(payload.output.candidates)) {
            return payload.output.candidates;
        }
        return undefined;
    }
};
exports.PropertyRecommendationService = PropertyRecommendationService;
exports.PropertyRecommendationService = PropertyRecommendationService = PropertyRecommendationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PropertyRecommendationService);
//# sourceMappingURL=property-recommendation.service.js.map