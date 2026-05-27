import { Global, Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export const PRISMA_CLIENT = 'PRISMA_CLIENT';

export const InjectPrisma = () => Inject(PRISMA_CLIENT);

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      useFactory: async () => {
        const prisma = new PrismaClient({
          log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['error'],
        });
        await prisma.$connect();
        return prisma;
      },
    },
  ],
  exports: [PRISMA_CLIENT],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectPrisma() private readonly prisma: PrismaClient) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
