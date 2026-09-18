import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<CategoryResponseDto[]> {
    return this.prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }
}
