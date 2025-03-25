import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { CabinClass, Flight, Airport, Airline } from '@prisma/client';

@Injectable()
export class FlightsService {
  constructor(private prisma: PrismaService) {}
  private getCapacityField(cabinClass: CabinClass): string {
    switch (cabinClass) {
      case CabinClass.ECONOMY:
        return 'economyCapacity';
      case CabinClass.PREMIUM_ECONOMY:
        return 'premiumEconomyCapacity';
      case CabinClass.BUSINESS:
        return 'businessCapacity';
      case CabinClass.FIRST:
        return 'firstClassCapacity';
      default:
        return 'economyCapacity';
    }
  }

  private async getAvailableSeats(
    flightId: string,
    cabinClass: CabinClass,
  ): Promise<number> {
    const capacityField = this.getCapacityField(cabinClass);

    const flight = await this.prisma.flight.findUnique({
      where: { id: flightId },
      select: {
        [capacityField]: true,
      },
    });

    if (!flight) {
      return 0;
    }

    // Safely convert capacity to number (fallback to 0 if null/undefined)
    const capacity = Number(flight[capacityField]) || 0;

    // Return available seats (ensure it's never negative)
    return Math.max(0, capacity);
  }

  // Updated one-way flights search with seat availability check
  async searchOneWayFlights(
    searchDto: SearchFlightsDto,
  ): Promise<{ outboundFlights: Flight[]; returnFlights: Flight[] }> {
    const { from, to, departureDate, cabinClass, passengers } = searchDto;
    const totalPassengers =
      Number(passengers?.adult || 0) + Number(passengers?.child || 0);

    const depDate = new Date(departureDate);
    const nextDay = new Date(departureDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const currentDate = new Date();

    // Find one-way flights for the given criteria
    const oneWayFlights = await this.prisma.flight.findMany({
      where: {
        departureTime: {
          gte: depDate,
          lt: nextDay,
        },
        departureAirport: {
          OR: [
            { name: { contains: from, mode: 'insensitive' } },
            { code: { contains: from, mode: 'insensitive' } },
            { city: { contains: from, mode: 'insensitive' } },
          ],
        },
        arrivalAirport: {
          OR: [
            { name: { contains: to, mode: 'insensitive' } },
            { code: { contains: to, mode: 'insensitive' } },
            { city: { contains: to, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
        flightSegments: {
          where: {
            cabinClass,
            isReturn: false,
          },
        },
      },
    });

    // Filter flights based on available seats
    const availableFlights = [];
    for (const flight of oneWayFlights) {
      const availableSeats = await this.getAvailableSeats(
        flight.id,
        cabinClass,
      );
      if (availableSeats >= totalPassengers) {
        availableFlights.push(flight);
      }
    }

    if (availableFlights.length > 0) {
      return { outboundFlights: availableFlights, returnFlights: [] };
    }

    // If no flights found, return future flights with available seats
    const futureFlights = await this.prisma.flight.findMany({
      where: {
        departureTime: {
          gte: currentDate,
        },
        departureAirport: {
          OR: [
            { name: { contains: from, mode: 'insensitive' } },
            { code: { contains: from, mode: 'insensitive' } },
            { city: { contains: from, mode: 'insensitive' } },
          ],
        },
        arrivalAirport: {
          OR: [
            { name: { contains: to, mode: 'insensitive' } },
            { code: { contains: to, mode: 'insensitive' } },
            { city: { contains: to, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
        flightSegments: {
          where: {
            cabinClass,
            isReturn: false,
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
      take: 10,
    });

    // Filter future flights based on available seats
    const availableFutureFlights = [];
    for (const flight of futureFlights) {
      const availableSeats = await this.getAvailableSeats(
        flight.id,
        cabinClass,
      );
      if (availableSeats >= totalPassengers) {
        availableFutureFlights.push(flight);
      }
    }

    return { outboundFlights: availableFutureFlights, returnFlights: [] };
  }

  // Updated round-trip flights search with seat availability check
  async searchRoundTripFlights(
    searchDto: SearchFlightsDto,
  ): Promise<{ outboundFlights: Flight[]; returnFlights: Flight[] }> {
    const { from, to, departureDate, returnDate, cabinClass, passengers } =
      searchDto;
    const totalPassengers =
      Number(passengers?.adult || 0) + Number(passengers?.child || 0);

    const depDate = new Date(departureDate);
    const nextDay = new Date(departureDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const returnDepDate = new Date(returnDate);
    const returnNextDay = new Date(returnDate);
    returnNextDay.setDate(returnNextDay.getDate() + 1);

    // Search outbound flights (departure)
    const outboundFlights = await this.prisma.flight.findMany({
      where: {
        departureTime: {
          gte: depDate,
          lt: nextDay,
        },
        departureAirport: {
          OR: [
            { name: { contains: from, mode: 'insensitive' } },
            { code: { contains: from, mode: 'insensitive' } },
            { city: { contains: from, mode: 'insensitive' } },
          ],
        },
        arrivalAirport: {
          OR: [
            { name: { contains: to, mode: 'insensitive' } },
            { code: { contains: to, mode: 'insensitive' } },
            { city: { contains: to, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
        flightSegments: {
          where: {
            cabinClass,
            isReturn: false,
          },
        },
      },
    });

    // Filter outbound flights based on available seats
    const availableOutboundFlights = [];
    for (const flight of outboundFlights) {
      const availableSeats = await this.getAvailableSeats(
        flight.id,
        cabinClass,
      );
      if (availableSeats >= totalPassengers) {
        availableOutboundFlights.push(flight);
      }
    }

    // Search return flights (return)
    const returnFlights = await this.prisma.flight.findMany({
      where: {
        departureTime: {
          gte: returnDepDate,
          lt: returnNextDay,
        },
        departureAirport: {
          OR: [
            { name: { contains: to, mode: 'insensitive' } },
            { code: { contains: to, mode: 'insensitive' } },
            { city: { contains: to, mode: 'insensitive' } },
          ],
        },
        arrivalAirport: {
          OR: [
            { name: { contains: from, mode: 'insensitive' } },
            { code: { contains: from, mode: 'insensitive' } },
            { city: { contains: from, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
        flightSegments: {
          where: {
            cabinClass,
            isReturn: true,
          },
        },
      },
    });

    // Filter return flights based on available seats
    const availableReturnFlights = [];
    for (const flight of returnFlights) {
      const availableSeats = await this.getAvailableSeats(
        flight.id,
        cabinClass,
      );
      if (availableSeats >= totalPassengers) {
        availableReturnFlights.push(flight);
      }
    }

    // If both outbound and return flights are found, return them as separate objects
    if (
      availableOutboundFlights.length > 0 &&
      availableReturnFlights.length > 0
    ) {
      return {
        outboundFlights: availableOutboundFlights,
        returnFlights: availableReturnFlights,
      };
    }

    // If no exact matches found, search for future flights
    const futureOutboundFlights = await this.prisma.flight.findMany({
      where: {
        departureTime: {
          gte: new Date(),
        },
        departureAirport: {
          OR: [
            { name: { contains: from, mode: 'insensitive' } },
            { code: { contains: from, mode: 'insensitive' } },
            { city: { contains: from, mode: 'insensitive' } },
          ],
        },
        arrivalAirport: {
          OR: [
            { name: { contains: to, mode: 'insensitive' } },
            { code: { contains: to, mode: 'insensitive' } },
            { city: { contains: to, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
        flightSegments: {
          where: {
            cabinClass,
            isReturn: false,
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
      take: 5,
    });

    // Filter future outbound flights based on available seats
    const availableFutureOutboundFlights = [];
    for (const flight of futureOutboundFlights) {
      const availableSeats = await this.getAvailableSeats(
        flight.id,
        cabinClass,
      );
      if (availableSeats >= totalPassengers) {
        availableFutureOutboundFlights.push(flight);
      }
    }

    // Pair outbound and return flights
    const pairedFlights = [];
    for (const outbound of availableFutureOutboundFlights) {
      const potentialReturnFlights = await this.prisma.flight.findMany({
        where: {
          departureTime: {
            gte: outbound.arrivalTime,
          },
          departureAirport: {
            OR: [
              { name: { contains: to, mode: 'insensitive' } },
              { code: { contains: to, mode: 'insensitive' } },
              { city: { contains: to, mode: 'insensitive' } },
            ],
          },
          arrivalAirport: {
            OR: [
              { name: { contains: from, mode: 'insensitive' } },
              { code: { contains: from, mode: 'insensitive' } },
              { city: { contains: from, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          airline: true,
          departureAirport: true,
          arrivalAirport: true,
          flightSegments: {
            where: {
              cabinClass,
              isReturn: true,
            },
          },
        },
        orderBy: {
          departureTime: 'asc',
        },
        take: 2,
      });

      // Filter return flights based on available seats
      for (const returnFlight of potentialReturnFlights) {
        const availableSeats = await this.getAvailableSeats(
          returnFlight.id,
          cabinClass,
        );
        if (availableSeats >= totalPassengers) {
          pairedFlights.push(returnFlight);
        }
      }
    }

    // Returning paired flights as outbound and return objects
    return {
      outboundFlights: availableFutureOutboundFlights,
      returnFlights: pairedFlights,
    };
  }

  async getFlight(id: string): Promise<Flight> {
    const flight = await this.prisma.flight.findUnique({
      where: { id },
      include: {
        airline: true,
        departureAirport: true,
        arrivalAirport: true,
      },
    });

    if (!flight) {
      throw new NotFoundException(`Flight with ID ${id} not found`);
    }

    return flight;
  }

  async getAllAirports(): Promise<Airport[]> {
    return this.prisma.airport.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getAllAirlines(): Promise<Airline[]> {
    return this.prisma.airline.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}
