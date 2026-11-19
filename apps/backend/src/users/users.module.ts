import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { AccountVerification } from './entities/account-verification.entity';
import { Permission, Role, UserRoleAssignment } from './entities/rbac.entity';
import { Institution, StaffProfile } from './entities/staff.entity';
import { Jurisdiction, Lga, State } from './entities/jurisdiction.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JurisdictionsController } from './jurisdictions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AccountVerification,
      Role,
      Permission,
      UserRoleAssignment,
      Institution,
      StaffProfile,
      State,
      Lga,
      Jurisdiction,
    ]),
  ],
  providers: [UsersService],
  controllers: [UsersController, JurisdictionsController],
  exports: [UsersService],
})
export class UsersModule {}
