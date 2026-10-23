import { Global, Module } from '@nestjs/common';

import { FilesController } from './files.controller';
import { ImageStorageService } from './image-storage.service';

@Global()
@Module({
  controllers: [FilesController],
  providers: [ImageStorageService],
  exports: [ImageStorageService],
})
export class FilesModule {}
