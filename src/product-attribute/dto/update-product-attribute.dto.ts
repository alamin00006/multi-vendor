// src/product-attribute/dto/update-product-attribute.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductAttributeDto } from './create-product-attribute.dto';

export class UpdateProductAttributeDto extends PartialType(
  CreateProductAttributeDto,
) {}
