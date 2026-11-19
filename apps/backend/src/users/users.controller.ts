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
import { UsersService } from './users.service';
import {
  CreateStaffProfileDto,
  ReviewVerificationDto,
  SubmitVerificationDto,
  UpdateProfileDto,
  UpdateUserRoleDto,
} from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile, KYC verifications, and staff info' })
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Post('me/verification')
  @ApiOperation({ summary: 'Submit identity / KYC / surveyor license verification' })
  submitVerification(@Request() req: any, @Body() dto: SubmitVerificationDto) {
    return this.usersService.submitVerification(req.user.id, dto);
  }

  @Get()
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.REGISTRAR, UserRole.GOVERNOR)
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiOperation({ summary: 'List registered users (institutional/admin roles only)' })
  listUsers(@Query('role') role?: UserRole) {
    return this.usersService.listUsers(role);
  }

  @Patch('verifications/:verificationId')
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.REGISTRAR)
  @ApiOperation({ summary: 'Review and verify/reject a user KYC verification request' })
  reviewVerification(
    @Param('verificationId') verificationId: string,
    @Body() dto: ReviewVerificationDto,
    @Request() req: any,
  ) {
    return this.usersService.reviewVerification(
      verificationId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/role')
  @Roles(UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Assign user operational role (Administrator only; does not grant statutory land approvals)' })
  updateUserRole(
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    return this.usersService.updateUserRole(targetUserId, dto, req.user.id);
  }

  @Get('staff')
  @Roles(UserRole.LAND_ADMINISTRATOR, UserRole.REGISTRAR, UserRole.GOVERNOR)
  @ApiOperation({ summary: 'List institutional staff profiles and institutions' })
  listStaff() {
    return this.usersService.listStaff();
  }

  @Post('staff')
  @Roles(UserRole.LAND_ADMINISTRATOR)
  @ApiOperation({ summary: 'Register institutional staff profile' })
  createStaff(@Body() dto: CreateStaffProfileDto, @Request() req: any) {
    return this.usersService.createStaffProfile(dto, req.user.id);
  }
}
