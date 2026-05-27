import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt.guard';

import { SettingsService } from './settings.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: AuthenticatedRequest): Promise<Record<string, string>> {
    return this.settingsService.getSettings(req.user.userId);
  }

  @Patch()
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, string>,
  ): Promise<Record<string, string>> {
    return this.settingsService.updateSettings(req.user.userId, body);
  }

  @Get('privacy')
  async getPrivacy(@Req() req: AuthenticatedRequest): Promise<Record<string, string>> {
    return this.settingsService.getPrivacy(req.user.userId);
  }

  @Patch('privacy')
  async updatePrivacy(
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, string>,
  ): Promise<Record<string, string>> {
    return this.settingsService.updatePrivacy(req.user.userId, body);
  }
}
