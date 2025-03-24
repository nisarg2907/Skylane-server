import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { Flight, Airport, Airline } from '@prisma/client';

@Injectable()
export class FlightsService {
  constructor(private prisma: PrismaService) {}

  // One-way flights search
  async searchOneWayFlights(
    searchDto: SearchFlightsDto,
  ): Promise<{ outboundFlights: Flight[]; returnFlights: Flight[] }> {
    const { from, to, departureDate, cabinClass } = searchDto;

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

    if (oneWayFlights.length > 0) {
      return { outboundFlights: oneWayFlights, returnFlights: [] };
    }

    // If no flights found, return future flights
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

    return { outboundFlights: futureFlights, returnFlights: [] };
  }

  async searchRoundTripFlights(
    searchDto: SearchFlightsDto,
  ): Promise<{ outboundFlights: Flight[]; returnFlights: Flight[] }> {
    const { from, to, departureDate, returnDate, cabinClass } = searchDto;

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

    // If both outbound and return flights are found, return them as separate objects
    if (outboundFlights.length > 0 && returnFlights.length > 0) {
      return {
        outboundFlights,
        returnFlights,
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

    // Pair outbound and return flights
    const pairedFlights = [];
    for (const outbound of futureOutboundFlights) {
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

      if (potentialReturnFlights.length > 0) {
        pairedFlights.push(outbound, ...potentialReturnFlights);
      }
    }

    // Returning paired flights as outbound and return objects
    return {
      outboundFlights: futureOutboundFlights,
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
