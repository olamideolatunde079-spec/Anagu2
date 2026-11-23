import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';

@ApiTags('public verification')
@Controller('public/titles')
export class PublicTitlesController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get()
  @ApiOperation({ summary: 'List recorded title parcels for public exploration' })
  list() {
    return this.blockchainService.listPublicTitles();
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Verify an issued title against the configured NFT contract' })
  verify(@Param('tokenId') tokenId: string) {
    return this.blockchainService.verifyPublicTitle(tokenId);
  }
}
