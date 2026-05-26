import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt.guard';

import { IntegrationsService } from './integrations.service';

interface AuthenticatedRequest {
  user: { sub: string };
}

@Controller('integrations')
export class IntegrationsController {
  constructor(@Inject(IntegrationsService) private readonly service: IntegrationsService) {}

  @Get('connectors')
  listConnectors() {
    return this.service.listConnectors();
  }

  @UseGuards(JwtAuthGuard)
  @Get('connections')
  listConnections(@Req() req: AuthenticatedRequest) {
    return this.service.listConnections(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('connect/:connectorId')
  connect(@Req() req: AuthenticatedRequest, @Param('connectorId') connectorId: string) {
    return this.service.connect(req.user.sub, connectorId);
  }

  @Get('connect/:connectorId/callback')
  handleCallback(@Query('state') state: string, @Query() params: Record<string, string>) {
    return this.service.handleCallback(state, params);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('connections/:id')
  disconnect(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.disconnect(req.user.sub, id);
  }
}
