import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { EvaluationService } from './evaluation.service';
import { BaselineSimulatorService } from './baseline-simulator.service';

@ApiTags('evaluation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evaluation')
export class EvaluationController {
  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly baselineService: BaselineSimulatorService,
  ) {}

  /**
   * POST /api/v1/evaluation/baseline
   * Run the paper-based baseline simulator for comparison.
   */
  @Post('baseline')
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.GOVERNOR)
  @ApiOperation({ summary: 'Run baseline (paper-process) simulator — Component 4' })
  async runBaseline(@Body() application: Record<string, unknown>) {
    return this.baselineService.processApplication(application as any);
  }
}
