import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber } from 'class-validator';

export class RevokeTitleDto {
  @ApiProperty({
    enum: [0, 1],
    description: '0 = OverridingPublicInterest (LUA 1978 s.28), 1 = BreachOfStatutoryCondition',
  })
  @IsNumber()
  @IsIn([0, 1])
  ground: 0 | 1;
}
