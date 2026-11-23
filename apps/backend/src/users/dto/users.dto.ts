import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Adewale Okonkwo' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '0xf17f52151EbEF6C7334FAD080c5704D77216b732' })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
  walletAddress?: string;

  @ApiPropertyOptional({ example: 'NIN-123456789' })
  @IsOptional()
  @IsString()
  nationalId?: string;
}

export class SubmitVerificationDto {
  @ApiProperty({ enum: ['EMAIL', 'PHONE', 'NIN_IDENTITY', 'SURVEYOR_LICENSE', 'INSTITUTIONAL_ID'] })
  @IsIn(['EMAIL', 'PHONE', 'NIN_IDENTITY', 'SURVEYOR_LICENSE', 'INSTITUTIONAL_ID'])
  verificationType: 'EMAIL' | 'PHONE' | 'NIN_IDENTITY' | 'SURVEYOR_LICENSE' | 'INSTITUTIONAL_ID';

  @ApiProperty({ description: 'Raw identifier or license value; stored as SHA-256 hash only' })
  @IsString()
  referenceValue: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewVerificationDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsIn(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;
}

export class CreateStaffProfileDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiProperty({ example: 'STF-AN-0142' })
  @IsString()
  staffNumber: string;

  @ApiProperty({ example: 'Senior Cadastral Surveyor' })
  @IsString()
  designation: string;

  @ApiPropertyOptional({ example: 'SURCON-2025-8821' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAuthorizedSigner?: boolean;
}
