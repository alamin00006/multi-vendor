import { IsNumber, IsPositive, Max, Min } from 'class-validator';

export class CreateCommissionSettingDto {
  @IsNumber()
  @IsPositive()
  @Min(0)
  @Max(100)
  commission: number;
}
