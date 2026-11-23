import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('jurisdictions')
@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(private readonly usersService: UsersService) {}

  @Get('states')
  @ApiOperation({ summary: 'List Nigerian states configured in the ANAGU registry' })
  listStates() {
    return this.usersService.listStates();
  }

  @Get('states/:stateId/lgas')
  @ApiOperation({ summary: 'List Local Government Areas (LGAs) for a state' })
  listLgasByState(@Param('stateId') stateId: string) {
    return this.usersService.listLgasByState(stateId);
  }

  @Get()
  @ApiOperation({ summary: 'List active cadastral & ministry jurisdictions' })
  listJurisdictions() {
    return this.usersService.listJurisdictions();
  }
}
