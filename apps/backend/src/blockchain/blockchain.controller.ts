import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { BlockchainService } from './blockchain.service';
import { IssueTitleDto } from './dto/issue-title.dto';
import { RevokeTitleDto } from './dto/revoke-title.dto';
import { TransferTitleDto } from './dto/transfer-title.dto';

@ApiTags('titles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('titles')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get()
  @ApiOperation({ summary: 'List NFT land titles (own for citizens; all for oversight roles)' })
  list(@Request() req: any) {
    return this.blockchainService.listTitles(req.user.id, req.user.role);
  }

  @Post('issue')
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Issue a new NFT land title on Polygon Amoy (Registrar only)' })
  async issueTitle(@Body() dto: IssueTitleDto, @Request() req: any) {
    return this.blockchainService.issueTitle({
      ...dto,
      ownerUserId: req.user?.id,
      registrarUserId: req.user?.id,
    });
  }

  @Post(':tokenId/transfer')
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Execute Registrar-authorized land title transfer on Polygon Amoy' })
  async transferTitle(
    @Param('tokenId') tokenId: string,
    @Body() dto: TransferTitleDto,
    @Request() req: any,
  ) {
    return this.blockchainService.transferTitle({
      tokenId,
      toAddress: dto.toAddress,
      toUserId: dto.toUserId,
      deedReference: dto.deedReference,
      registrarUserId: req.user.id,
    });
  }

  @Post(':tokenId/revoke')
  @Roles(UserRole.GOVERNOR)
  @ApiOperation({
    summary: 'Statutory revocation of a land title (Governor only — Nigeria Land Use Act 1978, s.28)',
  })
  async revokeTitle(
    @Param('tokenId') tokenId: string,
    @Body() dto: RevokeTitleDto,
    @Request() req: any,
  ) {
    return this.blockchainService.revokeTitle({
      tokenId,
      ground: dto.ground,
      requestedBy: req.user.id,
    });
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Get land title by token ID' })
  async getTitle(@Param('tokenId') tokenId: string, @Request() req: any) {
    return this.blockchainService.getTitleByTokenId(tokenId, req.user.id, req.user.role);
  }

  @Get(':tokenId/transactions')
  @ApiOperation({ summary: 'Get Polygon Amoy transaction & ownership ledger for a title' })
  async getTransactions(@Param('tokenId') tokenId: string) {
    return this.blockchainService.getTitleTransactions(tokenId);
  }

  @Get('tx/:txHash/verify')
  @ApiOperation({ summary: 'Verify a Polygon Amoy transaction hash against registry and RPC' })
  async verifyTx(@Param('txHash') txHash: string) {
    return this.blockchainService.verifyTxHash(txHash);
  }
}
