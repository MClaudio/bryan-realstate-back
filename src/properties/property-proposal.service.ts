import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { getFormattedPhoneNumber } from '../utils/phoneFormatter';

/**
 * Only client-safe fields. Internal data (minPrice, commission, owner, status,
 * observations, locationUrl, coordinates, social links, documents) is never
 * loaded, so it can't leak into the proposal.
 */
export const proposalPropertySelect = {
  code: true,
  address: true,
  referenceSector: true,
  propertyType: true,
  constructionArea: true,
  landArea: true,
  constructionYears: true,
  zone: true,
  topography: true,
  cityTime: true,
  basicServices: true,
  features: true,
  publicShortDescription: true,
  publicLongDescription: true,
  price: true,
  city: { select: { name: true } },
  advisor: {
    select: { firstName: true, lastName: true, email: true, phone: true },
  },
  files: {
    where: { fileType: 'image' as const },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: { file: { select: { id: true, path: true } } },
  },
};

const MAX_IMAGES = 24;
const IMAGE_CONCURRENCY = 4;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Casa: 'Casa',
  Terreno: 'Terreno',
  Casa_y_terreno: 'Casa y terreno',
  Departamento: 'Departamento',
  Finca: 'Finca',
  Lote: 'Lote',
};
const ZONE_LABELS: Record<string, string> = {
  Rural: 'Rural',
  Urbano: 'Urbano',
  Urbanizacion: 'Urbanización',
};

const COLORS = {
  text: '#1f2937',
  muted: '#6b7280',
  accent: '#1e3a5f',
  rule: '#d1d5db',
  soft: '#f3f4f6',
  white: '#ffffff',
};

const PAGE_MARGIN = 50;
const FOOTER_SPACE = 30;

export interface ProposalData {
  companyName: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  logo?: Buffer | null;
  code: string;
  title: string;
  subtitle?: string | null;
  price: number;
  shortDescription?: string | null;
  description?: string | null;
  characteristics: { label: string; value: string }[];
  indicators: { label: string; value: string }[];
  services: string[];
  advisor?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  coverImage?: Buffer | null;
  galleryImages: Buffer[];
  issuedAt: Date;
}

const money = (value: number, decimals = 0) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(value);

const area = (value: number) =>
  `${new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(value)} m²`;

const parseServices = (raw: unknown): string[] => {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list)
    ? list.map((s) => String(s).trim()).filter(Boolean)
    : [];
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

@Injectable()
export class PropertyProposalService {
  private readonly logger = new Logger(PropertyProposalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async generate(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      select: proposalPropertySelect,
    });
    if (!property)
      throw new NotFoundException(`Property with ID ${id} not found`);

    const config = await this.prisma.configuration.findFirst({
      select: {
        companyName: true,
        phone: true,
        email: true,
        logo: { select: { id: true, path: true } },
      },
    });

    const imageFiles = property.files.slice(0, MAX_IMAGES).map((pf) => pf.file);
    const [logo, images] = await Promise.all([
      config?.logo ? this.loadLogo(config.logo) : Promise.resolve(null),
      mapLimit(imageFiles, IMAGE_CONCURRENCY, (file) => this.loadPhoto(file)),
    ]);
    const photos = images.filter((b): b is Buffer => !!b);

    const price = Number(property.price);
    const landArea = Number(property.landArea);
    const constructionArea = Number(property.constructionArea);
    const typeLabel =
      PROPERTY_TYPE_LABELS[property.propertyType] ??
      String(property.propertyType);
    const cityName = property.city?.name ?? null;

    const location = [property.address, property.referenceSector, cityName]
      .filter(Boolean)
      .join(', ');
    const characteristics = [
      { label: 'Tipo de propiedad', value: typeLabel },
      { label: 'Ubicación', value: location },
      { label: 'Área de terreno', value: landArea > 0 ? area(landArea) : '' },
      {
        label: 'Área de construcción',
        value: constructionArea > 0 ? area(constructionArea) : '',
      },
      {
        label: 'Años de construcción',
        value:
          Number(property.constructionYears) > 0
            ? String(property.constructionYears)
            : '',
      },
      {
        label: 'Zona',
        value: ZONE_LABELS[property.zone] ?? String(property.zone ?? ''),
      },
      { label: 'Topografía', value: String(property.topography ?? '') },
      {
        label: 'Tiempo a la ciudad',
        value:
          Number(property.cityTime) > 0 ? `${property.cityTime} minutos` : '',
      },
    ].filter((row) => row.value);

