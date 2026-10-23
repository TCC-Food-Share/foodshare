import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { IMAGE_FOLDERS, IMAGE_NAME_PATTERN } from './files.constants';
import { ImageStorageService } from './image-storage.service';

@ApiTags('Arquivos')
@Controller('files')
export class FilesController {
  constructor(private readonly storage: ImageStorageService) {}

  @Get(':folder/:name')
  @ApiOperation({
    summary: 'Leitura de imagem',
    description:
      'Devolve a imagem guardada sob a chave `<folder>/<name>`, com cache longo. ' +
      'Exige sessão de qualquer papel.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: 'Arquivo da imagem.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  @ApiNotFoundResponse({ description: 'Chave inexistente ou fora do formato gerado pela API.' })
  async read(
    @Param('folder') folder: string,
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!IMAGE_FOLDERS.includes(folder) || !IMAGE_NAME_PATTERN.test(name)) {
      throw new NotFoundException('Image not found.');
    }

    const image = await this.storage.read(`${folder}/${name}`);
    if (!image) {
      throw new NotFoundException('Image not found.');
    }

    res.set({
      'Content-Type': image.contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    });
    return new StreamableFile(image.body);
  }
}
