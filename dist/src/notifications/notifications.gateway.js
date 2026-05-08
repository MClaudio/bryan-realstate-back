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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const socket_io_1 = require("socket.io");
const jwt = __importStar(require("jsonwebtoken"));
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    configService;
    logger = new common_1.Logger(NotificationsGateway_1.name);
    server;
    constructor(configService) {
        this.configService = configService;
    }
    handleConnection(client) {
        const token = this.extractToken(client);
        if (!token) {
            client.disconnect(true);
            return;
        }
        const secret = this.configService.get('JWT_SECRET');
        if (!secret) {
            this.logger.error('JWT_SECRET is missing for notifications socket auth');
            client.disconnect(true);
            return;
        }
        try {
            const decoded = jwt.verify(token, secret);
            const userId = decoded?.sub;
            if (!userId) {
                client.disconnect(true);
                return;
            }
            client.join(this.roomForUser(userId));
        }
        catch {
            client.disconnect(true);
        }
    }
    emitToUser(userId, event, payload) {
        this.server.to(this.roomForUser(userId)).emit(event, payload);
    }
    roomForUser(userId) {
        return `user:${userId}`;
    }
    extractToken(client) {
        const authToken = client.handshake.auth?.token;
        if (typeof authToken === 'string' && authToken.trim()) {
            return authToken.trim();
        }
        const headerAuth = client.handshake.headers?.authorization;
        if (typeof headerAuth === 'string' && headerAuth.trim()) {
            return headerAuth.replace(/^Bearer\s+/i, '').trim();
        }
        return null;
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], NotificationsGateway.prototype, "handleConnection", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, websockets_1.WebSocketGateway)({
        namespace: '/notifications',
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map