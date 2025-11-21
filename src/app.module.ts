import { Module } from '@nestjs/common';
// import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

import { PrismaErrorHandler } from './prisma/prisma-error.utils';
import { SocketService } from './socket.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    // UserModule,
  ],
  providers: [
    SocketService,
    PrismaErrorHandler, // Add PrismaErrorHandler to providers
  ],
  exports: [
    SocketService,
    PrismaErrorHandler, // Now it can be exported
  ],
})
export class AppModule {}

// import { Module } from '@nestjs/common';

// import { UserModule } from './user/user.module';
// import { ConfigModule } from '@nestjs/config';
// import { SocketService } from './socket.service';
// import { PrismaModule } from './prisma/prisma.module';
// import { RoleModule } from './role/role.module';
// import { BranchModule } from './branch/branch.module';
// import { PrismaErrorHandler } from './prisma/prisma-error.utils';

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
//     PrismaModule,
//     UserModule,
//     RoleModule,
//     BranchModule,
//   ],
//   // controllers: [AppController],
//   providers: [SocketService],
//   exports: [PrismaErrorHandler],
// })
// export class AppModule {}
