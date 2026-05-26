import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { KmsService } from '../kms/kms.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenVaultService {
  constructor(
    @Inject(KmsService) private readonly kms: KmsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async wrapAccessToken(connectedServiceId: string, plainToken: string): Promise<void> {
    const { ciphertext, dekId } = await this.kms.encrypt(Buffer.from(plainToken));
    await this.prisma.connectedService.update({
      where: { id: connectedServiceId },
      data: { accessTokenCt: ciphertext, dekId },
    });
  }

  async wrapRefreshToken(connectedServiceId: string, plainToken: string): Promise<void> {
    const { ciphertext, dekId } = await this.kms.encrypt(Buffer.from(plainToken));
    await this.prisma.connectedService.update({
      where: { id: connectedServiceId },
      data: { refreshTokenCt: ciphertext, dekId },
    });
  }

  async unwrapAccessToken(connectedServiceId: string, userId: string): Promise<string> {
    const record = await this.prisma.connectedService.findUniqueOrThrow({
      where: { id: connectedServiceId },
    });

    if (!record.accessTokenCt || !record.dekId) {
      throw new Error('Access token ciphertext or DEK ID is missing');
    }

    const plaintext = await this.kms.decrypt(record.accessTokenCt, record.dekId);

    await this.audit.log({
      action: 'token_unwrap',
      category: 'security',
      userId,
      metadata: { connectedServiceId, tokenType: 'access' },
    });

    return plaintext.toString();
  }

  async unwrapRefreshToken(connectedServiceId: string, userId: string): Promise<string> {
    const record = await this.prisma.connectedService.findUniqueOrThrow({
      where: { id: connectedServiceId },
    });

    if (!record.refreshTokenCt || !record.dekId) {
      throw new Error('Refresh token ciphertext or DEK ID is missing');
    }

    const plaintext = await this.kms.decrypt(record.refreshTokenCt, record.dekId);

    await this.audit.log({
      action: 'token_unwrap',
      category: 'security',
      userId,
      metadata: { connectedServiceId, tokenType: 'refresh' },
    });

    return plaintext.toString();
  }
}
