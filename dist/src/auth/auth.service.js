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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const email_service_1 = require("../email/email.service");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    usersService;
    jwtService;
    emailService;
    prisma;
    constructor(usersService, jwtService, emailService, prisma) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.prisma = prisma;
    }
    async validateUser(username, pass) {
        const user = await this.usersService.findByUsername(username);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.username, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (user.isActive === false) {
            throw new common_1.UnauthorizedException('Tu cuenta está desactivada. Contacta al administrador.');
        }
        const payload = {
            username: user.username,
            sub: user.id,
            type: user.type
        };
        return {
            access_token: this.jwtService.sign(payload),
            user,
            first_login: !user.hasChangedDefaultPassword
        };
    }
    async forgotPassword(forgotPasswordDto) {
        const { email } = forgotPasswordDto;
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000);
        const hashedToken = await bcrypt.hash(resetToken, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: resetTokenExpiry,
            },
        });
        try {
            await this.emailService.sendResetPasswordEmail(email, resetToken, `${user.firstName} ${user.lastName}`);
        }
        catch (error) {
            console.error('Error sending reset password email:', error);
            throw new common_1.BadRequestException('No se pudo enviar el correo de recuperación');
        }
        return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
    }
    async resetPassword(resetPasswordDto) {
        const { token, newPassword } = resetPasswordDto;
        const users = await this.prisma.user.findMany({
            where: {
                resetPasswordExpires: {
                    gte: new Date(),
                },
            },
            select: {
                id: true,
                resetPasswordToken: true,
                resetPasswordExpires: true,
            },
        });
        let matchedUser = null;
        for (const user of users) {
            if (user.resetPasswordToken && await bcrypt.compare(token, user.resetPasswordToken)) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) {
            throw new common_1.BadRequestException('Token inválido o expirado');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: matchedUser.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        return { message: 'Contraseña actualizada exitosamente' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        email_service_1.EmailService,
        prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map