import { Module } from '@nestjs/common';
import { RecommendationSchedulerService } from './recommendation-scheduler.service';
import { PropertiesModule } from '../properties/properties.module';
import { PropertyInterestsModule } from '../property-interests/property-interests.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PropertiesModule, PropertyInterestsModule, NotificationsModule],
  providers: [RecommendationSchedulerService],
  exports: [RecommendationSchedulerService],
})
export class RecommendationSchedulerModule {}
