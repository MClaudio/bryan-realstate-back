import { NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
jest.mock('../files/files.service', () => ({ FilesService: class {} }));

import {
  PropertyProposalService,
  proposalPropertySelect,
} from './property-proposal.service';

const makeImage = () =>
  sharp({
    create: { width: 300, height: 200, channels: 3, background: '#88aacc' },
  })
    .png()
    .toBuffer();

const baseProperty = {
  code: 'P-001',
  address: 'Av. Principal 123',
  referenceSector: 'Challuabamba',
  propertyType: 'Casa_y_terreno',
  constructionArea: 180,
  landArea: 600,
  constructionYears: 5,
  zone: 'Urbanizacion',
  topography: 'Plano',
  cityTime: 15,
  basicServices: ['Agua potable', 'Luz eléctrica'],
  features: 'Interna',
  publicShortDescription: 'Hermosa casa familiar.',
  publicLongDescription: 'Descripción larga para el cliente.',
  price: 150000,
  city: { name: 'Cuenca' },
  advisor: {
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
    phone: '0999999999',
  },
  files: [
    { file: { id: 'img-1', path: '/uploads/a.png' } },
    { file: { id: 'img-2', path: '/uploads/broken.png' } },
    { file: { id: 'img-3', path: '/uploads/c.png' } },
  ],
};

describe('PropertyProposalService', () => {
  const prisma = {
    property: { findFirst: jest.fn() },
    configuration: { findFirst: jest.fn() },
  };
  const filesService = { getFileBuffer: jest.fn() };
  const service = new PropertyProposalService(
    prisma as any,
    filesService as any,
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    const img = await makeImage();
    filesService.getFileBuffer.mockImplementation((f: { id: string }) =>
      Promise.resolve(f.id === 'img-2' ? Buffer.from('not an image') : img),
    );
    prisma.configuration.findFirst.mockResolvedValue({
      companyName: 'Inmobiliaria Demo',
      phone: '072000000',
      email: 'info@demo.com',
      logo: null,
    });
  });

  it('only loads client-safe fields', () => {
    const keys = Object.keys(proposalPropertySelect);
    for (const hidden of [
      'minPrice',
      'maxPrice',
      'salePrice',
      'commission',
      'owner',
      'status',
      'observations',
      'locationUrl',
      'latitude',
      'longitude',
      'facebookUrl',
      'tiktokUrl',
      'instagramUrl',
      'youtubeUrl',
    ]) {
      expect(keys).not.toContain(hidden);
    }
    expect(proposalPropertySelect.files.where).toEqual({ fileType: 'image' });
  });

  it('generates a PDF, skipping images that cannot be decoded', async () => {
    prisma.property.findFirst.mockResolvedValue(baseProperty);
    const { buffer, fileName } = await service.generate('id-1');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(fileName).toBe('Propuesta-P-001.pdf');
    expect(prisma.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: proposalPropertySelect }),
    );
    expect(filesService.getFileBuffer).toHaveBeenCalledTimes(3);
  });

  it('works without images, logo or configuration', async () => {
    prisma.property.findFirst.mockResolvedValue({
      ...baseProperty,
      files: [],
      advisor: null,
    });
    prisma.configuration.findFirst.mockResolvedValue(null);
    const { buffer } = await service.generate('id-1');
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('throws 404 when the property does not exist', async () => {
    prisma.property.findFirst.mockResolvedValue(null);
    await expect(service.generate('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
