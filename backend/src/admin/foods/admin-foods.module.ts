import { Module } from '@nestjs/common';

import { AdminFoodsController } from './admin-foods.controller';
import { AdminFoodsService } from './admin-foods.service';

@Module({
  controllers: [AdminFoodsController],
  providers: [AdminFoodsService],
})
export class AdminFoodsModule {}
