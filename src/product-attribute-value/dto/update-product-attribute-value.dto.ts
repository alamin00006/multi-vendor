// src/product-attribute-value/dto/update-product-attribute-value.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductAttributeValueDto } from './create-product-attribute-value.dto';

export class UpdateProductAttributeValueDto extends PartialType(
  CreateProductAttributeValueDto,
) {}
