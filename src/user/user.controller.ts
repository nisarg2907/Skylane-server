import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/gaurds/auth.gaurd';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  UpdateUserDto,
  UserResponseDto,
  PaymentMethodResponseDto,
} from './dto/user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('User')
@Controller('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    this.logger.log('GET /users/profile');
    return this.userService.getUser(req.user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log('PATCH /users/profile');
    console.log('user id', req.user);
    return this.userService.updateUser(req.user.id, updateUserDto);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment methods retrieved successfully',
    type: [PaymentMethodResponseDto],
  })
  async getPaymentMethods(@Request() req): Promise<PaymentMethodResponseDto[]> {
    this.logger.log('GET /users/payment-methods');
    return this.userService.getUserPaymentMethods(req.user.authId);
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment method created successfully',
    type: PaymentMethodResponseDto,
  })
  async createPaymentMethod(
    @Request() req,
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log('POST /users/payment-methods');
    return this.userService.createPaymentMethod(
      req.user.authId,
      createPaymentMethodDto,
    );
  }

  @Get('payment-methods/:id')
  @ApiOperation({ summary: 'Get a payment method by ID' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method retrieved successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async getPaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log(`GET /users/payment-methods/${id}`);
    return this.userService.getPaymentMethod(req.user.authId, id);
  }

  @Patch('payment-methods/:id')
  @ApiOperation({ summary: 'Update a payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method updated successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async updatePaymentMethod(
    @Request() req,
    @Param('id') id: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log(`PATCH /users/payment-methods/${id}`);
    return this.userService.updatePaymentMethod(
      req.user.authId,
      id,
      updatePaymentMethodDto,
    );
  }

  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Payment method deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async deletePaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    this.logger.log(`DELETE /users/payment-methods/${id}`);
    return this.userService.deletePaymentMethod(req.user.authId, id);
  }

  @Post('payment-methods/:id/default')
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method set as default successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async setDefaultPaymentMethod(
    @Request() req,
    @Param('id') id: string,
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log(`POST /users/payment-methods/${id}/default`);
    return this.userService.setDefaultPaymentMethod(req.user.authId, id);
  }
}
