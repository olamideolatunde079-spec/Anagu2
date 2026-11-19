import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { OwnershipVerificationService } from './ownership-verification.service';
import { VerifyOwnershipDto } from './dto/verify-ownership.dto';
import { MockRegistryAdapter } from './adapters/mock-registry.adapter';
import { AttestationService } from './attestation.service';
import { CreateAttestationDto } from './dto/attestation.dto';

@ApiTags('oracle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('oracle')
export class OracleController {
  constructor(
    private readonly oracleService: OwnershipVerificationService,
    private readonly registryAdapter: MockRegistryAdapter,
    private readonly attestationService: AttestationService,
  ) {}

  @Post('verify')
  @ApiOperation({
    summary: 'Verify land ownership against institutional and community sources',
    description:
      'Step 2 of the registration pipeline. Cross-checks submitted ownership info ' +
      'against institutional registry (NIN, survey plan) and community witnesses.',
  })
  async verify(@Body() dto: VerifyOwnershipDto, @Request() req: any) {
    const result = await this.oracleService.verify(
      {
        applicationId: dto.applicationId,
        ownerName: dto.ownerName,
        nationalId: dto.nationalId,
        surveyPlanNumber: dto.surveyPlanNumber,
        communityWitnesses: dto.communityWitnesses,
        legalClearanceHash: dto.legalClearanceHash ?? null,
        documents: dto.documents ?? [],
      },
      this.registryAdapter,
    );

    await this.attestationService.syncApplicationOwnershipStatus(
      dto.applicationId,
      result.outcome,
      req.user.id,
      req.user.role,
    );

    return result;
  }

  @Post('attestations')
  @Roles(UserRole.CITIZEN, UserRole.SURVEYOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Submit a community elder, neighbor, surveyor, or institutional attestation' })
  async createAttestation(@Body() dto: CreateAttestationDto, @Request() req: any) {
    return this.attestationService.createAttestation(dto, req.user.id, req.user.role);
  }

  @Get('attestations/:applicationId')
  @ApiOperation({ summary: 'List attestations recorded for an application' })
  async listAttestations(@Param('applicationId') applicationId: string, @Request() req: any) {
    return this.attestationService.listByApplication(applicationId, req.user.id, req.user.role);
  }
}
