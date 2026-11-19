import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AttestationType } from '../entities/attestation.entity';

export class CreateAttestationDto {
  @ApiProperty()
  @IsUUID()
  applicationId: string;

  @ApiProperty({
    enum: [
      'COMMUNITY_ELDER',
      'TRADITIONAL_RULER',
      'NEIGHBOR_WITNESS',
      'INSTITUTIONAL_REGISTRY',
      'LICENSED_SURVEYOR',
    ],
  })
  @IsIn([
    'COMMUNITY_ELDER',
    'TRADITIONAL_RULER',
    'NEIGHBOR_WITNESS',
    'INSTITUTIONAL_REGISTRY',
    'LICENSED_SURVEYOR',
  ])
  attestationType: AttestationType;

  @ApiProperty({ example: 'Chief Emeka Nwosu' })
  @IsString()
  attesterName: string;

  @ApiPropertyOptional({ example: 'Traditional Head, Awka South' })
  @IsOptional()
  @IsString()
  attesterRoleOrTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statement?: string;

  @ApiProperty({ enum: ['ENDORSED', 'CONFLICT', 'ABSTAINED', 'PENDING'] })
  @IsIn(['ENDORSED', 'CONFLICT', 'ABSTAINED', 'PENDING'])
  decision: 'ENDORSED' | 'CONFLICT' | 'ABSTAINED' | 'PENDING';

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  confidenceWeight?: number;
}
