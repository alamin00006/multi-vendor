// src/product-attribute-value/dto/bulk-create-attribute-value.dto.ts
import { IsArray, IsNotEmpty, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductAttributeValueDto } from './create-product-attribute-value.dto';

export class BulkCreateAttributeValueDto {
  @IsUUID()
  @IsNotEmpty()
  attributeId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductAttributeValueDto)
  values: Omit<CreateProductAttributeValueDto, 'attributeId'>[];
}
