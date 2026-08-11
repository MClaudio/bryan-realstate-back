import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SyncContactsService } from '../sync-contacts/sync-contacts.service';
export declare class ClientsService {
    private prisma;
    private syncContactsService;
    constructor(prisma: PrismaService, syncContactsService: SyncContactsService);
    create(createClientDto: CreateClientDto): Promise<{
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        birthDate: Date | null;
        userId: string | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
    }>;
    findAll(): Promise<({
        user: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
    } & {
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        birthDate: Date | null;
        userId: string | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            firstName: string;
            lastName: string;
            id: string;
        } | null;
    } & {
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        birthDate: Date | null;
        userId: string | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
    }>;
    update(id: string, updateClientDto: UpdateClientDto): Promise<{
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        birthDate: Date | null;
        userId: string | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        firstName: string;
        lastName: string;
        email: string | null;
        password: string | null;
        phone: string;
        address: string | null;
        ruc: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        birthDate: Date | null;
        userId: string | null;
        lastLogin: boolean;
        notes: string | null;
        interestDescription: string | null;
        googleContactId: string | null;
        googleSyncedAt: Date | null;
    }>;
}
