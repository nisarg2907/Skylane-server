import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus } from '@prisma/client';
import { FlightsService } from '../flights/flights.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private flightsService: FlightsService,
  ) {}

  async getUserBookings(userId: string): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        passengers: true,
        flightSegments: {
          include: {
            flight: {
              include: {
                airline: true,
                departureAirport: true,
                arrivalAirport: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookingDate: 'desc',
      },
    });
  }

  async getBooking(id: string, userId: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        passengers: true,
        flightSegments: {
          include: {
            flight: {
              include: {
                airline: true,
                departureAirport: true,
                arrivalAirport: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Ensure the booking belongs to the authenticated user
    if (booking.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this booking',
      );
    }

    return booking;
  }

  async createBooking(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<Booking> {
    const { flightSegments, passengers, totalAmount } = createBookingDto;

    // Validate that all flights exist
    for (const segment of flightSegments) {
      await this.flightsService.getFlight(segment.flightId);
    }

    // Create the booking with a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Create booking record
      const booking = await prisma.booking.create({
        data: {
          userId,
          totalAmount,
          status: BookingStatus.PENDING,
          paymentStatus: 'PENDING', // Assuming payment will be handled separately

          // Create flight segments
          flightSegments: {
            create: flightSegments.map((segment) => ({
              flightId: segment.flightId,
              cabinClass: segment.cabinClass,
              fareAmount: segment.fareAmount,
              isReturn: segment.isReturn || false,
            })),
          },

          // Create passenger records
          passengers: {
            create: passengers.map((passenger) => ({
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              dateOfBirth: passenger.dateOfBirth,
              nationality: passenger.nationality,
              passportNumber: passenger.passportNumber,
              passportExpiry: passenger.passportExpiry,
              passengerType: passenger.passengerType,
            })),
          },
        },
        include: {
          passengers: true,
          flightSegments: {
            include: {
              flight: true,
            },
          },
        },
      });

      // After successful booking, we could add logic to:
      // 1. Update flight seat availability (if you're tracking inventory)
      // 2. Send confirmation email
      // 3. Generate e-ticket

      return booking;
    });
  }

  async updateBooking(
    id: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
  ): Promise<Booking> {
    // First check if booking exists and belongs to user
    const existingBooking = await this.getBooking(id, userId);

    // Prevent updating if booking is already cancelled or completed
    if (
      existingBooking.status === BookingStatus.CANCELLED ||
      existingBooking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot update booking with status ${existingBooking.status}`,
      );
    }

    // Extract updateable fields
    const { passengers } = updateBookingDto;

    // For now, we only allow updating passenger information
    if (passengers && passengers.length > 0) {
      // Transaction to ensure consistent data
      return this.prisma.$transaction(async (prisma) => {
        // Delete existing passengers
        await prisma.passenger.deleteMany({
          where: { bookingId: id },
        });

        // Create new passenger records
        const updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            passengers: {
              create: passengers.map((passenger) => ({
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                dateOfBirth: passenger.dateOfBirth,
                nationality: passenger.nationality,
                passportNumber: passenger.passportNumber,
                passportExpiry: passenger.passportExpiry,
                passengerType: passenger.passengerType,
              })),
            },
            updatedAt: new Date(),
          },
          include: {
            passengers: true,
            flightSegments: {
              include: {
                flight: {
                  include: {
                    airline: true,
                    departureAirport: true,
                    arrivalAirport: true,
                  },
                },
              },
            },
          },
        });

        return updatedBooking;
      });
    }

    // If no changes provided, return the existing booking
    return existingBooking;
  }

  async cancelBooking(id: string, userId: string): Promise<Booking> {
    // First check if booking exists and belongs to user
    const existingBooking = await this.getBooking(id, userId);

    // Prevent cancelling if booking is already cancelled or completed
    if (existingBooking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (existingBooking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Update booking status to CANCELLED
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        updatedAt: new Date(),
      },
      include: {
        passengers: true,
        flightSegments: {
          include: {
            flight: {
              include: {
                airline: true,
                departureAirport: true,
                arrivalAirport: true,
              },
            },
          },
        },
      },
    });
  }
}
