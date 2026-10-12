import { Injectable, NotFoundException, BadRequestException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus, FileType, Prisma } from '@prisma/client';
import { RecommendationQueueService } from './recommendation-queue.service';
import { FilesService } from '../files/files.service';
import { propertyInclude } from './property-include';
import { RecommendationRunnerService } from './recommendation-runner.service';
import { newSaleProcessCreate } from '../sale-processes/sale-process.rules';
import { PropertyDescriptionAiService } from '../ai/property-description-ai.service';
import { GeneratePropertyDescriptionsDto } from './dto/generate-property-descriptions.dto';

const dmmfModels: Array<{ name: string; fields: Array<{ name: string }> }> =
  (Prisma as any).dmmf?.datamodel?.models ?? [];
const propertyModelFields = new Set(
  dmmfModels.find((m) => m.name === 'Property')?.fields.map((f) => f.name) ?? [],
);

function omitUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly recommendationQueueService: RecommendationQueueService,
    private readonly recommendationRunner: RecommendationRunnerService,
    private readonly filesService: FilesService,
    private readonly propertyDescriptionAi: PropertyDescriptionAiService,
  ) { }

  /**
   * Solo se encola la recomendación IA si la propiedad está en Nuevo y cambiaron los datos
   * que usa la IA (fotos, redes, precio mínimo, comisión, etc. no cuentan).
   */
  private shouldQueueRecommendation(property: Parameters<RecommendationRunnerService['computeHash']>[0] & {
    status: PropertyStatus;
    recommendationHash: string | null;
  }): boolean {
    if (property.status !== PropertyStatus.Nuevo) return false;
    return this.recommendationRunner.computeHash(property) !== property.recommendationHash;
  }

  /** Genera con IA las descripciones públicas a partir de los datos del formulario (no guarda). */
  async generatePublicDescriptions(dto: GeneratePropertyDescriptionsDto) {
    const city = dto.cityId
      ? await this.prisma.city.findUnique({ where: { id: dto.cityId }, select: { name: true } })
      : null;

    const { descriptions, error } = await this.propertyDescriptionAi.generate({
      ...dto,
      cityName: city?.name ?? null,
    });

    if (!descriptions) {
      throw new ServiceUnavailableException(error ?? 'No se pudieron generar las descripciones con IA.');
    }

    return {
      publicShortDescription: descriptions.shortDescription,
      publicLongDescription: descriptions.longDescription,
    };
  }

  /**
   * Al guardar, si la propiedad no tiene descripciones públicas, se generan en segundo plano
   * para no demorar el guardado. No sobreescribe descripciones escritas mientras tanto.
   */
  private scheduleAutoDescriptions(propertyId: string) {
    if (!this.propertyDescriptionAi.shouldAutoGenerateOnSave()) return;

    void (async () => {
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, deletedAt: null },
        include: { city: { select: { name: true } } },
      });
      if (!property || property.publicShortDescription || property.publicLongDescription) return;

      const { descriptions, error } = await this.propertyDescriptionAi.generate({
        ...property,
        cityName: property.city?.name ?? null,
      });
      if (!descriptions) {
        this.logger.warn(`Descripciones automáticas no generadas para ${propertyId}: ${error}`);
        return;
      }

      const { count } = await this.prisma.property.updateMany({
        where: { id: propertyId, publicShortDescription: null, publicLongDescription: null },
        data: {
          publicShortDescription: descriptions.shortDescription,
          publicLongDescription: descriptions.longDescription,
        },
      });
      if (count > 0) this.logger.log(`Descripciones públicas generadas con IA para la propiedad ${propertyId}`);
    })().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error generando descripciones automáticas para ${propertyId}: ${message}`);
    });
  }

  private async enrichPropertiesFiles(properties: any[]): Promise<any[]> {
    if (!Array.isArray(properties) || properties.length === 0) return properties;
    const out: any[] = [];
    for (const prop of properties) {
      if (!prop) { out.push(prop); continue; }
      const files = prop.files;
      if (Array.isArray(files) && files.length > 0) {
        const enrichedFiles: any[] = [];
        for (const pf of files) {
          if (pf && pf.file) {
            const ef = await this.filesService.enrichFile(pf.file);
            enrichedFiles.push({ ...pf, file: ef });
          } else {
            enrichedFiles.push(pf);
          }
        }
        out.push({ ...prop, files: enrichedFiles });
      } else {
        out.push(prop);
      }
    }
    return out;
  }

  private async enrichPropertyFiles(prop: any): Promise<any> {
    const [enriched] = await this.enrichPropertiesFiles([prop]);
    return enriched;
  }

  async getCurrentSequence() {
    // Counts soft-deleted properties too, so new codes never reuse an old one.
    const currentSequence = await this.prisma.property.count();
    return { currentSequence };
  }

  async findCities() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async create(createPropertyDto: CreatePropertyDto, userId: string) {
    const {
      fileIds,
      documentFileIds,
      advisorId,
      negotiationClientId,
      cityId,
      ...propertyData
    } = createPropertyDto as CreatePropertyDto & { negotiationClientId?: string };

    // Validate file IDs if provided
    if (fileIds && fileIds.length > 0) {
      const validFileIds = fileIds.filter((id: string) => id && typeof id === 'string' && id.length === 36);
      if (validFileIds.length !== fileIds.length) {
        throw new BadRequestException('Invalid file IDs format');
      }
    }

    if (documentFileIds && documentFileIds.length > 0) {
      const validDocumentFileIds = documentFileIds.filter((id: string) => id && typeof id === 'string' && id.length === 36);
      if (validDocumentFileIds.length !== documentFileIds.length) {
        throw new BadRequestException('Invalid document file IDs format');
      }
    }

    // Prepare create data, handling advisor relationship
    const createData: any = {
      ...propertyData,
      code: typeof propertyData.code === 'string' ? propertyData.code.trim() : '',
    };
    if (cityId) {
      createData.city = { connect: { id: cityId } };
    }
    if (advisorId) {
      createData.advisor = { connect: { id: advisorId } };
    }
    if (negotiationClientId) {
      createData.negotiationClient = { connect: { id: negotiationClientId } };
    }
    if (createData.isActive === undefined) {
      createData.isActive = true;
    }
    if (!propertyModelFields.has('isFeatured')) {
      delete createData.isFeatured;
    }
    if (!propertyModelFields.has('isActive')) {
      delete createData.isActive;
    }

    const property = await this.prisma.property.create({
      data: {
        ...omitUndefined(createData),
        // Every new property starts with its sale process and all stages.
        saleProcess: { create: newSaleProcessCreate },
        files: {
          create: [
            ...(fileIds ? fileIds.map((fid: string, index: number) => ({
              file: { connect: { id: fid } },
              fileType: FileType.image,
              sortOrder: index,
            })) : []),
            ...(documentFileIds ? documentFileIds.map((fid: string, index: number) => ({
              file: { connect: { id: fid } },
              fileType: FileType.document,
              sortOrder: index,
            })) : [])
          ]
        }
      },
      include: propertyInclude,
    });

    let recommendationJobId: string = "";
    let recommendationQueued = false;
    if (this.shouldQueueRecommendation(property)) {
      recommendationJobId = await this.recommendationQueueService.enqueueRecommendation({
        propertyId: property.id,
        userId,
        trigger: 'create',
      });
      recommendationQueued = true;
    }

    this.scheduleAutoDescriptions(property.id);

    const enriched = await this.enrichPropertyFiles(property);
    return {
      ...enriched,
      recommendationQueued,
      recommendationJobId,
      recommendedCandidates: [],
    };
  }

  async findAll() {
    const raw = await this.prisma.property.findMany({
      where: { deletedAt: null },
      include: propertyInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichPropertiesFiles(raw);
  }

  async findAllPublic() {
    const raw = await this.prisma.property.findMany({
      where: { isPublic: true, deletedAt: null },
      include: propertyInclude,
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichPropertiesFiles(raw);
  }

  async findFeatured() {
    const raw = await this.prisma.property.findMany({
      where: {
        isPublic: true,
        isFeatured: true,
        deletedAt: null,
      } as Prisma.PropertyWhereInput,
      include: propertyInclude,
      orderBy: { createdAt: 'desc' },
      take: 6
    });
    return this.enrichPropertiesFiles(raw);
  }

  async findOnePublic(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, isPublic: true, deletedAt: null },
      include: propertyInclude,
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found or not public`);
    }

    return this.enrichPropertyFiles(property);
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: propertyInclude,
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return this.enrichPropertyFiles(property);
  }

  async recommendForProperty(id: string, options?: { persist?: boolean; enqueue?: boolean; userId?: string }) {
    const persist = options?.persist ?? true;
    const enqueue = options?.enqueue ?? false;
    const userId = options?.userId ?? '';

    if (enqueue) {
      await this.findOne(id);
      const { jobId, alreadyRunning } =
        await this.recommendationQueueService.enqueueManualRecommendation(id, userId);
      return {
        propertyId: id,
        recommendationQueued: !alreadyRunning,
        recommendationAlreadyRunning: alreadyRunning,
        recommendationJobId: jobId,
        recommendedCandidates: [],
      };
    }

    const result = await this.recommendationRunner.run(id, { trigger: 'manual', persist });
    return {
      propertyId: id,
      recommendationQueued: false,
      status: result.status,
      recommendedCandidates: result.candidates,
      reconcile: result.summary ? { summary: result.summary } : null,
      error: result.error,
    };
  }

  lastRecommendationInfo(id: string) {
    return this.recommendationRunner.lastRecommendationInfo(id);
  }

  async restoreLastRecommendation(id: string) {
    const result = await this.recommendationRunner.restoreLast(id);
    return {
      propertyId: id,
      status: result.status,
      recommendedCandidates: result.candidates,
      reconcile: result.summary ? { summary: result.summary } : null,
      error: result.error,
    };
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto, userId: string) {
    const property = await this.prisma.property.findFirst({ where: { id, deletedAt: null } });
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);

    const { fileIds, documentFileIds, advisorId, cityId, ...propertyData } = updatePropertyDto;

    // Validate file IDs if provided
    if (fileIds && fileIds.length > 0) {
      const validFileIds = fileIds.filter(id => id && typeof id === 'string' && id.length === 36);
      if (validFileIds.length !== fileIds.length) {
        throw new BadRequestException('Invalid file IDs format');
      }
    }

    if (documentFileIds && documentFileIds.length > 0) {
      const validDocumentFileIds = documentFileIds.filter(id => id && typeof id === 'string' && id.length === 36);
      if (validDocumentFileIds.length !== documentFileIds.length) {
        throw new BadRequestException('Invalid document file IDs format');
      }
    }

    // Prepare update data, handling advisor relationship and files
    const { negotiationClientId, ...restPropertyData } = propertyData as any;
    const updateData: any = { ...restPropertyData };
    if (cityId !== undefined) {
      updateData.city = cityId
        ? { connect: { id: cityId } }
        : { disconnect: true };
    }
    if (advisorId) {
      updateData.advisor = { connect: { id: advisorId } };
    }
    // Handle negotiationClient relation
    if (negotiationClientId !== undefined) {
      updateData.negotiationClient = negotiationClientId
        ? { connect: { id: negotiationClientId } }
        : { disconnect: true };
    }
    if (!propertyModelFields.has('isFeatured')) {
      delete updateData.isFeatured;
    }
    if (!propertyModelFields.has('isActive')) {
      delete updateData.isActive;
    }

    // Handle files update if provided
    if (fileIds !== undefined || documentFileIds !== undefined) {
      // First delete existing relations
      await this.prisma.propertyFile.deleteMany({
        where: { propertyId: id }
      });

      const fileRelations = [
        ...(fileIds ? fileIds.map((fid, index) => ({
          file: { connect: { id: fid } },
          fileType: FileType.image,
          sortOrder: index,
        })) : []),
        ...(documentFileIds ? documentFileIds.map((fid, index) => ({
          file: { connect: { id: fid } },
          fileType: FileType.document,
          sortOrder: index,
        })) : [])
      ];

      if (fileRelations.length) {
        updateData.files = {
          create: fileRelations
        };
      }
    }

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: omitUndefined(updateData),
      include: propertyInclude,
    });

    console.log('Updated property with files:', updatedProperty.files?.length || 0);

    let recommendationJobId: string = "";
    let recommendationQueued = false;
    if (this.shouldQueueRecommendation(updatedProperty)) {
      recommendationJobId = await this.recommendationQueueService.enqueueRecommendation({
        propertyId: id,
        userId,
        trigger: 'update',
      });
      recommendationQueued = true;
    }

    this.scheduleAutoDescriptions(id);

    const enriched = await this.enrichPropertyFiles(updatedProperty);
    return {
      ...enriched,
      recommendationQueued,
      recommendationJobId,
      recommendedCandidates: [],
    };
  }

  // Soft delete: the row, its files, processes, interests and checklist stay in
  // the database; the property is just deactivated and hidden from every query.
  async remove(id: string) {
    const property = await this.prisma.property.findFirst({ where: { id, deletedAt: null } });
    if (!property) throw new NotFoundException(`Property with ID ${id} not found`);

    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async resolveMapsUrl(url: string): Promise<{ latitude: string; longitude: string; resolvedUrl: string }> {
    // Follow all redirects to get the final Google Maps URL
    const fetchFn = global.fetch || require('node-fetch');
    const response = await fetchFn(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const finalUrl = response.url;

    // Try !3d / !4d pattern (place pin)
    const placeMatches = [...finalUrl.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
    if (placeMatches.length > 0) {
      const last = placeMatches[placeMatches.length - 1];
      return { latitude: last[1], longitude: last[2], resolvedUrl: finalUrl };
    }

    // Try @lat,lng pattern (map center / directions)
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { latitude: atMatch[1], longitude: atMatch[2], resolvedUrl: finalUrl };
    }

    // Try /search/lat,lng or /place/lat,lng pattern
    const searchMatch = finalUrl.match(/\/(?:search|place)\/(-?\d+\.\d+)(?:,|%2C|\+|\s)+(-?\d+\.\d+)/i);
    if (searchMatch) {
      return { latitude: searchMatch[1], longitude: searchMatch[2], resolvedUrl: finalUrl };
    }

    // Try q= or ll= param
    const paramPatterns = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const pattern of paramPatterns) {
      const match = finalUrl.match(pattern);
      if (match) return { latitude: match[1], longitude: match[2], resolvedUrl: finalUrl };
    }

    try {
      const text = await response.text();
      let coordsMatch = text.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
      if (!coordsMatch) {
        coordsMatch = text.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      }
      if (coordsMatch) {
        return { latitude: coordsMatch[1], longitude: coordsMatch[2], resolvedUrl: finalUrl };
      }
    } catch (e) {
      console.error("Error fetching map URL content:", e);
    }

    throw new BadRequestException('No se pudieron extraer coordenadas de la URL proporcionada');
  }
}
