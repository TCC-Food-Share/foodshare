import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  private namesById: Promise<Map<number, string>> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async nameOf(roleId: number): Promise<string | undefined> {
    this.namesById ??= this.load();
    try {
      return (await this.namesById).get(roleId);
    } catch (error) {
      this.namesById = null;
      throw error;
    }
  }

  private async load(): Promise<Map<number, string>> {
    const roles = await this.prisma.role.findMany();
    return new Map(roles.map((role) => [role.id, role.name]));
  }
}
