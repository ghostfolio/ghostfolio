import { IsString } from 'class-validator';

import { CreateExpenseDto } from './create-expense.dto';

export class UpdateExpenseDto extends CreateExpenseDto {
  @IsString()
  id: string;
}
