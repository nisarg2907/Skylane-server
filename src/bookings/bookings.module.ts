import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlightsModule } from '../flights/flights.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [FlightsModule, AuthModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
})
export class BookingsModule {}
