import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsString()
  @IsOptional()
  @Length(1, 50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsString()
  @IsOptional()
  @Length(1, 50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Card holder name' })
  @IsString()
  @Length(1, 100)
  cardHolderName: string;

  @ApiProperty({ description: 'Card type (Visa, Mastercard, etc.)' })
  @IsString()
  cardType: string;

  @ApiProperty({ description: 'Card number' })
  @IsString()
  @Length(13, 19)
  cardNumber: string;

  @ApiProperty({ description: 'Card expiry month (1-12)' })
  @IsString()
  expiryMonth: string;

  @ApiProperty({ description: 'Card expiry year (YY format)' })
  @IsString()
  expiryYear: string;

  @ApiProperty({ description: 'Card CVV' })
  @IsString()
  @Length(3, 4)
  cvv: string;

  @ApiPropertyOptional({
    description: 'Set as default payment method',
    default: false,
  })
  @IsOptional()
  isDefault?: boolean;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ description: 'Card holder name' })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  cardHolderName?: string;

  @ApiPropertyOptional({ description: 'Set as default payment method' })
  @IsOptional()
  isDefault?: boolean;
}

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'Payment method ID' })
  id: string;

  @ApiProperty({ description: 'Card holder name' })
  cardHolderName: string;

  @ApiProperty({ description: 'Card type (Visa, Mastercard, etc.)' })
  cardType: string;

  @ApiProperty({ description: 'Last four digits of the card' })
  lastFourDigits: string;

  @ApiProperty({ description: 'Card expiry month' })
  expiryMonth: number;

  @ApiProperty({ description: 'Card expiry year' })
  expiryYear: number;

  @ApiProperty({ description: 'Is default payment method' })
  isDefault: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiPropertyOptional({ description: 'User first name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  phone?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
