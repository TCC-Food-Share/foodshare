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
      'Quantidade solicitada, até 2 casas. Fração só se a unidade do alimento aceitar. Deve ' +
      'respeitar o tipo de solicitação do alimento: igual ao estoque em "Somente total", ' +
      'menor que o estoque em "Somente parcial" (salvo a sobra que já não permite pedido ' +
      'parcial) e até o estoque em "Total ou parcial"',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity!: number;
}
