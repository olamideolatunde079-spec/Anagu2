import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertAdminConfigDto {
  @ApiProperty({ example: { bps: 250 } })
  @IsObject()
  configValue: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: ['GIS', 'ORACLE', 'BLOCKCHAIN', 'STORAGE', 'MARKETPLACE', 'SECURITY', 'SYSTEM'],
  })
  @IsOptional()
  @IsIn(['GIS', 'ORACLE', 'BLOCKCHAIN', 'STORAGE', 'MARKETPLACE', 'SECURITY', 'SYSTEM'])
  category?: 'GIS' | 'ORACLE' | 'BLOCKCHAIN' | 'STORAGE' | 'MARKETPLACE' | 'SECURITY' | 'SYSTEM';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}
