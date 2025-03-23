import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from 'src/gaurds/auth.gaurd';

@Module({
  providers: [AuthService, SupabaseService, PrismaService, AuthGuard],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
