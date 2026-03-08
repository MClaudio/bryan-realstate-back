import { PrismaService } from '../prisma/prisma.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
export declare class BlacklistService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createBlacklistDto: CreateBlacklistDto): Promise<{
        firstName: string;
        lastName: string;
        phone: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
    }>;
    findAll(): Promise<{
        firstName: string;
        lastName: string;
        phone: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
    }[]>;
    findOne(id: string): Promise<{
        firstName: string;
        lastName: string;
        phone: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
    }>;
    update(id: string, updateBlacklistDto: UpdateBlacklistDto): Promise<{
        firstName: string;
        lastName: string;
        phone: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
    }>;
    remove(id: string): Promise<{
        firstName: string;
        lastName: string;
        phone: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
    }>;
}
