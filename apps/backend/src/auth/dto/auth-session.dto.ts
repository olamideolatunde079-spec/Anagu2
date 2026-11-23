import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'citizen@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'web-browser-01' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token returned from login/register' })
  @IsString()
  @MinLength(24)
  refreshToken: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Optional refresh token to revoke' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
