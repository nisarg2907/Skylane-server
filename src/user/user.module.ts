import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { EcryptionModule } from 'src/ecryption/ecryption.module';

@Module({
  imports: [PrismaModule, SupabaseModule, EcryptionModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
