// dto/update-booking.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PassengerDto } from './create-booking.dto';

export class UpdateBookingDto {
  @ApiProperty({ type: [PassengerDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];
}
