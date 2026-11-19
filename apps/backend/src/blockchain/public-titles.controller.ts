import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';

@ApiTags('public verification')
@Controller('public/titles')
export class PublicTitlesController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get()
  @ApiOperation({ summary: 'List public verified land title summaries (privacy-preserving)' })
  list() {
    return this.blockchainService.listPublicTitles();
  }

  @Get('tx/:txHash')
  @ApiOperation({ summary: 'Verify a blockchain transaction hash on Polygon Amoy' })
  verifyTx(@Param('txHash') txHash: string) {
    return this.blockchainService.verifyTxHash(txHash);
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Verify an issued land title by token ID (public non-PII fields only)' })
  verify(@Param('tokenId') tokenId: string) {
    return this.blockchainService.verifyPublicTitle(tokenId);
  }
}
