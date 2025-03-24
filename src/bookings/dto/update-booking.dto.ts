import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PassengerType } from '@prisma/client';

export class UpdatePassengerDto {
  @ApiProperty({
    description: 'Passenger ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  id: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Passenger nationality', example: 'American' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiProperty({
    description: 'Passenger type',
    enum: PassengerType,
    example: 'ADULT',
  })
  @IsEnum(PassengerType)
  @IsOptional()
  type?: PassengerType;
}

export class UpdateBookingDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ type: [UpdatePassengerDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePassengerDto)
  passengers?: UpdatePassengerDto[];
}
