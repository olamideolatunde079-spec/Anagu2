import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { MarketplaceService } from './marketplace.service';
import {
  CreateListingDto,
  PurchaseListingDto,
  SettleTransferDto,
  UpdateListingStatusDto,
} from './dto/marketplace.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('listings')
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'lga', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'Browse active NFT-verified land listings (public non-PII summary)' })
  listPublic(
    @Query('state') state?: string,
    @Query('lga') lga?: string,
    @Query('status') status?: string,
  ) {
    return this.marketplaceService.listPublicListings({ state, lga, status });
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get verified marketplace listing details' })
  getListing(@Param('id') id: string) {
    return this.marketplaceService.getListingById(id);
  }

  @Post('listings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Create a marketplace listing for a verified non-revoked land title' })
  createListing(@Body() dto: CreateListingDto, @Request() req: any) {
    return this.marketplaceService.createListing(dto, req.user.id, req.user.role);
  }

  @Patch('listings/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update listing status (seller or admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
    @Request() req: any,
  ) {
    return this.marketplaceService.updateListingStatus(id, dto, req.user.id, req.user.role);
  }

  @Post('listings/:id/purchase')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Initiate escrow purchase on an active verified listing' })
  purchase(
    @Param('id') id: string,
    @Body() dto: PurchaseListingDto,
    @Request() req: any,
  ) {
    return this.marketplaceService.initiatePurchase(id, dto, req.user.id);
  }

  @Get('transfers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'List land transfers (own for citizens; all for oversight roles)' })
  listTransfers(@Request() req: any) {
    return this.marketplaceService.listTransfers(req.user.id, req.user.role);
  }

  @Patch('transfers/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Approve land transfer for settlement (Registrar only)' })
  approveTransfer(@Param('id') id: string, @Request() req: any) {
    return this.marketplaceService.approveTransfer(id, req.user.id);
  }

  @Patch('transfers/:id/settle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Settle land transfer, collect commission, and record ownership transfer (Registrar only)' })
  settleTransfer(
    @Param('id') id: string,
    @Body() dto: SettleTransferDto,
    @Request() req: any,
  ) {
    return this.marketplaceService.settleTransfer(id, dto, req.user.id);
  }
}
