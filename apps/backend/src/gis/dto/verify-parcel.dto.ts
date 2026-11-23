import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatePairDto {
  @ApiProperty({ example: 3.396, description: 'Longitude (WGS 84)' })
  @IsNumber()
  0: number;

  @ApiProperty({ example: 6.454, description: 'Latitude (WGS 84)' })
  @IsNumber()
  1: number;
}

export class VerifyParcelDto {
  @ApiProperty({
    description: 'Array of [longitude, latitude] pairs defining the parcel polygon. Min 3 pairs.',
    example: [[3.396, 6.454], [3.397, 6.454], [3.397, 6.455], [3.396, 6.455]],
    type: 'array',
    items: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
  })
  @IsArray()
  @ArrayMinSize(3)
  coordinates: [number, number][];

  @ApiPropertyOptional({
    description: 'UUID of an existing parcel to exclude from overlap check (for updates).',
  })
  @IsOptional()
  @IsUUID()
  excludeParcelId?: string;

  @ApiPropertyOptional({
    description: 'Overlap tolerance in metres (default: 0.5). Record the value used in results.',
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  overlapToleranceMetres?: number;
}
