import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { Flight, Airport, Airline } from '@prisma/client';

@Injectable()
export class FlightsService {
  constructor(private prisma: PrismaService) {}
  async searchFlights(searchDto: SearchFlightsDto): Promise<Flight[]> {
    const { from, to, departureDate, returnDate, cabinClass, tripType } =
      searchDto;

    console.log('Search criteria:', searchDto);

    const depDate = new Date(departureDate);
    const nextDay = new Date(departureDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let returnDepDate;
    let returnNextDay;

    if (returnDate) {
      returnDepDate = new Date(returnDate);
      returnNextDay = new Date(returnDate);
      returnNextDay.setDate(returnNextDay.getDate() + 1);
    }

    // Create a more flexible origin search condition
    const originCondition = {
      OR: [
        { name: from }, // Airport name
        { code: from }, // Airport code
        { city: from }, // City name
      ],
    };

    // Create a more flexible destination search condition
    const destinationCondition = {
      OR: [
        { name: to }, // Airport name
        { code: to }, // Airport code
        { city: to }, // City name
      ],
    };

    // Get current date for future flights
    const currentDate = new Date();

    // For one-way trips
    if (tripType === 'oneWay' || !returnDate) {
      // Try to find flights with exact dates first
      const exactDateFlights = await this.prisma.flight.findMany({
        where: {
          departureAirport: originCondition,
          arrivalAirport: destinationCondition,
          departureTime: {
            gte: depDate,
            lt: nextDay,
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

      // If we found flights with exact dates, return them
      if (exactDateFlights.length > 0) {
        return exactDateFlights;
      }

      // Otherwise, find future flights for the same route (one-way only)
      return this.prisma.flight.findMany({
        where: {
          departureAirport: originCondition,
          arrivalAirport: destinationCondition,
          departureTime: {
            gte: currentDate,
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
          departureTime: 'asc', // Order by soonest departure
        },
        take: 10, // Limit results to avoid returning too many flights
      });
    }

    // For round trips
    // Try to find outbound flights with exact dates
    const outboundFlights = await this.prisma.flight.findMany({
      where: {
        departureAirport: originCondition,
        arrivalAirport: destinationCondition,
        departureTime: {
          gte: depDate,
          lt: nextDay,
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

    // Try to find return flights with exact dates
    const returnFlights = await this.prisma.flight.findMany({
      where: {
        departureAirport: destinationCondition,
        arrivalAirport: originCondition,
        departureTime: {
          gte: returnDepDate,
          lt: returnNextDay,
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

    // If both outbound and return flights are found with exact dates, return them
    if (outboundFlights.length > 0 && returnFlights.length > 0) {
      return [...outboundFlights, ...returnFlights];
    }

    // If we couldn't find exact matches, handle fallback for round trips
    // In this case, we want to find alternative round trips, not just any flights

    // Get future outbound flights for the same route
    const futureOutboundFlights = await this.prisma.flight.findMany({
      where: {
        departureAirport: originCondition,
        arrivalAirport: destinationCondition,
        departureTime: {
          gte: currentDate,
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
      take: 5, // Limit results
    });

    // For each outbound flight, find corresponding return flights
    const pairedFlights = [];

    for (const outbound of futureOutboundFlights) {
      // Find return flights that depart after the outbound flight arrives
      const potentialReturnFlights = await this.prisma.flight.findMany({
        where: {
          departureAirport: destinationCondition,
          arrivalAirport: originCondition,
          departureTime: {
            gte: outbound.arrivalTime,
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
        take: 2, // Limit to 2 return options per outbound flight
      });

      if (potentialReturnFlights.length > 0) {
        // Add this outbound flight and its potential returns to the result
        pairedFlights.push(outbound, ...potentialReturnFlights);
      }
    }

    // If we found paired flights, return them
    if (pairedFlights.length > 0) {
      return pairedFlights;
    }

    // If we couldn't find any paired flights, return an empty array
    return [];
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
