import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        password: string;
        phone: string | null;
        address: string | null;
        ruc: string;
        type: import("@prisma/client").$Enums.UserType;
        isActive: boolean;
        id: string;
        hasChangedDefaultPassword: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        phone: string | null;
        address: string | null;
        ruc: string;
        type: import("@prisma/client").$Enums.UserType;
        isActive: boolean;
        id: string;
        hasChangedDefaultPassword: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        phone: string | null;
        address: string | null;
        ruc: string;
        type: import("@prisma/client").$Enums.UserType;
        isActive: boolean;
        id: string;
        hasChangedDefaultPassword: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        password: string;
        phone: string | null;
        address: string | null;
        ruc: string;
        type: import("@prisma/client").$Enums.UserType;
        isActive: boolean;
        id: string;
        hasChangedDefaultPassword: boolean;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePassword(id: string, dto: ChangePasswordDto, req: any): Promise<{
        username: string;
        id: string;
        hasChangedDefaultPassword: boolean;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        isActive: boolean;
        id: string;
    }>;
}
