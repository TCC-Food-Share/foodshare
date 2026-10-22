import { Injectable, NotFoundException } from '@nestjs/common';

import { JOB_NOT_FOUND } from './jobs.constants';

export interface JobResult {
  affected: number;
}

export type JobHandler = () => Promise<JobResult>;

@Injectable()
export class JobsService {
  private readonly handlers = new Map<string, JobHandler>();

  register(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  async run(name: string): Promise<JobResult> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new NotFoundException({ code: JOB_NOT_FOUND, message: `Job "${name}" not found.` });
    }
    return handler();
  }
}
