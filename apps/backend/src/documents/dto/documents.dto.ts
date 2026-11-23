import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class VerifyDocumentDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED', 'FLAGGED'] })
  @IsIn(['VERIFIED', 'REJECTED', 'FLAGGED'])
  decision: 'VERIFIED' | 'REJECTED' | 'FLAGGED';

  @ApiPropertyOptional({ description: 'Optional expected SHA-256 hex digest to cross-check' })
  @IsOptional()
  @IsString()
  expectedSha256?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GrantDocumentAccessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  granteeUserId?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  granteeRole?: UserRole;

  @ApiProperty({ enum: ['VIEW', 'DOWNLOAD', 'VERIFY'], default: 'DOWNLOAD' })
  @IsIn(['VIEW', 'DOWNLOAD', 'VERIFY'])
  accessLevel: 'VIEW' | 'DOWNLOAD' | 'VERIFY' = 'DOWNLOAD';

  @ApiPropertyOptional({ description: 'Grant duration in hours (default 24h, max 720h)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
