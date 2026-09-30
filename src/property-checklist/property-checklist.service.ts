import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProcessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { CHECKLIST_ITEMS, isValidItem } from './checklist-items';

const checkedBySelect = {
  select: { id: true, firstName: true, lastName: true },
};

@Injectable()
export class PropertyChecklistService {
  constructor(private prisma: PrismaService) {}

  private async ensureProperty(propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
  }

  async findByProperty(propertyId: string) {
    await this.ensureProperty(propertyId);

    const rows = await this.prisma.propertyChecklistItem.findMany({
      where: { propertyId },
      include: { checkedBy: checkedBySelect },
    });
    const bySideKey = new Map(rows.map((r) => [`${r.side}:${r.itemKey}`, r]));

    const build = (side: ProcessType) =>
      CHECKLIST_ITEMS[side].map((item) => {
        const row = bySideKey.get(`${side}:${item.key}`);
        const checked = row?.checked ?? false;
        return {
          key: item.key,
          label: item.label,
          checked,
          checkedAt: checked ? row!.checkedAt : null,
          checkedBy: checked ? row!.checkedBy : null,
        };
      });

    return {
      Comprador: build(ProcessType.Comprador),
      Vendedor: build(ProcessType.Vendedor),
    };
  }

  async updateItem(
    propertyId: string,
    dto: UpdateChecklistItemDto,
    userId: string,
  ) {
    if (!isValidItem(dto.side, dto.itemKey)) {
      throw new BadRequestException('Ítem de checklist no válido');
    }
    await this.ensureProperty(propertyId);

    const state = dto.checked
      ? { checked: true, checkedAt: new Date(), checkedById: userId }
      : { checked: false, checkedAt: null, checkedById: null };

    const row = await this.prisma.propertyChecklistItem.upsert({
      where: {
        propertyId_side_itemKey: {
          propertyId,
          side: dto.side,
          itemKey: dto.itemKey,
        },
      },
      create: { propertyId, side: dto.side, itemKey: dto.itemKey, ...state },
      update: state,
      include: { checkedBy: checkedBySelect },
    });

    return {
      side: row.side,
      key: row.itemKey,
      checked: row.checked,
      checkedAt: row.checkedAt,
      checkedBy: row.checkedBy,
    };
  }
}
