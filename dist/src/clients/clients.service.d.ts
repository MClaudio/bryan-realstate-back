import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SyncContactsService } from '../sync-contacts/sync-contacts.service';
export declare class ClientsService {
    private prisma;
    private syncContactsService;
    constructor(prisma: PrismaService, syncContactsService: SyncContactsService);
    create(createClientDto: CreateClientDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        birthDate: Date | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
    findAll(): Promise<({
        user: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        birthDate: Date | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        birthDate: Date | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
    update(id: string, updateClientDto: UpdateClientDto): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        birthDate: Date | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        birthDate: Date | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
}
