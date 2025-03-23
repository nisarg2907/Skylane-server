import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, PrismaService],
  exports: [FlightsService],
})
export class FlightsModule {}
