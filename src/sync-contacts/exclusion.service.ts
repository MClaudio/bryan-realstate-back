import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleContactSelectionDto } from './dto/google-contact-selection.dto';

export interface ExclusionIndex {
  googleIds: Set<string>;
  candidateIds: Set<string>;
}

@Injectable()
export class ExclusionService {
  constructor(private readonly prisma: PrismaService) {}

  async getExclusionIndex(): Promise<ExclusionIndex> {
    const exclusions = await this.prisma.contactSyncExclusion.findMany({
      select: {
        candidateId: true,
        googleContactId: true,
      },
    });

    const googleIds = new Set<string>();
    const candidateIds = new Set<string>();

    exclusions.forEach((exclusion) => {
      if (exclusion.googleContactId) googleIds.add(exclusion.googleContactId);
      if (exclusion.candidateId) candidateIds.add(exclusion.candidateId);
    });

    return { googleIds, candidateIds };
  }

  isExcluded(
    contact: { googleContactId?: string | null; candidateId?: string | null },
    exclusionIndex: ExclusionIndex,
  ): boolean {
    if (contact.googleContactId && exclusionIndex.googleIds.has(contact.googleContactId)) return true;
    if (contact.candidateId && exclusionIndex.candidateIds.has(contact.candidateId)) return true;

    return false;
  }

  async storeExclusions(contacts: GoogleContactSelectionDto[], reason = 'Manual exclusion') {
    if (contacts.length === 0) {
      return { stored: 0 };
    }

    let stored = 0;

    for (const contact of contacts) {
      const candidateId = contact.candidateId?.trim() || null;
      const googleContactId = contact.googleContactId?.trim() || null;

      if (!googleContactId && !candidateId) {
        continue;
      }

      const existing = await this.prisma.contactSyncExclusion.findFirst({
        where: {
          OR: [
            { googleContactId: googleContactId ?? undefined },
            { candidateId: candidateId ?? undefined },
          ],
        },
      });

      if (existing) {
        await this.prisma.contactSyncExclusion.update({
          where: { id: existing.id },
          data: {
            candidateId,
            googleContactId,
            reason,
          },
        });
      } else {
        await this.prisma.contactSyncExclusion.create({
          data: {
            candidateId,
            googleContactId,
            reason,
          },
        });
      }

      stored += 1;
    }

    return { stored };
  }
}
