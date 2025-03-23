import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';
import { CabinClass } from '@prisma/client';

export class SearchFlightsDto {
  @ApiProperty({ description: 'Departure airport' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ description: 'Arrival airport' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Departure date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  departureDate: string;

  @ApiProperty({
    description: 'Return date for round trips (YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @ApiProperty({ enum: CabinClass, default: CabinClass.ECONOMY })
  @IsEnum(CabinClass)
  @IsOptional()
  cabinClass?: CabinClass = CabinClass.ECONOMY;

  @ApiProperty({
    description: 'Trip type (oneWay or roundTrip)',
    enum: ['oneWay', 'roundTrip'],
    default: 'oneWay',
  })
  @IsEnum(['oneWay', 'roundTrip'])
  @IsOptional()
  tripType: 'oneWay' | 'roundTrip' = 'oneWay';
}
