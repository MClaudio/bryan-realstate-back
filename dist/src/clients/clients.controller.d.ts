import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
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
    }>;
}