    const indicators: { label: string; value: string }[] = [];
    if (price > 0 && landArea > 0)
      indicators.push({
        label: 'Precio por m² de terreno',
        value: money(price / landArea, 2),
      });
    if (price > 0 && constructionArea > 0) {
      indicators.push({
        label: 'Precio por m² de construcción',
        value: money(price / constructionArea, 2),
      });
    }
    const freeLand = landArea - constructionArea;
    if (constructionArea > 0 && freeLand > 0) {
      indicators.push({
        label: 'Área libre de terreno',
        value: area(freeLand),
      });
    }

    const buffer = await buildProposalPdf({
      companyName: config?.companyName ?? '',
      companyPhone: config?.phone,
      companyEmail: config?.email,
      logo,
      code: property.code,
      title: cityName ? `${typeLabel} en ${cityName}` : typeLabel,
      subtitle: property.referenceSector
        ? `Sector ${property.referenceSector}`
        : property.address,
      price,
      shortDescription: property.publicShortDescription,
      description: property.publicLongDescription || property.features,
      characteristics,
      indicators,
      services: parseServices(property.basicServices),
      advisor: property.advisor
        ? {
            name: `${property.advisor.firstName} ${property.advisor.lastName}`.trim(),
            phone: property.advisor.phone
              ? getFormattedPhoneNumber(property.advisor.phone)
              : null,
            email: property.advisor.email,
          }
        : null,
      coverImage: photos[0] ?? null,
      galleryImages: photos.slice(1),
      issuedAt: new Date(),
    });

