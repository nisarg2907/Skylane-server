// bookings.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/gaurds/auth.gaurd';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookings for authenticated user' })
  async getUserBookings(@Request() req) {
    const userId = req.user.id;
    return this.bookingsService.getUserBookings(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async getBooking(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.bookingsService.getBooking(id, userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new booking' })
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.bookingsService.createBooking(createBookingDto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async updateBooking(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.bookingsService.updateBooking(id, updateBookingDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  async cancelBooking(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.bookingsService.cancelBooking(id, userId);
  }
}
