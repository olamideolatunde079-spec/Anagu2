import { Body, Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { BlockchainService } from './blockchain.service';
import { IssueTitleDto } from './dto/issue-title.dto';
import { RevokeTitleDto } from './dto/revoke-title.dto';

@ApiTags('titles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('titles')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('issue')
  @Roles(UserRole.REGISTRAR, UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Issue a new NFT land title (Component 2B)' })
  async issueTitle(@Body() dto: IssueTitleDto, @Request() req: any) {
    return this.blockchainService.issueTitle({ ...dto, ownerUserId: req.user?.id });
  }

  @Post(':tokenId/revoke')
  @Roles(UserRole.GOVERNOR)
  @ApiOperation({
    summary: 'Statutory revocation of a land title (Component 2C)',
    description:
      'Governor-role only. Ground 0 = OverridingPublicInterest, ' +
      '1 = BreachOfStatutoryCondition. Nigeria Land Use Act 1978, s.28.',
  })
  async revokeTitle(
    @Param('tokenId') tokenId: string,
    @Body() dto: RevokeTitleDto,
    @Request() req: any,
  ) {
    return this.blockchainService.revokeTitle({
      tokenId,
      ground:         dto.ground,
      requestedBy:    req.user.id,
    });
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Get land title by token ID' })
  async getTitle(@Param('tokenId') tokenId: string) {
    return this.blockchainService.getTitleByTokenId(tokenId);
  }
}
