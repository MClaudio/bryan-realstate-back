import { ExecutionContext } from '@nestjs/common';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    private readonly logger;
    handleRequest<TUser = any>(err: any, user: any, info: {
        name?: string;
        message?: string;
    } | undefined, _context: ExecutionContext, _status?: any): TUser;
}
export {};
