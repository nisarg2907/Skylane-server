import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CabinClass } from '@prisma/client';

export class PassengerCount {
  @ApiProperty({ description: 'Number of adult passengers' })
  @IsOptional()
  adult?: number = 1;

  @ApiProperty({ description: 'Number of child passengers' })
  @IsOptional()
  child?: number = 0;

  @ApiProperty({ description: 'Number of infant passengers' })
  @IsOptional()
  infant?: number = 0;
}

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

  @ApiProperty({ description: 'Passenger count details' })
  @ValidateNested()
  @Type(() => PassengerCount)
  @IsOptional()
  passengers?: PassengerCount = { adult: 1, child: 0, infant: 0 };
}
