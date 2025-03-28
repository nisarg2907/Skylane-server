import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { FlightsModule } from './flights/flights.module';
import { BookingsModule } from './bookings/bookings.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TicketService } from './ticket/ticket.service';
import { TicketModule } from './ticket/ticket.module';
import { EmailService } from './email/email.service';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { EcryptionModule } from './ecryption/ecryption.module';
import { EncryptionService } from './encryption/encryption.service';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    FlightsModule,
    BookingsModule,
    SupabaseModule,
    TicketModule,
    EmailModule,
    UserModule,
    EcryptionModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService, TicketService, EmailService, EncryptionService],
})
export class AppModule {}
