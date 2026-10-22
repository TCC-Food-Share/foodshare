import { ApiProperty } from '@nestjs/swagger';

export class RunJobResponseDto {
  @ApiProperty({ description: 'Nome da tarefa executada.', example: 'order-expiration' })
  name!: string;

  @ApiProperty({ description: 'Quantidade de registros afetados pela execução.', example: 3 })
  affected!: number;
}
