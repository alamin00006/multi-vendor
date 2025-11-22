// src/product-variant/dto/update-product-variant.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductVariantDto } from './create-product-variant.dto';

export class UpdateProductVariantDto extends PartialType(
  CreateProductVariantDto,
) {}