    const safeCode = String(property.code).replace(/[^\w.-]+/g, '_');
    return { buffer, fileName: `Propuesta-${safeCode}.pdf` };
  }

  private async loadPhoto(file: {
    id: string;
    path: string;
  }): Promise<Buffer | null> {
    const raw = await this.filesService.getFileBuffer(file);
    if (!raw) return null;
    try {
      return await sharp(raw)
        .rotate()
        .resize(1500, 1000, { fit: 'cover' })
        .jpeg({ quality: 78 })
        .toBuffer();
    } catch (e) {
      this.logger.warn(
        `[proposal] image ${file.id} skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private async loadLogo(file: {
    id: string;
    path: string;
  }): Promise<Buffer | null> {
    const raw = await this.filesService.getFileBuffer(file);
    if (!raw) return null;
    try {
      return await sharp(raw)
        .resize({ height: 200, withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch (e) {
      this.logger.warn(
        `[proposal] logo ${file.id} skipped: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }
}

/** Renders the client-facing proposal. Pure: everything it prints comes from `data`. */
export function buildProposalPdf(
  data: ProposalData,
  options: { compress?: boolean } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
      compress: options.compress ?? true,
      info: {
        Title: `Propuesta ${data.code}`,
        Subject: data.title,
        ...(data.companyName ? { Author: data.companyName } : {}),
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = PAGE_MARGIN;
    const width = doc.page.width - PAGE_MARGIN * 2;
    const bottom = () => doc.page.height - PAGE_MARGIN - FOOTER_SPACE;
    const ensureSpace = (needed: number) => {
      if (doc.y + needed > bottom()) doc.addPage();
    };
    const heading = (text: string) => {
      ensureSpace(60);
      doc.moveDown(0.6);
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(COLORS.accent)
        .text(text, left, doc.y, { width });
      const y = doc.y + 4;
      doc
        .moveTo(left, y)
        .lineTo(left + width, y)
        .lineWidth(0.7)
        .strokeColor(COLORS.rule)
        .stroke();
      doc.y = y + 10;
    };
    const paragraph = (text: string, size = 10.5) => {
      doc
        .font('Helvetica')
        .fontSize(size)
        .fillColor(COLORS.text)
        .text(text.trim(), left, doc.y, {
          width,
          align: 'justify',
          lineGap: 3,
        });
    };

    // ── Cover ────────────────────────────────────────────────────────────────
    let headerBottom = PAGE_MARGIN;
    if (data.logo) {
      try {
        doc.image(data.logo, left, PAGE_MARGIN, { fit: [140, 50] });
        headerBottom = PAGE_MARGIN + 50;
      } catch {
        /* unsupported logo: skip */
      }
    }
    if (data.companyName) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.text)
        .text(data.companyName, left, PAGE_MARGIN + 8, {
          width,
          align: 'right',
        });
      headerBottom = Math.max(headerBottom, doc.y);
    }
    const contactLine = [data.companyPhone, data.companyEmail]
      .filter(Boolean)
      .join('   |   ');
    if (contactLine) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(contactLine, left, doc.y + 2, { width, align: 'right' });
      headerBottom = Math.max(headerBottom, doc.y);
    }
    const ruleY = headerBottom + 12;
    doc
      .moveTo(left, ruleY)
      .lineTo(left + width, ruleY)
      .lineWidth(0.7)
      .strokeColor(COLORS.rule)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(COLORS.accent)
      .text('PROPUESTA', left, ruleY + 22, {
        width,
        characterSpacing: 2,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(COLORS.text)
      .text(data.title, left, doc.y + 6, { width });
    if (data.subtitle) {
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(COLORS.muted)
        .text(data.subtitle, left, doc.y + 2, { width });
    }

    let y = doc.y + 16;
    if (data.coverImage) {
      const imgHeight = Math.round(width / 1.5);
      doc.image(data.coverImage, left, y, { width, height: imgHeight });
      y += imgHeight;
    }

    // Price band
    const bandHeight = 74;
    doc.rect(left, y, width, bandHeight).fill(COLORS.accent);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.white)
      .text('PRECIO', left + 20, y + 16, { characterSpacing: 1.5 });
    doc
      .font('Helvetica-Bold')
      .fontSize(26)
      .fillColor(COLORS.white)
      .text(money(data.price), left + 20, y + 30);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.white)
      .text(`Código ${data.code}`, left, y + 22, {
        width: width - 20,
        align: 'right',
      })
      .text(
        `Emitida el ${data.issuedAt.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        left,
        doc.y + 4,
        { width: width - 20, align: 'right' },
      );
    doc.y = y + bandHeight + 18;

    if (data.shortDescription) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(11.5)
        .fillColor(COLORS.text)
        .text(data.shortDescription.trim(), left, doc.y, {
          width,
          align: 'justify',
          lineGap: 3,
        });
    }

    // ── Details ──────────────────────────────────────────────────────────────
    doc.addPage();
    doc.y = PAGE_MARGIN;

    if (data.characteristics.length) {
      heading('Características principales');
      const labelWidth = 170;
      const valueWidth = width - labelWidth - 24;
      data.characteristics.forEach((row, i) => {
        doc.font('Helvetica-Bold').fontSize(10);
        const h =
          Math.max(doc.heightOfString(row.value, { width: valueWidth }), 12) +
          12;
        ensureSpace(h);
        const rowY = doc.y;
        if (i % 2 === 0) doc.rect(left, rowY, width, h).fill(COLORS.soft);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COLORS.muted)
          .text(row.label, left + 12, rowY + 6, { width: labelWidth });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(row.value, left + 12 + labelWidth, rowY + 6, {
            width: valueWidth,
          });
        doc.y = rowY + h;
      });
    }

    if (data.indicators.length) {
      heading('Indicadores de valor');
      const gap = 12;
      const boxWidth =
        (width - gap * (data.indicators.length - 1)) / data.indicators.length;
      const boxHeight = 58;
      ensureSpace(boxHeight);
      const boxY = doc.y;
      data.indicators.forEach((ind, i) => {
        const x = left + i * (boxWidth + gap);
        doc.rect(x, boxY, boxWidth, boxHeight).fill(COLORS.soft);
        doc.rect(x, boxY, 3, boxHeight).fill(COLORS.accent);
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(COLORS.muted)
          .text(ind.label, x + 14, boxY + 12, { width: boxWidth - 24 });
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(COLORS.text)
          .text(ind.value, x + 14, boxY + 30, { width: boxWidth - 24 });
      });
      doc.y = boxY + boxHeight + 4;
    }

    if (data.services.length) {
      heading('Servicios básicos');
      const colWidth = width / 2;
      const rows = Math.ceil(data.services.length / 2);
      for (let r = 0; r < rows; r++) {
        ensureSpace(18);
        const rowY = doc.y;
        [data.services[r * 2], data.services[r * 2 + 1]].forEach(
          (service, c) => {
            if (!service) return;
            doc
              .font('Helvetica')
              .fontSize(10.5)
              .fillColor(COLORS.text)
              .text(`•  ${service}`, left + c * colWidth, rowY, {
                width: colWidth - 10,
              });
          },
        );
        doc.y = rowY + 18;
      }
    }

    if (data.description) {
      heading('Descripción');
      paragraph(data.description);
    }

    // ── Gallery ──────────────────────────────────────────────────────────────
    if (data.galleryImages.length) {
      const gap = 14;
      const cellWidth = (width - gap) / 2;
      const cellHeight = Math.round(cellWidth / 1.5);
      ensureSpace(cellHeight + 70);
      heading('Galería');
      let col = 0;
      data.galleryImages.forEach((img) => {
        if (col === 0 && doc.y + cellHeight > bottom()) {
          doc.addPage();
          doc.y = PAGE_MARGIN;
        }
        const rowY = doc.y;
        doc.image(img, left + col * (cellWidth + gap), rowY, {
          width: cellWidth,
          height: cellHeight,
        });
        col = (col + 1) % 2;
        doc.y = col === 0 ? rowY + cellHeight + gap : rowY;
      });
      if (col === 1) doc.y += cellHeight + gap;
    }

    // ── Contact ──────────────────────────────────────────────────────────────
    const companyLines = [
      data.companyName,
      data.companyPhone,
      data.companyEmail,
    ].filter(Boolean) as string[];
    const advisorLines = data.advisor
      ? ([data.advisor.name, data.advisor.phone, data.advisor.email].filter(
          Boolean,
        ) as string[])
      : [];
    if (advisorLines.length || companyLines.length) {
      ensureSpace(140);
      heading('Contacto');
      const colWidth = width / 2;
      const startY = doc.y;
      let maxY = startY;
      [
        { title: 'Asesor', lines: advisorLines },
        { title: 'Empresa', lines: companyLines },
      ]
        .filter((block) => block.lines.length)
        .forEach((block, c) => {
          const x = left + c * colWidth;
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text(block.title.toUpperCase(), x, startY, {
              width: colWidth - 10,
              characterSpacing: 1.2,
            });
          block.lines.forEach((line, i) => {
            doc
              .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(10.5)
              .fillColor(COLORS.text)
              .text(line, x, doc.y + 3, { width: colWidth - 10 });
          });
          maxY = Math.max(maxY, doc.y);
        });
      doc.y = maxY;
    }

    ensureSpace(30);
    doc
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(
        'Precio sujeto a disponibilidad y a cambios sin previo aviso. Información referencial.',
        left,
        doc.y + 20,
        { width },
      );

    // ── Footer on every page ─────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - PAGE_MARGIN + 10;
      doc
        .moveTo(left, footerY - 8)
        .lineTo(left + width, footerY - 8)
        .lineWidth(0.5)
        .strokeColor(COLORS.rule)
        .stroke();
      const leftText = [data.companyName, `Propuesta ${data.code}`]
        .filter(Boolean)
        .join('  ·  ');
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(leftText, left, footerY, { width: width / 2, lineBreak: false })
        .text(
          `Página ${i - range.start + 1} de ${range.count}`,
          left + width / 2,
          footerY,
          {
            width: width / 2,
            align: 'right',
            lineBreak: false,
          },
        );
      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
  });
}
