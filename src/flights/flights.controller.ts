import { Controller, Get, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('oneWay')
  @ApiOperation({ summary: 'Search for one-way flights based on criteria' })
  async searchOneWayFlights(@Query() searchFlightsDto: SearchFlightsDto) {
    return this.flightsService.searchOneWayFlights(searchFlightsDto);
  }

  @Get('roundTrip')
  @ApiOperation({ summary: 'Search for round-trip flights based on criteria' })
  async searchRoundTripFlights(@Query() searchFlightsDto: SearchFlightsDto) {
    return this.flightsService.searchRoundTripFlights(searchFlightsDto);
  }

  @Get('airports/all')
  @ApiOperation({ summary: 'Get all airports' })
  async getAllAirports() {
    return this.flightsService.getAllAirports();
  }

  @Get('airlines/all')
  @ApiOperation({ summary: 'Get all airlines' })
  async getAllAirlines() {
    return this.flightsService.getAllAirlines();
  }
}
