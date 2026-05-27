import { Inject, Injectable } from '@nestjs/common';
import type { PrivacySetting } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSettings(userId: string): Promise<Record<string, string>> {
    const settings: PrivacySetting[] = await this.prisma.privacySetting.findMany({
      where: { userId },
    });

    return this.toMap(settings);
  }

  async updateSettings(
    userId: string,
    settings: Record<string, string>,
  ): Promise<Record<string, string>> {
    const entries = Object.entries(settings);

    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.privacySetting.upsert({
          where: { userId_key: { userId, key } },
          create: { userId, key, value },
          update: { value },
        }),
      ),
    );

    return this.getSettings(userId);
  }

  async getPrivacy(userId: string): Promise<Record<string, string>> {
    const settings: PrivacySetting[] = await this.prisma.privacySetting.findMany({
      where: {
        userId,
        key: { startsWith: 'privacy.' },
      },
    });

    return this.toMap(settings);
  }

  async updatePrivacy(
    userId: string,
    privacy: Record<string, string>,
  ): Promise<Record<string, string>> {
    const entries = Object.entries(privacy);

    await Promise.all(
      entries.map(([key, value]) => {
        const prefixedKey = key.startsWith('privacy.') ? key : `privacy.${key}`;
        return this.prisma.privacySetting.upsert({
          where: { userId_key: { userId, key: prefixedKey } },
          create: { userId, key: prefixedKey, value },
          update: { value },
        });
      }),
    );

    return this.getPrivacy(userId);
  }

  private toMap(settings: PrivacySetting[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const setting of settings) {
      map[setting.key] = setting.value;
    }
    return map;
  }
}
