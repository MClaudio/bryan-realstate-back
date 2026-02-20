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
    }>;
}
