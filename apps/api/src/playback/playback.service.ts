import { Inject, Injectable } from '@nestjs/common';
import type { PlaybackSession } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { applyCommand } from './playback-state';
import type { PlaybackCommand, PlaybackSessionState } from './playback-state';

@Injectable()
export class PlaybackService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getState(userId: string): Promise<PlaybackSessionState> {
    const session = await this.prisma.playbackSession.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toSessionState(session);
  }

  async executeCommand(userId: string, command: PlaybackCommand): Promise<PlaybackSessionState> {
    const session = await this.prisma.playbackSession.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const state = this.toSessionState(session);
    const next = applyCommand(state, command);

    await this.prisma.playbackSession.update({
      where: { userId },
      data: {
        revision: next.revision,
        state: next.state,
        currentTrackId: next.currentTrackId,
        positionMs: next.positionMs,
        queue: next.queue as unknown as string,
        shuffle: next.shuffle,
        repeatMode: next.repeatMode,
        volume: next.volume,
      },
    });

    return next;
  }

  private toSessionState(session: PlaybackSession): PlaybackSessionState {
    const queue = Array.isArray(session.queue) ? (session.queue as string[]) : [];
    const currentTrackId = session.currentTrackId ?? null;
    const queueIndex = currentTrackId ? Math.max(0, queue.indexOf(currentTrackId)) : 0;

    return {
      state: session.state as PlaybackSessionState['state'],
      currentTrackId,
      positionMs: session.positionMs,
      queue,
      queueIndex,
      shuffle: session.shuffle,
      repeatMode: session.repeatMode as PlaybackSessionState['repeatMode'],
      volume: session.volume,
      revision: session.revision,
    };
  }
}
