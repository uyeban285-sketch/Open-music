import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

export interface KmsClient {
  encrypt(plaintext: Buffer): Promise<{ ciphertext: Buffer; dekId: string }>;
  decrypt(ciphertext: Buffer, dekId: string): Promise<Buffer>;
  generateDataKey(): Promise<{ plainKey: Buffer; encryptedKey: Buffer; dekId: string }>;
}

@Injectable()
export class KmsService implements KmsClient {
  private readonly keys = new Map<string, Buffer>();

  async encrypt(plaintext: Buffer): Promise<{ ciphertext: Buffer; dekId: string }> {
    const { plainKey, dekId } = await this.generateDataKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', plainKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const ciphertext = Buffer.concat([iv, authTag, encrypted]);
    return { ciphertext, dekId };
  }

  async decrypt(ciphertext: Buffer, dekId: string): Promise<Buffer> {
    const key = this.keys.get(dekId);
    if (!key) {
      throw new Error(`DEK not found: ${dekId}`);
    }

    const iv = ciphertext.subarray(0, 12);
    const authTag = ciphertext.subarray(12, 28);
    const encrypted = ciphertext.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async generateDataKey(): Promise<{ plainKey: Buffer; encryptedKey: Buffer; dekId: string }> {
    const dekId = randomBytes(16).toString('hex');
    const plainKey = randomBytes(32);
    this.keys.set(dekId, plainKey);
    // In dev mode, "encrypted" key is just the plain key (no real KMS)
    const encryptedKey = Buffer.from(plainKey);
    return { plainKey, encryptedKey, dekId };
  }
}
