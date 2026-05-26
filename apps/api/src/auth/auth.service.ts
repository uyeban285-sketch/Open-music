import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import type { TokensResponse, UserResponse } from './dto';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async register(email: string, password: string, displayName: string): Promise<TokensResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        type: 'https://httpstatuses.com/409',
        title: 'Conflict',
        status: 409,
        detail: 'A user with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    return this.generateTokens(user.id, user.role);
  }

  async login(email: string, password: string): Promise<TokensResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        type: 'https://httpstatuses.com/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
      });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException({
        type: 'https://httpstatuses.com/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid email or password',
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<TokensResponse> {
    const key = `refresh:${refreshToken}`;
    const userId = await this.redis.get(key);

    if (!userId) {
      throw new UnauthorizedException({
        type: 'https://httpstatuses.com/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid or expired refresh token',
      });
    }

    // Delete old refresh token
    await this.redis.del(key);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        type: 'https://httpstatuses.com/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'User not found',
      });
    }

    return this.generateTokens(user.id, user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    const key = `refresh:${refreshToken}`;
    await this.redis.del(key);
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        type: 'https://httpstatuses.com/401',
        title: 'Unauthorized',
        status: 401,
        detail: 'User not found',
      });
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async generateTokens(userId: string, role: string): Promise<TokensResponse> {
    const accessToken = this.jwt.sign({ sub: userId, role });

    const refreshToken = uuidv4();
    const key = `refresh:${refreshToken}`;
    await this.redis.set(key, userId, 'EX', REFRESH_TOKEN_TTL);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }
}
