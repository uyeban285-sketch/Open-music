import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

import { AuthService } from './auth.service';
import { loginSchema, refreshSchema, registerSchema } from './dto';
import type { LoginDto, RefreshDto, RegisterDto, TokensResponse, UserResponse } from './dto';
import { JwtAuthGuard } from './guards/jwt.guard';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto): Promise<TokensResponse> {
    return this.authService.register(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto): Promise<TokensResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  async refresh(@Body() dto: RefreshDto): Promise<TokensResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(refreshSchema))
  async logout(@Body() dto: RefreshDto, @Req() req: AuthenticatedRequest): Promise<void> {
    await this.authService.logout(dto.refreshToken, req.user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserResponse> {
    return this.authService.getMe(req.user.userId);
  }
}
