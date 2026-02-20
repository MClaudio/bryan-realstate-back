import { UserType } from '@prisma/client';
export declare class CreateUserDto {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    ruc: string;
    type: UserType;
}
