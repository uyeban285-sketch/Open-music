import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Like, Playlist, Track } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class LibraryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTracks(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<Track>> {
    const take = Math.min(limit ?? 50, 100);

    const cursorCondition = cursor ? this.decodeCursor(cursor) : undefined;

    const likes = await this.prisma.like.findMany({
      where: {
        userId,
        ...(cursorCondition
          ? {
              OR: [
                { createdAt: { lt: cursorCondition.createdAt } },
                {
                  createdAt: cursorCondition.createdAt,
                  id: { lt: cursorCondition.id },
                },
              ],
            }
          : {}),
      },
      include: { track: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = likes.length > take;
    const items = likes.slice(0, take);
    const tracks = items.map((like) => like.track);

    const lastItem = items[items.length - 1];
    const nextCursor = lastItem ? this.encodeCursor(lastItem.createdAt, lastItem.id) : null;

    return {
      items: tracks,
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  }

  async getTrack(trackId: string): Promise<Track> {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { externalRefs: true },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    return track;
  }

  async listPlaylists(userId: string): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPlaylist(userId: string, playlistId: string): Promise<Playlist> {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id: playlistId, userId },
      include: {
        playlistTracks: {
          include: { track: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    return playlist;
  }

  async createPlaylist(userId: string, title: string, description?: string): Promise<Playlist> {
    return this.prisma.playlist.create({
      data: { userId, title, description },
    });
  }

  async updatePlaylist(
    userId: string,
    playlistId: string,
    data: { title?: string; description?: string },
  ): Promise<Playlist> {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    return this.prisma.playlist.update({
      where: { id: playlistId },
      data,
    });
  }

  async addTrackToPlaylist(userId: string, playlistId: string, trackId: string): Promise<void> {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const lastTrack = await this.prisma.playlistTrack.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
    });

    const position = lastTrack ? lastTrack.position + 1 : 0;

    await this.prisma.playlistTrack.create({
      data: { playlistId, trackId, position },
    });

    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { trackCount: { increment: 1 } },
    });
  }

  async removeTrackFromPlaylist(
    userId: string,
    playlistId: string,
    trackId: string,
  ): Promise<void> {
    const playlist = await this.prisma.playlist.findFirst({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    await this.prisma.playlistTrack.delete({
      where: { playlistId_trackId: { playlistId, trackId } },
    });

    await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { trackCount: { decrement: 1 } },
    });
  }

  async listLikes(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedResult<Like & { track: Track }>> {
    const take = Math.min(limit ?? 50, 100);

    const cursorCondition = cursor ? this.decodeCursor(cursor) : undefined;

    const likes = await this.prisma.like.findMany({
      where: {
        userId,
        ...(cursorCondition
          ? {
              OR: [
                { createdAt: { lt: cursorCondition.createdAt } },
                {
                  createdAt: cursorCondition.createdAt,
                  id: { lt: cursorCondition.id },
                },
              ],
            }
          : {}),
      },
      include: { track: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = likes.length > take;
    const items = likes.slice(0, take) as (Like & { track: Track })[];

    const lastItem = items[items.length - 1];
    const nextCursor = lastItem ? this.encodeCursor(lastItem.createdAt, lastItem.id) : null;

    return {
      items,
      cursor: hasMore ? nextCursor : null,
      hasMore,
    };
  }

  async addLike(userId: string, trackId: string): Promise<Like> {
    return this.prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
  }

  async removeLike(userId: string, trackId: string): Promise<void> {
    await this.prisma.like.delete({
      where: { userId_trackId: { userId, trackId } },
    });
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
    return { createdAt: new Date(decoded.createdAt), id: decoded.id };
  }
}
