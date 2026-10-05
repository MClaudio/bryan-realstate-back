import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { NormalizeClientDto } from './dto/normalize-client.dto';
import { ContactAiParserService } from '../ai/contact-ai-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SyncContactsService } from '../sync-contacts/sync-contacts.service';
import { formatPhoneNumber, validatePhoneNumber } from '../utils/phoneFormatter';
import { normalizeNamePair } from '../sync-contacts/utils/contact-normalization';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private syncContactsService: SyncContactsService,
    private contactAiParser: ContactAiParserService,
  ) {}

  /** Devuelve una sugerencia normalizada con IA de los datos del formulario. No guarda nada. */
  async normalize(dto: NormalizeClientDto) {
    const { contact, error } = await this.contactAiParser.parseContactDetailed({
      givenName: dto.firstName ?? null,
      familyName: dto.lastName ?? null,
      phones: dto.phone ? [dto.phone] : [],
      emails: dto.email ? [dto.email] : [],
      birthday: dto.birthDate ?? null,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
      interestDescription: dto.interestDescription ?? null,
    });

    if (!contact) {
      throw new ServiceUnavailableException(error ?? 'No se pudo normalizar con IA. Intenta nuevamente.');
    }

    return contact;
  }

  async create(createClientDto: CreateClientDto) {
    if (createClientDto.email) {
      const existingClient = await this.prisma.client.findFirst({
        where: { email: createClientDto.email },
      });
      if (existingClient) {
        throw new ConflictException(`Client with email ${createClientDto.email} already exists`);
      }
    }

    // Validar y formatear teléfono
    if (!createClientDto.phone || !createClientDto.phone.trim()) {
      throw new BadRequestException('El teléfono es requerido');
    }

    if (!validatePhoneNumber(createClientDto.phone)) {
      throw new BadRequestException(
        'El número telefónico es inválido. Debe incluir código de país y tener al menos 7 dígitos (ej: +593978961341 o 0978961341)'
      );
    }

    const { formatted: formattedPhone } = formatPhoneNumber(createClientDto.phone);

    const { password, ...clientData } = createClientDto;
    let passwordHash = undefined;

    if (password) {
      const salt = await bcrypt.genSalt();
      passwordHash = await bcrypt.hash(password, salt);
    }

    const { firstName, lastName } = normalizeNamePair(
      clientData.firstName,
      clientData.lastName,
    );

    const createdClient = await this.prisma.client.create({
      data: {
        ...clientData,
        firstName,
        lastName,
        phone: formattedPhone,
        password: passwordHash,
      },
    });

    await this.syncContactsService.syncClientToGoogle(createdClient);

    return createdClient;
  }

  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      omit: { password: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      // Nunca devolver el hash de la contraseña en la API.
      omit: { password: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    const { password, ...updateData } = updateClientDto;
    const data: any = { ...updateData };

    if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
      const merged = normalizeNamePair(
        updateData.firstName !== undefined ? updateData.firstName : client.firstName,
        updateData.lastName !== undefined ? updateData.lastName : client.lastName,
      );
      data.firstName = merged.firstName;
      data.lastName = merged.lastName;
    }

    // Validar y formatear teléfono si se proporciona
    if (updateData.phone) {
      if (!updateData.phone.trim()) {
        throw new BadRequestException('El teléfono no puede estar vacío');
      }

      if (!validatePhoneNumber(updateData.phone)) {
        throw new BadRequestException(
          'El número telefónico es inválido. Debe incluir código de país y tener al menos 7 dígitos (ej: +593978961341 o 0978961341)'
        );
      }

      const { formatted: formattedPhone } = formatPhoneNumber(updateData.phone);
      data.phone = formattedPhone;
    }

    if (password) {
      const salt = await bcrypt.genSalt();
      data.password = await bcrypt.hash(password, salt);
    }

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data,
    });

    if (updatedClient.googleContactId) {
      await this.syncContactsService.updateClientInGoogle({
        id: updatedClient.id,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        googleContactId: updatedClient.googleContactId,
        interestDescription: updatedClient.interestDescription,
      });
    } else {
      await this.syncContactsService.syncClientToGoogle(updatedClient);
    }

    return updatedClient;
  }

  async remove(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);

    return this.prisma.client.delete({
      where: { id },
    });
  }
}
