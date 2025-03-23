import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService, SupabaseService, PrismaService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
