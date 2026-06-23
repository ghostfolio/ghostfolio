import { IsString } from 'class-validator';

import { CreateBudgetDto } from './create-budget.dto';

export class UpdateBudgetDto extends CreateBudgetDto {
  @IsString()
  id: string;
}
