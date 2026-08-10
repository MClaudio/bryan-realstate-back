import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
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
