import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipVerificationService } from './ownership-verification.service';
import { VerifyOwnershipDto } from './dto/verify-ownership.dto';
import { MockRegistryAdapter } from './adapters/mock-registry.adapter';

@ApiTags('oracle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('oracle')
export class OracleController {
  constructor(
    private readonly oracleService: OwnershipVerificationService,
    private readonly registryAdapter: MockRegistryAdapter,
  ) {}

  /**
   * POST /api/v1/oracle/verify
   * Component 3A — Ownership verification entry point.
   */
  @Post('verify')
  @ApiOperation({
    summary: 'Verify land ownership against institutional and community sources',
    description:
      'Step 2 of the registration pipeline. Cross-checks submitted ownership info ' +
      'against institutional registry (NIN, survey plan) and community witnesses. ' +
      'Match/conflict criteria documented in PROJECT.md Section 10.',
  })
  async verify(@Body() dto: VerifyOwnershipDto) {
    // Map DTO (undefined-safe) to service interface (null-safe)
    return this.oracleService.verify(
      {
        applicationId:      dto.applicationId,
        ownerName:          dto.ownerName,
        nationalId:         dto.nationalId,
        surveyPlanNumber:   dto.surveyPlanNumber,
        communityWitnesses: dto.communityWitnesses,
        legalClearanceHash: dto.legalClearanceHash ?? null,
        documents:          dto.documents ?? [],
      },
      this.registryAdapter,
    );
  }
}
