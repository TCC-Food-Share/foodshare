import { ApiProperty } from '@nestjs/swagger';

class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'João Souza' })
  name!: string;

  @ApiProperty({ example: 'joao@example.com' })
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  personalPhone!: string;

  @ApiProperty({ example: 'https://cdn.example.com/logo.png', nullable: true })
  image!: string | null;
}

class AddressResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '01310-100' })
  postalCode!: string;

  @ApiProperty({ example: 'Avenida Paulista' })
  street!: string;

  @ApiProperty({ example: '1000' })
  number!: string;

  @ApiProperty({ example: 'Suite 42', nullable: true })
  complement!: string | null;

  @ApiProperty({ example: 'São Paulo' })
  city!: string;

  @ApiProperty({ example: 'SP' })
  state!: string;
}

export class BeneficiaryEntityResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Helping Hands Charity Association' })
  companyName!: string;

  @ApiProperty({ example: 'Helping Hands', nullable: true })
  tradeName!: string | null;

  @ApiProperty({ example: '12.345.678/0001-90' })
  cnpj!: string;

  @ApiProperty({ example: 'contact@helpinghands.org' })
  institutionalEmail!: string;

  @ApiProperty({ example: '(11) 3456-7890' })
  institutionalPhone!: string;

  @ApiProperty({ example: 'Entity that supports families in social vulnerability.' })
  description!: string;

  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: () => AddressResponseDto })
  address!: AddressResponseDto;
}
