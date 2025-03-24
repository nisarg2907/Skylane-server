import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, FlightSegmentDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus, PassengerType } from '@prisma/client';
import { FlightsService } from 'src/flights/flights.service';
import { EmailService } from 'src/email/email.service';
import { TicketService } from 'src/ticket/ticket.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private flightsService: FlightsService,
    private emailService: EmailService,
    private ticketService: TicketService,
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

      const flightSegment = booking.flightSegments[0];

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
        ticketUrl: booking.ticketUrl ?? '',
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
    try {
      const booking = await this.prisma.$transaction(async (prisma) => {
        // Create booking record
        const newBooking = await prisma.booking.create({
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
                flight: {
                  include: {
                    airline: true,
                    departureAirport: true,
                    arrivalAirport: true,
                  },
                },
              },
            },
            user: true,
          },
        });

        return newBooking;
      });

      // Generate ticket PDF and get URL
      this.logger.log(`Generating ticket for booking: ${booking.id}`);
      const ticketUrl = await this.ticketService.generateAndStoreTicket(
        booking.id,
      );
      console.log('ticket url', ticketUrl);

      // Send confirmation email
      this.logger.log(
        `Sending booking confirmation email for booking: ${booking.id}`,
      );
      const userName =
        `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() ||
        'Valued Customer';
      await this.emailService.sendBookingConfirmation(
        booking.user.email,
        userName,
        booking,
        ticketUrl,
      );

      return booking;
    } catch (error) {
      this.logger.error(`Error creating booking: ${error.message}`);
      throw error;
    }
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

    // Extract passenger information for update
    const { passengers } = updateBookingDto;

    // If passenger data is provided, update passenger information
    if (passengers && passengers.length > 0) {
      try {
        let updatedBooking;

        // Track changes to report in email
        const changes = {
          passengers: [],
        };

        // Transaction to ensure data consistency
        await this.prisma.$transaction(async (prisma) => {
          // Update each passenger individually instead of deleting and recreating
          for (const passengerData of passengers) {
            // Verify the passenger belongs to this booking
            const existingPassenger = await prisma.passenger.findFirst({
              where: {
                id: passengerData.id,
                bookingId: id,
              },
            });

            if (!existingPassenger) {
              this.logger.warn(
                `Passenger ${passengerData.id} not found in booking ${id} during update`,
              );
              continue; // Skip this passenger
            }

            // Track changes for this passenger
            const passengerChanges = {
              id: passengerData.id,
              oldData: {
                firstName: existingPassenger.firstName,
                lastName: existingPassenger.lastName,
                nationality: existingPassenger.nationality,
                passengerType: existingPassenger.passengerType,
              },
              newData: {
                firstName: passengerData.firstName,
                lastName: passengerData.lastName,
                nationality: passengerData.nationality,
                passengerType:
                  passengerData.type || existingPassenger.passengerType,
              },
            };

            changes.passengers.push(passengerChanges);

            // Update the passenger with new data
            await prisma.passenger.update({
              where: { id: passengerData.id },
              data: {
                firstName: passengerData.firstName,
                lastName: passengerData.lastName,
                nationality: passengerData.nationality,
                // Only update type if provided
                ...(passengerData.type && {
                  passengerType: passengerData.type,
                }),
              },
            });
          }

          // Fetch the updated booking with all related data
          updatedBooking = await prisma.booking.findUnique({
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
              user: true,
            },
          });

          return updatedBooking;
        });

        // Regenerate ticket with updated passenger information
        this.logger.log(`Regenerating ticket for updated booking: ${id}`);
        const ticketUrl = await this.ticketService.generateAndStoreTicket(id);
        // Note: The old ticket is already being deleted in the generateAndStoreTicket method

        // Update the booking record with the new ticket URL
        const finalBooking = await this.prisma.booking.update({
          where: { id },
          data: {
            ticketUrl,
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
            user: true,
          },
        });

        // Send booking update email
        this.logger.log(`Sending booking update email for booking: ${id}`);
        const userName =
          `${finalBooking.user.firstName || ''} ${finalBooking.user.lastName || ''}`.trim() ||
          'Valued Customer';
        await this.emailService.sendBookingUpdate(
          finalBooking.user.email,
          userName,
          finalBooking,
          changes,
          ticketUrl,
        );

        return finalBooking;
      } catch (error) {
        this.logger.error(`Error updating booking: ${error.message}`);
        throw new BadRequestException(
          `Failed to update booking: ${error.message}`,
        );
      }
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

    try {
      // Update booking status to CANCELLED
      const cancelledBooking = await this.prisma.booking.update({
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
          user: true,
        },
      });

      // Send cancellation email
      this.logger.log(`Sending booking cancellation email for booking: ${id}`);
      const userName =
        `${cancelledBooking.user.firstName || ''} ${cancelledBooking.user.lastName || ''}`.trim() ||
        'Valued Customer';
      await this.emailService.sendBookingCancellation(
        cancelledBooking.user.email,
        userName,
        cancelledBooking,
      );

      return cancelledBooking;
    } catch (error) {
      this.logger.error(`Error cancelling booking: ${error.message}`);
      throw error;
    }
  }

  // Optional: Add a method to manually resend confirmation email with ticket
  async resendBookingConfirmation(id: string, userId: string): Promise<void> {
    const booking = await this.getBooking(id, userId);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot resend confirmation for cancelled booking',
      );
    }

    try {
      // Get or regenerate ticket URL
      let ticketUrl = booking.ticketUrl;
      if (!ticketUrl) {
        ticketUrl = await this.ticketService.generateAndStoreTicket(id);
      }

      // Fetch user info
      const user = await this.prisma.user.findUnique({
        where: { authId: booking.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Send email
      const userName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Valued Customer';
      await this.emailService.sendBookingConfirmation(
        user.email,
        userName,
        booking,
        ticketUrl,
      );

      this.logger.log(`Resent booking confirmation email for booking: ${id}`);
    } catch (error) {
      this.logger.error(`Error resending confirmation: ${error.message}`);
      throw error;
    }
  }
}
