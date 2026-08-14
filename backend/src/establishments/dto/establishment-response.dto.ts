import { ApiProperty } from '@nestjs/swagger';

class UserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Maria Silva' })
  name!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  personalPhone!: string;
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

export class EstablishmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Good Taste Restaurant Ltd' })
  companyName!: string;

  @ApiProperty({ example: 'Good Taste', nullable: true })
  tradeName!: string | null;

  @ApiProperty({ example: '12.345.678/0001-90' })
  cnpj!: string;

  @ApiProperty({ example: 'contact@goodtaste.com' })
  institutionalEmail!: string;

  @ApiProperty({ example: '(11) 3456-7890' })
  institutionalPhone!: string;

  @ApiProperty({ example: 'Restaurant specialized in home-style meals.' })
  description!: string;

  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: () => AddressResponseDto })
  address!: AddressResponseDto;
}
