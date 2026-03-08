import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto/create-blacklist.dto';
import { UpdateBlacklistDto } from './dto/update-blacklist.dto';
export declare class BlacklistController {
    private readonly blacklistService;
    constructor(blacklistService: BlacklistService);
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
