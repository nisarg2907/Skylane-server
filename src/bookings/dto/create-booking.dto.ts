import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CabinClass, PassengerType } from '@prisma/client';

export class PassengerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  passportNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  passportExpiry?: string;

  @ApiProperty({
    enum: PassengerType,
    name: 'type',
    default: PassengerType.ADULT,
  })
  @IsEnum(PassengerType)
  @IsOptional()
  type?: PassengerType = PassengerType.ADULT;
}

export class FlightSegmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  flightId: string;

  @ApiProperty({ enum: CabinClass })
  @IsEnum(CabinClass)
  @IsNotEmpty()
  cabinClass: CabinClass;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  fareAmount: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  isReturn?: boolean;
}

// New DTO to handle the frontend format
export class CreateBookingDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  flightId?: string;

  @ApiProperty({ enum: CabinClass, required: false })
  @IsEnum(CabinClass)
  @IsOptional()
  cabinClass?: CabinClass;

  @ApiProperty({ type: [FlightSegmentDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlightSegmentDto)
  @IsOptional()
  flightSegments?: FlightSegmentDto[];
}
