import { Module } from '@nestjs/common';

import { FoodsModule } from '../foods/foods.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [FoodsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
