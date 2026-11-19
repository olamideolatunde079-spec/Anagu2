import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class TransferTitleDto {
  @ApiProperty({ example: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid recipient wallet address' })
  toAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toUserId?: string;

  @ApiPropertyOptional({ example: 'DEED-AN-2026-0091' })
  @IsOptional()
  @IsString()
  deedReference?: string;
}
