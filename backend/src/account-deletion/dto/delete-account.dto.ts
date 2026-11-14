import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ example: 'senha-atual-123', description: 'Senha atual da conta (DT45)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
