import { Controller, Get, UseGuards } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  overview() {
    return this.dashboardService.overview()
  }

  @Get('properties/stats')
  propertyStats() {
    return this.dashboardService.propertyStats()
  }

  @Get('files/stats')
  fileStats() {
    return this.dashboardService.fileStats()
  }

  @Get('recent')
  recent() {
    return this.dashboardService.recent()
  }
}
