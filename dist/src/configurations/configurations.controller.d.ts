import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
export declare class ConfigurationsController {
    private readonly configurationsService;
    constructor(configurationsService: ConfigurationsService);
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
    find(): Promise<({
        logo: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            originalName: string;
            fileName: string;
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
