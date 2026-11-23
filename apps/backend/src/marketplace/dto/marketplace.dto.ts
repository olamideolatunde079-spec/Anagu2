import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty()
  @IsUUID()
  landTitleId: string;

  @ApiProperty({ example: 'Prime Commercial Plot, Independence Layout, Awka' })
  @IsString()
  @MinLength(5)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @IsPositive()
  askingPrice: number;

  @ApiPropertyOptional({ example: 'POL', default: 'POL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateListingStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'CANCELLED', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'CANCELLED', 'SUSPENDED'])
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
}

export class PurchaseListingDto {
  @ApiProperty({ example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Valid buyer wallet address is required' })
  buyerAddress: string;

  @ApiPropertyOptional({ description: 'Optional Polygon Amoy escrow transaction hash' })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
  escrowTxHash?: string;
}

export class SettleTransferDto {
  @ApiPropertyOptional({ description: 'Deed reference for on-chain transfer recording' })
  @IsOptional()
  @IsString()
  deedReference?: string;

  @ApiPropertyOptional({ description: 'Optional settlement transaction hash if already broadcast' })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid transaction hash' })
  settlementTxHash?: string;
}
