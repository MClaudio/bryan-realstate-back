import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async overview() {
    const [usersCount, clientsCount, propertiesCount, publicPropertiesCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.client.count(),
      this.prisma.property.count(),
      this.prisma.property.count({ where: { isPublic: true } }),
    ])

    const propertiesByStatus = await this.prisma.property.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const priceAgg = await this.prisma.property.aggregate({
      _sum: { price: true, salePrice: true, commission: true },
      _avg: { price: true, salePrice: true },
    })

    const latestProperties = await this.prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        advisor: { select: { id: true, firstName: true, lastName: true } },
        files: { include: { file: true } },
      },
    })

    return {
      counters: {
        users: usersCount,
        clients: clientsCount,
        properties: propertiesCount,
        publicProperties: publicPropertiesCount,
      },
      propertiesByStatus,
      priceAggregates: priceAgg,
      latestProperties,
    }
  }

  async propertyStats() {
    const byType = await this.prisma.property.groupBy({
      by: ['propertyType'],
      _count: { id: true },
    })
    const byZone = await this.prisma.property.groupBy({
      by: ['zone'],
      _count: { id: true },
    })
    const byTopography = await this.prisma.property.groupBy({
      by: ['topography'],
      _count: { id: true },
    })
    const priceAgg = await this.prisma.property.aggregate({
      _min: { price: true, salePrice: true },
      _max: { price: true, salePrice: true },
      _avg: { price: true, salePrice: true },
    })
    return { byType, byZone, byTopography, priceAggregates: priceAgg }
  }

  async fileStats() {
    const byType = await this.prisma.propertyFile.groupBy({
      by: ['fileType'],
      _count: { fileId: true },
    })
    const totalFiles = await this.prisma.file.count()
    return { byType, totalFiles }
  }

  async recent() {
    const [recentUsers, recentClients, recentProperties, recentFiles] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          type: true,
          createdAt: true,
        },
      }),
      this.prisma.client.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      }),
      this.prisma.property.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          address: true,
          price: true,
          salePrice: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.file.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          originalName: true,
          fileName: true,
          size: true,
          createdAt: true,
        },
      }),
    ])
    return { users: recentUsers, clients: recentClients, properties: recentProperties, files: recentFiles }
  }
}
