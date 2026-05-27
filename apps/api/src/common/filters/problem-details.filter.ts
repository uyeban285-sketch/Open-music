import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  messageRu?: string;
  messageEn?: string;
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let problem: ProblemDetails;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string' ? response : (response as Record<string, unknown>)['message'];
      problem = {
        title: exception.message,
        status,
        detail: Array.isArray(message) ? (message as string[]).join('; ') : String(message),
        code: `http.${status}`,
      };
    } else {
      this.logger.error(exception);
      problem = {
        title: 'Internal Server Error',
        status,
        code: 'internal_error',
        messageRu: 'Внутренняя ошибка сервера',
        messageEn: 'Internal server error',
      };
    }

    void reply.status(status).header('Content-Type', 'application/problem+json').send(problem);
  }
}
