import { Module } from '@nestjs/common';

import { KmsModule } from '../kms/kms.module';

import { TokenVaultService } from './token-vault.service';

@Module({
  imports: [KmsModule],
  providers: [TokenVaultService],
  exports: [TokenVaultService],
})
export class TokenVaultModule {}
