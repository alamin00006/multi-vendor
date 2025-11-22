// src/product-attribute-value/dto/create-product-attribute-value.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductAttributeValueDto {
  @IsUUID()
  @IsNotEmpty()
  attributeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayValue: string;

  @IsString()
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color code must be a valid hex color (e.g., #FF0000 or #f00)',
  })
  colorCode?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  sortOrder?: number;
}
