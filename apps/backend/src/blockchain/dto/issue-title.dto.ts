import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, Matches, IsOptional } from 'class-validator';

export class IssueTitleDto {
  @ApiProperty({ example: '0xf17f52151EbEF6C7334FAD080c5704D77216b732' })
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  ownerAddress: string;

  @ApiProperty({ example: 'parcel-uuid-001' })
  @IsUUID()
  parcelId: string;

  @ApiProperty({ example: '0xabc123...' })
  @IsString()
  spatialHash: string;

  @ApiProperty({ example: 'ipfs://QmHash...' })
  @IsString()
  tokenUri: string;

  @ApiProperty({ example: 'application-uuid-001' })
  @IsUUID()
  applicationId: string;
}
