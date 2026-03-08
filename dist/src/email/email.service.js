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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    configService;
    transporter;
    logger = new common_1.Logger(EmailService_1.name);
    fromEmail;
    fromName;
    constructor(configService) {
        this.configService = configService;
        const host = this.configService.get('MAIL_HOST');
        const port = parseInt(this.configService.get('MAIL_PORT') || '587', 10);
        const user = this.configService.get('MAIL_USER');
        const pass = this.configService.get('MAIL_PASSWORD');
        this.fromEmail = this.configService.get('MAIL_FROM') || user || 'noreply@bryanrealstate.com';
        this.fromName = this.configService.get('MAIL_FROM_NAME') || 'Bryan RealState';
        if (!host || !port || !user || !pass) {
            this.logger.warn('No SMTP configuration found. Emails will be logged to console.');
            this.transporter = null;
        }
        else {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: {
                    user,
                    pass,
                },
            });
            this.transporter.verify((error) => {
                if (error) {
                    this.logger.error('SMTP connection failed:', error);
                }
                else {
                    this.logger.log('SMTP connection established successfully');
                }
            });
        }
    }
    async sendResetPasswordEmail(to, resetToken, userName) {
        const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        const subject = 'Recuperación de Contraseña - Bryan RealState';
        const html = this.getResetPasswordTemplate(userName, resetUrl);
        await this.sendEmail(to, subject, html);
    }
    async sendEmail(to, subject, html) {
        if (!this.transporter) {
            this.logger.log('========== EMAIL (Console Mode) ==========');
            this.logger.log(`To: ${to}`);
            this.logger.log(`Subject: ${subject}`);
            this.logger.log('HTML Preview:');
            this.logger.log(html);
            this.logger.log('==========================================');
            return;
        }
        try {
            const info = await this.transporter.sendMail({
                from: `"${this.fromName}" <${this.fromEmail}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}:`, error);
            throw new Error('No se pudo enviar el correo electrónico');
        }
    }
    getResetPasswordTemplate(userName, resetUrl) {
        return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Bryan RealState</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">Recuperación de Contraseña</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px;">Hola ${userName},</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si fuiste tú quien realizó esta solicitud, haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                  Restablecer Contraseña
                </a>
              </div>
              
              <p style="margin: 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                O copia y pega el siguiente enlace en tu navegador:
              </p>
              <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; color: #2563eb; font-size: 13px; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <div style="margin: 30px 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Bryan RealState. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map