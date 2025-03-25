import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlightsModule } from '../flights/flights.module';
import { AuthModule } from 'src/auth/auth.module';
import { TicketModule } from 'src/ticket/ticket.module';
import { EmailModule } from 'src/email/email.module';
import { SseModule } from 'src/sse/sse.module';

@Module({
  imports: [FlightsModule, AuthModule, TicketModule, EmailModule, SseModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
})
export class BookingsModule {}
