import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'Adewale Okonkwo' })
  @IsString()
  @MinLength(2)
  ownerName: string;

  @ApiProperty({ example: 'NIN-12345678901' })
  @IsString()
  @MinLength(5)
  nationalId: string;

  @ApiProperty({
    description: 'Array of [longitude, latitude] coordinate pairs (min 3)',
    example: [[7.07, 6.21], [7.072, 6.21], [7.072, 6.212], [7.07, 6.212]],
  })
  @IsArray()
  @ArrayMinSize(3)
  coordinates: [number, number][];

  @ApiPropertyOptional({ example: 'SP/AN/2025/0042' })
  @IsOptional()
  @IsString()
  surveyPlanNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  communityWitnesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalClearanceHash?: string;

  @ApiPropertyOptional({ example: 'Awka South' })
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiPropertyOptional({ example: 'Anambra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jurisdictionId?: string;

  @ApiPropertyOptional({ example: 'Plot 14, Independence Layout, Awka' })
  @IsOptional()
  @IsString()
  addressDesc?: string;

  @ApiPropertyOptional({ example: 'STATUTORY_RIGHT_OF_OCCUPANCY' })
  @IsOptional()
  @IsString()
  titleType?: string;

  @ApiPropertyOptional({ example: 'RESIDENTIAL' })
  @IsOptional()
  @IsString()
  landUse?: string;

  @ApiPropertyOptional({
    enum: ['FIRST_REGISTRATION', 'RECTIFICATION', 'SUBDIVISION', 'CONSOLIDATION', 'REISSUE'],
  })
  @IsOptional()
  @IsIn(['FIRST_REGISTRATION', 'RECTIFICATION', 'SUBDIVISION', 'CONSOLIDATION', 'REISSUE'])
  applicationType?: 'FIRST_REGISTRATION' | 'RECTIFICATION' | 'SUBDIVISION' | 'CONSOLIDATION' | 'REISSUE';
}

export class RejectApplicationDto {
  @ApiProperty({ example: 'LEGAL_REVIEW' })
  @IsString()
  stage: string;

  @ApiProperty({ example: 'Encumbrance detected on survey plan beacon' })
  @IsString()
  @MinLength(5)
  reason: string;
}

export class SurveyReviewDto {
  @ApiProperty()
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surveyPlanNumber?: string;

  @ApiPropertyOptional({ example: 'SUB_METRE' })
  @IsOptional()
  @IsString()
  surveyAccuracyClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional updated coordinates verified by surveyor' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  coordinates?: [number, number][];
}

export class LegalReviewDto {
  @ApiProperty({ enum: ['CLEARED', 'QUERIED', 'REJECTED'] })
  @IsIn(['CLEARED', 'QUERIED', 'REJECTED'])
  clearanceStatus: 'CLEARED' | 'QUERIED' | 'REJECTED';

  @ApiProperty()
  @IsBoolean()
  encumbranceCheckPassed: boolean;

  @ApiProperty()
  @IsBoolean()
  statutoryCompliancePassed: boolean;

  @ApiProperty()
  @IsBoolean()
  lua1978Compliant: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clearanceHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;
}

export class ResubmitApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surveyPlanNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  communityWitnesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  coordinates?: [number, number][];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
