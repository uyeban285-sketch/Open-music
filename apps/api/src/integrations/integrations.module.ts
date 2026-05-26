import { Module } from '@nestjs/common';

import { ConnectorsModule } from '../connectors/connectors.module';
import { TokenVaultModule } from '../token-vault/token-vault.module';

import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [ConnectorsModule, TokenVaultModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
