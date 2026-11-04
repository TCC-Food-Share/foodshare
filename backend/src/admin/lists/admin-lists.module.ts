import { Module } from '@nestjs/common';

import { AdminCancellationReasonsController } from './cancellation-reasons/admin-cancellation-reasons.controller';
import { AdminCancellationReasonsService } from './cancellation-reasons/admin-cancellation-reasons.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminFoodItemsController } from './food-items/admin-food-items.controller';
import { AdminFoodItemsService } from './food-items/admin-food-items.service';
import { AdminMeasurementUnitsController } from './measurement-units/admin-measurement-units.controller';
import { AdminMeasurementUnitsService } from './measurement-units/admin-measurement-units.service';
import { AdminProhibitedTermsController } from './prohibited-terms/admin-prohibited-terms.controller';
import { AdminProhibitedTermsService } from './prohibited-terms/admin-prohibited-terms.service';

@Module({
  controllers: [
    AdminCategoriesController,
    AdminFoodItemsController,
    AdminMeasurementUnitsController,
    AdminCancellationReasonsController,
    AdminProhibitedTermsController,
  ],
  providers: [
    AdminCategoriesService,
    AdminFoodItemsService,
    AdminMeasurementUnitsService,
    AdminCancellationReasonsService,
    AdminProhibitedTermsService,
  ],
  exports: [
    AdminCategoriesService,
    AdminFoodItemsService,
    AdminMeasurementUnitsService,
    AdminCancellationReasonsService,
  ],
})
export class AdminListsModule {}
