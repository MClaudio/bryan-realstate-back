import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private transporter;
    private readonly logger;
    private readonly fromEmail;
    private readonly fromName;
    constructor(configService: ConfigService);
    sendResetPasswordEmail(to: string, resetToken: string, userName: string): Promise<void>;
    private sendEmail;
    private getResetPasswordTemplate;
}
