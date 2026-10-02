import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: 1,
    description: 'Id do alimento disponível para o qual o pedido é feito',
  })
  @IsInt()
  @IsPositive()
  foodId!: number;

  @ApiProperty({
    example: 2.5,
    description:
      'Quantidade solicitada (aceita fracionário, até 2 casas; não pode exceder o estoque)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;
}
