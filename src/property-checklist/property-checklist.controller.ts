import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../profiles/permissions.guard';
import { RequirePermission } from '../profiles/require-permission.decorator';
import { PropertyChecklistService } from './property-checklist.service';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('properties/:propertyId/checklist')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertyChecklistController {
  constructor(private readonly checklistService: PropertyChecklistService) {}

  @Get()
  @RequirePermission('properties', 'view', { orActions: ['edit'] })
  findByProperty(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.checklistService.findByProperty(propertyId);
  }

  @Patch()
  @RequirePermission('properties', 'edit')
  updateItem(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.checklistService.updateItem(propertyId, dto, req.user.userId);
  }
}
