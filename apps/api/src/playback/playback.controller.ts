import { Body, Controller, Get, Inject, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt.guard';

import { PlaybackService } from './playback.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

@Controller('playback')
@UseGuards(JwtAuthGuard)
export class PlaybackController {
  constructor(@Inject(PlaybackService) private readonly playbackService: PlaybackService) {}

  @Get('state')
  async getState(@Req() req: AuthenticatedRequest) {
    return this.playbackService.getState(req.user.userId);
  }

  @Post('play')
  async play(@Req() req: AuthenticatedRequest, @Body() body: { trackId?: string }) {
    return this.playbackService.executeCommand(req.user.userId, {
      type: 'play',
      trackId: body.trackId,
    });
  }

  @Post('pause')
  async pause(@Req() req: AuthenticatedRequest) {
    return this.playbackService.executeCommand(req.user.userId, { type: 'pause' });
  }

  @Post('seek')
  async seek(@Req() req: AuthenticatedRequest, @Body() body: { positionMs: number }) {
    return this.playbackService.executeCommand(req.user.userId, {
      type: 'seek',
      positionMs: body.positionMs,
    });
  }

  @Post('next')
  async next(@Req() req: AuthenticatedRequest) {
    return this.playbackService.executeCommand(req.user.userId, { type: 'next' });
  }

  @Post('prev')
  async prev(@Req() req: AuthenticatedRequest) {
    return this.playbackService.executeCommand(req.user.userId, { type: 'prev' });
  }

  @Put('queue')
  async setQueue(@Req() req: AuthenticatedRequest, @Body() body: { trackIds: string[] }) {
    return this.playbackService.executeCommand(req.user.userId, {
      type: 'setQueue',
      trackIds: body.trackIds,
    });
  }

  @Post('queue/reorder')
  async reorder(@Req() req: AuthenticatedRequest, @Body() body: { from: number; to: number }) {
    return this.playbackService.executeCommand(req.user.userId, {
      type: 'reorder',
      from: body.from,
      to: body.to,
    });
  }
}
