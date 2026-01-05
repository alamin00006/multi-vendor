import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaErrorHandler } from './prisma/prisma-error.utils';
import { SocketService } from './socket.service';

// Feature Modules

import { UserModule } from './user/user.module';
import { VendorModule } from './vendor/vendor.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { ReviewModule } from './review/review.module';
import { ProductAttributeModule } from './product-attribute/product-attribute.module';
import { ProductAttributeValueModule } from './product-attribute-value/product-attribute-value.module';
import { ProductVariantModule } from './product-variant/product-variant.module';
import { ProductImageModule } from './product-image/product-image.module';
import { UserAddressModule } from './user-address/user-address.module';
import { VendorPayoutModule } from './vendor-payout/vendor-payout.module';
import { CommissionSettingModule } from './commission-setting/commission-setting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // LoggerModule ,
    PrismaModule,
    UserModule,
    VendorModule,
    ProductModule,
    CategoryModule,
    BrandModule,
    ReviewModule,
    ProductAttributeModule,
    ProductAttributeValueModule,
    ProductVariantModule,
    ProductImageModule,
    UserAddressModule,
    VendorPayoutModule,
    CommissionSettingModule,
  ],
  providers: [SocketService, PrismaErrorHandler],
  exports: [SocketService, PrismaErrorHandler],
})
export class AppModule {}
