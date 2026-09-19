import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy, JWT_SECRET } from './jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AdminGuard } from './guards/roles.guard.js';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AdminGuard],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
