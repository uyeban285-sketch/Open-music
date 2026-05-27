import { Injectable } from '@nestjs/common';
import type {
  ConnectorId,
  ConnectorManifest,
  ConnectorRegistry,
  MusicConnector,
} from '@open-music/shared';

@Injectable()
export class ConnectorRegistryService implements ConnectorRegistry {
  private readonly connectors = new Map<string, MusicConnector>();

  register(connector: MusicConnector): void {
    this.connectors.set(connector.manifest.id, connector);
  }

  get(id: ConnectorId): MusicConnector | undefined {
    return this.connectors.get(id);
  }

  list(): ConnectorManifest[] {
    return Array.from(this.connectors.values()).map((c) => c.manifest);
  }

  has(id: ConnectorId): boolean {
    return this.connectors.has(id);
  }
}
