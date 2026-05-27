import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ConnectorId, ConnectorManifest } from '@open-music/shared';
import type { ConnectedService } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { ConnectorRegistryService } from '../connectors/connector-registry.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TokenVaultService } from '../token-vault/token-vault.service';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(ConnectorRegistryService) private readonly registry: ConnectorRegistryService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(TokenVaultService) private readonly tokenVault: TokenVaultService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  listConnectors(): ConnectorManifest[] {
    return this.registry.list();
  }

  async listConnections(userId: string): Promise<ConnectedService[]> {
    return this.prisma.connectedService.findMany({
      where: { userId },
    });
  }

  async connect(
    userId: string,
    connectorId: string,
  ): Promise<{ redirectUrl: string; state: string }> {
    const connector = this.registry.get(connectorId as ConnectorId);
    if (!connector) {
      throw new NotFoundException(`Connector "${connectorId}" not found`);
    }

    const { redirectUrl, state } = await connector.startAuth(userId);

    await this.redis.set(
      `oauth_state:${state}`,
      JSON.stringify({ userId, connectorId }),
      'EX',
      600,
    );

    return { redirectUrl, state };
  }

  async handleCallback(state: string, params: Record<string, string>): Promise<ConnectedService> {
    const raw = await this.redis.get(`oauth_state:${state}`);
    if (!raw) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    await this.redis.del(`oauth_state:${state}`);

    const { userId, connectorId } = JSON.parse(raw) as {
      userId: string;
      connectorId: string;
    };

    const connector = this.registry.get(connectorId as ConnectorId);
    if (!connector) {
      throw new NotFoundException(`Connector "${connectorId}" not found`);
    }

    const tokenBundle = await connector.handleCallback(state, params);

    const connectedService = await this.prisma.connectedService.create({
      data: {
        userId,
        connectorId,
        status: 'connected',
        tokenExpiresAt: tokenBundle.expiresAt,
      },
    });

    await this.tokenVault.wrapAccessToken(connectedService.id, tokenBundle.accessToken);
    if (tokenBundle.refreshToken) {
      await this.tokenVault.wrapRefreshToken(connectedService.id, tokenBundle.refreshToken);
    }

    await this.audit.log({
      action: 'connector_connected',
      category: 'integration',
      userId,
      metadata: { connectorId, connectionId: connectedService.id },
    });

    return connectedService;
  }

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const connection = await this.prisma.connectedService.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.userId !== userId) {
      throw new NotFoundException('Connection not found');
    }

    const connector = this.registry.get(connection.connectorId as ConnectorId);
    if (connector && connection.accessTokenCt && connection.dekId) {
      try {
        const accessToken = await this.tokenVault.unwrapAccessToken(connectionId, userId);
        const refreshToken = connection.refreshTokenCt
          ? await this.tokenVault.unwrapRefreshToken(connectionId, userId)
          : null;
        await connector.revoke({
          accessToken,
          refreshToken,
          expiresAt: connection.tokenExpiresAt ?? new Date(),
          scope: null,
        });
      } catch {
        // Best-effort revocation
      }
    }

    await this.prisma.connectedService.delete({
      where: { id: connectionId },
    });

    await this.audit.log({
      action: 'connector_disconnected',
      category: 'integration',
      userId,
      metadata: { connectorId: connection.connectorId, connectionId },
    });
  }

  async getConnection(userId: string, connectionId: string): Promise<ConnectedService> {
    const connection = await this.prisma.connectedService.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.userId !== userId) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }
}
