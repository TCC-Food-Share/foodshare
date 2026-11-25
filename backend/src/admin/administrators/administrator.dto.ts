import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { createAdminListQueryDto } from '../lists/common/admin-list-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// O better-auth grava e procura o e-mail em minúsculas.
const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const ADMINISTRATOR_SORT_FIELDS = ['id', 'name', 'email'] as const;

export class ListAdministratorsQueryDto extends createAdminListQueryDto(
  ADMINISTRATOR_SORT_FIELDS,
) {}

export class UpdateAdministratorDto {
  @ApiPropertyOptional({ example: 'Ana Lima', maxLength: 200 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'ana@example.com', maxLength: 200 })
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(200)
  email?: string;
}

export class CreateAdministratorDto {
  @ApiProperty({ example: 'Ana Lima', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'ana@example.com', maxLength: 200 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'Senha de acesso (8 a 72 caracteres)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class AdministratorDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 'Ana Lima' })
  name!: string;

  @ApiProperty({ example: 'ana@example.com' })
  email!: string;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/users/9b1e7a.png',
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({ example: true, description: 'Se o e-mail já foi confirmado (DT48)' })
  emailVerified!: boolean;
}

export class PaginatedAdministratorsDto {
  @ApiProperty({ type: AdministratorDto, isArray: true })
  data!: AdministratorDto[];

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}
