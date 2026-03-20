import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class ClientsService {
    private prisma;
    constructor(prisma: PrismaService);
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
