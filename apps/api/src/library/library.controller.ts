import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt.guard';

import { LibraryService } from './library.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(@Inject(LibraryService) private readonly libraryService: LibraryService) {}

  @Get('tracks')
  async listTracks(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.libraryService.listTracks(req.user.userId, cursor, parsedLimit);
  }

  @Get('tracks/:id')
  async getTrack(@Param('id') id: string) {
    return this.libraryService.getTrack(id);
  }

  @Get('playlists')
  async listPlaylists(@Req() req: AuthenticatedRequest) {
    return this.libraryService.listPlaylists(req.user.userId);
  }

  @Get('playlists/:id')
  async getPlaylist(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.libraryService.getPlaylist(req.user.userId, id);
  }

  @Post('playlists')
  async createPlaylist(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; description?: string },
  ) {
    return this.libraryService.createPlaylist(req.user.userId, body.title, body.description);
  }

  @Patch('playlists/:id')
  async updatePlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.libraryService.updatePlaylist(req.user.userId, id, body);
  }

  @Post('playlists/:id/tracks')
  async addTrackToPlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { trackId: string },
  ) {
    await this.libraryService.addTrackToPlaylist(req.user.userId, id, body.trackId);
    return { success: true };
  }

  @Delete('playlists/:playlistId/tracks/:trackId')
  async removeTrackFromPlaylist(
    @Req() req: AuthenticatedRequest,
    @Param('playlistId') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    await this.libraryService.removeTrackFromPlaylist(req.user.userId, playlistId, trackId);
    return { success: true };
  }

  @Get('likes')
  async listLikes(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.libraryService.listLikes(req.user.userId, cursor, parsedLimit);
  }

  @Post('likes/:trackId')
  async addLike(@Req() req: AuthenticatedRequest, @Param('trackId') trackId: string) {
    return this.libraryService.addLike(req.user.userId, trackId);
  }

  @Delete('likes/:trackId')
  async removeLike(@Req() req: AuthenticatedRequest, @Param('trackId') trackId: string) {
    await this.libraryService.removeLike(req.user.userId, trackId);
    return { success: true };
  }
}
