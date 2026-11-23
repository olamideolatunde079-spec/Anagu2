import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsOptional, IsString, IsUUID, ArrayMinSize, IsNotEmpty,
} from 'class-validator';

export class VerifyOwnershipDto {
  @ApiProperty() @IsUUID() applicationId: string;
  @ApiProperty() @IsString() @IsNotEmpty() ownerName: string;
  @ApiProperty() @IsString() @IsNotEmpty() nationalId: string;
  @ApiProperty() @IsString() surveyPlanNumber: string;

  @ApiProperty({ type: [String], description: 'At least 3 witness identifiers required' })
  @IsArray()
  @ArrayMinSize(1)
  communityWitnesses: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalClearanceHash?: string;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  documents?: Array<{ name: string; hash: string }>;
}
