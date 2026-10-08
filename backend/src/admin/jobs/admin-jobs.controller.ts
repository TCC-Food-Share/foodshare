import { HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Session } from '@thallesp/nestjs-better-auth';

import { AuditService } from '../../audit/audit.service';
import { AdminController } from '../../auth/admin-controller.decorator';
import { JobsService } from '../../jobs/jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RunJobResponseDto } from './dto/run-job-response.dto';

@AdminController('jobs')
export class AdminJobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':name/run')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Execução manual de tarefa',
    description:
      'Executa imediatamente uma tarefa agendada do sistema, para testes sem esperar o ' +
      'horário programado. A execução é registrada na auditoria (`job.run`). Restrita a ' +
      'administradores.',
  })
  @ApiOkResponse({ description: 'Tarefa executada.', type: RunJobResponseDto })
  @ApiNotFoundResponse({ description: 'Nenhuma tarefa com esse nome (`code: JOB_NOT_FOUND`).' })
  @ApiUnauthorizedResponse({ description: 'Requisição sem sessão autenticada válida.' })
  async run(
    @Session() session: UserSession,
    @Param('name') name: string,
  ): Promise<RunJobResponseDto> {
    const { affected } = await this.jobsService.run(name);

    await this.prisma.$transaction((tx) =>
      this.auditService.record(tx, {
        administrator: {
          id: Number(session.user.id),
          name: session.user.name,
          email: session.user.email,
        },
        action: 'job.run',
        entityType: 'Job',
        entityId: name,
        details: { affected },
      }),
    );

    return { name, affected };
  }
}
