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
import {
  Booking,
  BookingStatus,
  CabinClass,
  PassengerType,
} from '@prisma/client';
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

  private async updateFlightSeats(
    flightId: string,
    cabinClass: CabinClass,
    passengerCount: number,
    isAdding: boolean,
  ) {
    const flight = await this.prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      throw new NotFoundException(`Flight with ID ${flightId} not found`);
    }

    // Determine which capacity and price field to update based on cabin class
    let capacityField: string;
    switch (cabinClass) {
      case CabinClass.ECONOMY:
        capacityField = 'economyCapacity';
        break;
      case CabinClass.PREMIUM_ECONOMY:
        capacityField = 'premiumEconomyCapacity';
        break;
      case CabinClass.BUSINESS:
        capacityField = 'businessCapacity';
        break;
      case CabinClass.FIRST:
        capacityField = 'firstClassCapacity';
        break;
      default:
        throw new BadRequestException('Invalid cabin class');
    }

    // Update the capacity
    await this.prisma.flight.update({
      where: { id: flightId },
      data: {
        [capacityField]: isAdding
          ? { increment: passengerCount }
          : { decrement: passengerCount },
      },
    });
  }

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
        outboundFlight: {
          flightNumber: outboundSegment.flight.flightNumber,
          from: outboundSegment.flight.departureAirport.code,
          to: outboundSegment.flight.arrivalAirport.code,
          departureDate: outboundSegment.flight.departureTime.toISOString(),
          cabinClass: outboundSegment.cabinClass.toLowerCase() as
            | 'economy'
            | 'premium'
            | 'business'
            | 'first',
          ticketUrl: outboundSegment.ticketUrl ?? '',
        },
        returnFlight: returnSegment
          ? {
              flightNumber: returnSegment.flight.flightNumber,
              from: returnSegment.flight.departureAirport.code,
              to: returnSegment.flight.arrivalAirport.code,
              departureDate: returnSegment.flight.departureTime.toISOString(),
              cabinClass: returnSegment.cabinClass.toLowerCase() as
                | 'economy'
                | 'premium'
                | 'business'
                | 'first',
              ticketUrl: returnSegment.ticketUrl ?? '',
            }
          : null,
        passengers,
        status: booking.status.toLowerCase() as 'confirmed' | 'cancelled',
        price: booking.totalAmount,
        bookingDate: booking.bookingDate.toISOString(),
      };
    });
  }
  async getBooking(id: string, userId: string) {
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

    const passengers = booking.passengers.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      nationality: p.nationality,
      type: p.passengerType,
    }));

    const outboundSegment = booking.flightSegments.find((s) => !s.isReturn);
    const returnSegment = booking.flightSegments.find((s) => s.isReturn);

    return {
      id: booking.id,
      outboundFlight: {
        flightNumber: outboundSegment.flight.flightNumber,
        from: outboundSegment.flight.departureAirport.code,
        to: outboundSegment.flight.arrivalAirport.code,
        departureDate: outboundSegment.flight.departureTime.toISOString(),
        cabinClass: outboundSegment.cabinClass,
        ticketUrl: outboundSegment.ticketUrl ?? '',
      },
      returnFlight: returnSegment
        ? {
            flightNumber: returnSegment.flight.flightNumber,
            from: returnSegment.flight.departureAirport.code,
            to: returnSegment.flight.arrivalAirport.code,
            departureDate: returnSegment.flight.departureTime.toISOString(),
            cabinClass: returnSegment.cabinClass,
            ticketUrl: returnSegment.ticketUrl ?? '',
          }
        : null,
      passengers,
      status: booking.status.toLowerCase() as 'confirmed' | 'cancelled',
      price: booking.totalAmount,
      bookingDate: booking.bookingDate.toISOString(),
    };
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

    // Validate flights and update seat availability
    for (const segment of flightSegments) {
      await this.updateFlightSeats(
        segment.flightId,
        segment.cabinClass,
        passengers.length,
        false, // removing seats
      );
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
      // Rollback seat updates if booking creation fails
      for (const segment of flightSegments) {
        await this.updateFlightSeats(
          segment.flightId,
          segment.cabinClass,
          passengers.length,
          true, // adding seats back
        );
      }

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
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        id,
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
        user: true,
      },
    });

    if (!existingBooking) {
      throw new NotFoundException('Booking not found');
    }

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
            console.log(
              `Generating and storing ticket for segment: ${segment.id}`,
            );
            const ticketUrl = await this.ticketService.generateAndStoreTicket(
              id,
              segment.id,
            );
            console.log(
              `Updating flight segment with new ticket URL: ${segment.id}`,
            );
            return this.prisma.flightSegment.update({
              where: { id: segment.id },
              data: { ticketUrl },
            });
          },
        );

        this.logger.log(
          `Awaiting all ticket generation and segment updates for booking: ${id}`,
        );
        await Promise.all(updatePromises);
        this.logger.log(
          `All ticket generation and segment updates completed for booking: ${id}`,
        );

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

        // Check if there is a second segment and send a separate email
        if (finalBooking.flightSegments.length > 1) {
          const secondSegment = finalBooking.flightSegments[1];
          this.logger.log(
            `Sending booking update email for second segment of booking: ${id}`,
          );
          await this.emailService.sendBookingUpdate(
            finalBooking.user.email,
            userName,
            finalBooking,
            changes,
            secondSegment.ticketUrl,
          );
        }

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
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        passengers: true,
        flightSegments: {
          include: {
            flight: true,
          },
        },
        user: true,
      },
    });

    if (!existingBooking) {
      throw new NotFoundException('Booking not found');
    }

    // Prevent cancelling if booking is already cancelled or completed
    if (existingBooking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (existingBooking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    try {
      // Update flight seats for each flight segment before cancelling
      for (const segment of existingBooking.flightSegments) {
        await this.updateFlightSeats(
          segment.flightId,
          segment.cabinClass,
          existingBooking.passengers.length,
          true, // adding seats back
        );
      }

      // Delete old ticket files for each flight segment
      for (const segment of existingBooking.flightSegments) {
        await this.ticketService.deleteOldTicket(segment.id, id);
      }

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
