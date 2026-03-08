import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class ConfigurationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createConfigurationDto: CreateConfigurationDto): Promise<{
        email: string | null;
        phone: string;
        ruc: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        logoId: string | null;
        companyName: string;
        businessName: string;
        facebookProfile: string | null;
        instagramProfile: string | null;
        youtubeProfile: string | null;
        whatsappLink: string | null;
    }>;
    findOne(): Promise<({
        logo: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            originalName: string;
            fileName: string;
            path: string;
            size: number;
            description: string | null;
        } | null;
    } & {
        email: string | null;
        phone: string;
        ruc: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        logoId: string | null;
        companyName: string;
        businessName: string;
        facebookProfile: string | null;
        instagramProfile: string | null;
        youtubeProfile: string | null;
        whatsappLink: string | null;
    }) | null>;
    update(updateConfigurationDto: UpdateConfigurationDto): Promise<{
        email: string | null;
        phone: string;
        ruc: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        logoId: string | null;
        companyName: string;
        businessName: string;
        facebookProfile: string | null;
        instagramProfile: string | null;
        youtubeProfile: string | null;
        whatsappLink: string | null;
    }>;
}
