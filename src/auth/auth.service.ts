import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Tu cuenta está desactivada. Contacta al administrador.');
    }

    const payload = { 
      username: user.username, 
      sub: user.id, 
      type: user.type 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
      first_login: !user.hasChangedDefaultPassword
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    
    // Buscar usuario por email
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token hasheado en la base de datos
    const hashedToken = await bcrypt.hash(resetToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: resetTokenExpiry,
      },
    });

    // Enviar email
    try {
      await this.emailService.sendResetPasswordEmail(
        email,
        resetToken,
        `${user.firstName} ${user.lastName}`,
      );
    } catch (error) {
      console.error('Error sending reset password email:', error);
      throw new BadRequestException('No se pudo enviar el correo de recuperación');
    }

    return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // Buscar usuarios con token válido
    const users = await this.prisma.user.findMany({
      where: {
        resetPasswordExpires: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        resetPasswordToken: true,
        resetPasswordExpires: true,
      },
    });

    let matchedUser = null;
    for (const user of users) {
      if (user.resetPasswordToken && await bcrypt.compare(token, user.resetPasswordToken)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
