import { Controller, Get, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get()
  @ApiOperation({ summary: 'Search for flights based on criteria' })
  async searchFlights(@Query() searchFlightsDto: SearchFlightsDto) {
    return this.flightsService.searchFlights(searchFlightsDto);
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
