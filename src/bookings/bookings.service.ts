import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
      where: { userId },
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
      orderBy: { bookingDate: 'desc' },
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

      const outboundSegment = booking.flightSegments.find((s) => !s.isReturn);
      const returnSegment = booking.flightSegments.find((s) => s.isReturn);

      return {
        id: booking.id,
        flightNumber: outboundSegment.flight.flightNumber,
        from: outboundSegment.flight.departureAirport.code,
        to: outboundSegment.flight.arrivalAirport.code,
        departureDate: outboundSegment.flight.departureTime.toISOString(),
        returnDate: returnSegment?.flight.arrivalTime.toISOString(),
        passengers,
        cabinClass: outboundSegment.cabinClass.toLowerCase() as
          | 'economy'
          | 'premium'
          | 'business'
          | 'first',
        status: booking.status.toLowerCase() as 'confirmed' | 'cancelled',
        price: booking.totalAmount,
        bookingDate: booking.bookingDate.toISOString(),
        ticketUrl: outboundSegment.ticketUrl ?? '',
        returnTicketUrl: returnSegment?.ticketUrl,
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
    const {
      passengers,
      totalAmount,
      paymentMethodId,
      flightSegments,
      isRoundTrip,
    } = createBookingDto;

    // Validate flights
    for (const segment of flightSegments) {
      const flight = await this.flightsService.getFlight(segment.flightId);
      if (!flight) {
        throw new Error(`Flight with ID ${segment.flightId} not found`);
      }
    }

    try {
      const booking = await this.prisma.$transaction(async (prisma) => {
        // Create booking with segments (ticketUrl will be added later)
        return await prisma.booking.create({
          data: {
            userId,
            totalAmount,
            status: BookingStatus.CONFIRMED,
            paymentStatus: 'COMPLETED',
            paymentMethodId,
            flightSegments: {
              create: flightSegments.map((segment) => ({
                flightId: segment.flightId,
                cabinClass: segment.cabinClass,
                fareAmount: segment.fareAmount,
                isReturn: segment.isReturn || false,
              })),
            },
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
      });

      // Handle ticket generation and emails
      if (isRoundTrip && flightSegments.length === 2) {
        const [outboundSegment, returnSegment] = booking.flightSegments;

        // Generate and store tickets for each segment
        const outboundTicketUrl =
          await this.ticketService.generateAndStoreTicket(
            booking.id,
            outboundSegment.id,
          );
        const returnTicketUrl = await this.ticketService.generateAndStoreTicket(
          booking.id,
          returnSegment.id,
        );

        // Send confirmation emails
        const userName =
          `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() ||
          'Valued Customer';

        // Outbound email
        await this.emailService.sendBookingConfirmation(
          booking.user.email,
          userName,
          {
            ...booking,
            flightSegments: [outboundSegment],
            ticketUrl: outboundTicketUrl,
          },
          outboundTicketUrl,
        );

        // Return email
        await this.emailService.sendBookingConfirmation(
          booking.user.email,
          userName,
          {
            ...booking,
            flightSegments: [returnSegment],
            ticketUrl: returnTicketUrl,
          },
          returnTicketUrl,
        );
      } else {
        // Single flight
        const segment = booking.flightSegments[0];
        const ticketUrl = await this.ticketService.generateAndStoreTicket(
          booking.id,
          segment.id,
        );

        const userName =
          `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() ||
          'Valued Customer';
        await this.emailService.sendBookingConfirmation(
          booking.user.email,
          userName,
          {
            ...booking,
            ticketUrl,
          },
          ticketUrl,
        );
      }

      // Return the updated booking with ticket URLs
      return await this.prisma.booking.findUnique({
        where: { id: booking.id },
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
        const changes = {
          passengers: [],
        };

        // Transaction to ensure data consistency
        await this.prisma.$transaction(async (prisma) => {
          // Update each passenger
          for (const passengerData of passengers) {
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
              continue;
            }

            changes.passengers.push({
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
            });

            await prisma.passenger.update({
              where: { id: passengerData.id },
              data: {
                firstName: passengerData.firstName,
                lastName: passengerData.lastName,
                nationality: passengerData.nationality,
                ...(passengerData.type && {
                  passengerType: passengerData.type,
                }),
              },
            });
          }

          // Fetch the updated booking
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

        // Regenerate tickets for all segments with updated passenger info
        this.logger.log(`Regenerating tickets for updated booking: ${id}`);

        const updatePromises = updatedBooking.flightSegments.map(
          async (segment) => {
            const ticketUrl = await this.ticketService.generateAndStoreTicket(
              id,
              segment.id,
            );
            return this.prisma.flightSegment.update({
              where: { id: segment.id },
              data: { ticketUrl },
            });
          },
        );

        await Promise.all(updatePromises);

        // Get the final updated booking
        const finalBooking = await this.prisma.booking.findUnique({
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

        // Send booking update email with the first segment's ticket
        const firstSegment = finalBooking.flightSegments[0];
        this.logger.log(`Sending booking update email for booking: ${id}`);
        const userName =
          `${finalBooking.user.firstName || ''} ${finalBooking.user.lastName || ''}`.trim() ||
          'Valued Customer';

        await this.emailService.sendBookingUpdate(
          finalBooking.user.email,
          userName,
          finalBooking,
          changes,
          firstSegment.ticketUrl,
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
}
