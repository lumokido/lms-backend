import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = this.db.findUserByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = bcrypt.compareSync(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async getProfile(userId: string) {
    const user = this.db.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  }
}
