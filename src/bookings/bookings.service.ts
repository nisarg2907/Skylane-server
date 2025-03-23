import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, FlightSegmentDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus, PassengerType } from '@prisma/client';
import { FlightsService } from '../flights/flights.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private flightsService: FlightsService,
  ) {}
  async getUserBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
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

    return bookings.map((booking) => {
      const passengers = {
        adult: booking.passengers.filter(
          (p) => p.passengerType === PassengerType.ADULT,
        ).length,
        child: booking.passengers.filter(
          (p) => p.passengerType === PassengerType.CHILD,
        ).length,
        infant: booking.passengers.filter(
          (p) => p.passengerType === PassengerType.INFANT,
        ).length,
      };

      const flightSegment = booking.flightSegments[0]; // Assuming one flight segment for simplicity

      return {
        id: booking.id,
        flightNumber: flightSegment.flight.flightNumber,
        from: flightSegment.flight.departureAirport.code,
        to: flightSegment.flight.arrivalAirport.code,
        departureDate: flightSegment.flight.departureTime.toISOString(),
        returnDate: flightSegment.isReturn
          ? flightSegment.flight.arrivalTime.toISOString()
          : undefined,
        passengers,
        cabinClass: flightSegment.cabinClass.toLowerCase() as
          | 'economy'
          | 'premium'
          | 'business'
          | 'first',
        status: booking.status.toLowerCase() as 'confirmed' | 'cancelled',
        price: booking.totalAmount,
        bookingDate: booking.bookingDate.toISOString(),
      };
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
    const { passengers, totalAmount } = createBookingDto;

    // Handle both formats: either flightSegments array or single flightId/cabinClass
    let flightSegments: FlightSegmentDto[] = [];

    if (
      createBookingDto.flightSegments &&
      createBookingDto.flightSegments.length > 0
    ) {
      flightSegments = createBookingDto.flightSegments;
    } else if (createBookingDto.flightId && createBookingDto.cabinClass) {
      // Convert old format to new format
      flightSegments = [
        {
          flightId: createBookingDto.flightId,
          cabinClass: createBookingDto.cabinClass,
          fareAmount: totalAmount, // Assuming the total is the fare for this flight
          isReturn: false,
        },
      ];
    } else {
      throw new Error(
        'Either flightSegments array or flightId with cabinClass must be provided',
      );
    }

    // Validate that all flights exist
    for (const segment of flightSegments) {
      const flight = await this.flightsService.getFlight(segment.flightId);
      if (!flight) {
        throw new Error(`Flight with ID ${segment.flightId} not found`);
      }
    }

    // Create the booking with a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Create booking record
      const booking = await prisma.booking.create({
        data: {
          userId,
          totalAmount,
          status: BookingStatus.CONFIRMED,
          paymentStatus: 'COMPLETED',

          // Create flight segments
          flightSegments: {
            create: flightSegments.map((segment) => ({
              flightId: segment.flightId,
              cabinClass: segment.cabinClass,
              fareAmount: segment.fareAmount || totalAmount, // Fallback to total amount if not provided
              isReturn: segment.isReturn || false,
            })),
          },

          // Create passenger records with support for both type and passengerType
          passengers: {
            create: passengers.map((passenger) => ({
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              dateOfBirth: passenger.dateOfBirth,
              nationality: passenger.nationality,
              passportNumber: passenger.passportNumber,
              passportExpiry: passenger.passportExpiry,
              passengerType: passenger.type || PassengerType.ADULT,
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
                passengerType: passenger.type,
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
