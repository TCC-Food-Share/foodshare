import { ApiProperty } from '@nestjs/swagger';

export class InstitutionListItemDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({
    example: 'Good Taste',
    description: 'Nome público: o nome fantasia ou, quando não houver, a razão social',
  })
  name!: string;

  @ApiProperty({
    example: 'https://api.foodshare.com.br/files/users/3f2a0c1e-9b1e-4c7a-8d2e-1f0a9b8c7d6e.webp',
    description: 'URL da rota de leitura da imagem',
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({ example: 'Birigui', description: 'Município do endereço' })
  city!: string;

  @ApiProperty({ example: 'SP', description: 'UF do endereço' })
  state!: string;
}

export class InstitutionPublicProfileDto extends InstitutionListItemDto {
  @ApiProperty({ example: 'Family restaurant that donates daily surplus.' })
  description!: string;
}

export class PaginatedInstitutionsResponseDto {
  @ApiProperty({ type: () => InstitutionListItemDto, isArray: true })
  data!: InstitutionListItemDto[];

  @ApiProperty({ example: 12, description: 'Total de instituições que atendem aos filtros' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Página retornada' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Tamanho de página aplicado' })
  pageSize!: number;
}
