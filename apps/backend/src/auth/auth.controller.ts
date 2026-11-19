import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto, RefreshTokenDto } from './dto/auth-session.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit(10, 60)
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto, @Request() req: any) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.fullName,
      dto.nationalId,
      dto.walletAddress,
      dto.phone,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    );
  }

  @Post('login')
  @HttpCode(200)
  @RateLimit(10, 60)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  async login(@Request() req: any) {
    return this.authService.login(req.user, {
      deviceId: req.body?.deviceId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @RateLimit(20, 60)
  @ApiOperation({ summary: 'Rotate refresh token and issue a fresh JWT access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Request() req: any) {
    return this.authService.refreshSession(dto.refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active session tokens and log out' })
  async logout(@Body() dto: LogoutDto, @Request() req: any) {
    return this.authService.logout(req.user.id, dto.refreshToken, req.user.tokenJti);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async me(@Request() req: any) {
    return this.authService.getSafeProfile(req.user.id);
  }
}
