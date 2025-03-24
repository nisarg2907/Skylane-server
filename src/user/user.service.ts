import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  UpdateUserDto,
  PaymentMethodResponseDto,
} from './dto/user.dto';
import { User, PaymentMethod } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async getUser(authId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { authId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(
    authId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { authId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateUserDto,
    });
  }

  async getUserPaymentMethods(
    authId: string,
  ): Promise<PaymentMethodResponseDto[]> {
    const user = await this.getUser(authId);

    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId: user.id },
    });

    return paymentMethods.map((method) =>
      this.mapToPaymentMethodResponse(method),
    );
  }

  async getPaymentMethod(
    authId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethodResponseDto> {
    const user = await this.getUser(authId);

    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: user.id,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return this.mapToPaymentMethodResponse(paymentMethod);
  }

  async createPaymentMethod(
    authId: string,
    createPaymentMethodDto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const user = await this.getUser(authId);

    // Extract and encrypt sensitive data
    const { cardNumber, cvv, ...restDto } = createPaymentMethodDto;
    console.log(' cvv ', cvv);

    // Extract last four digits before encrypting
    const lastFourDigits = cardNumber.slice(-4);

    // Create payment method with encrypted data
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        userId: user.id,
        lastFourDigits,
        expiryMonth: parseInt(restDto.expiryMonth),
        expiryYear: parseInt(restDto.expiryYear),
        cardHolderName: restDto.cardHolderName,
        cardType: restDto.cardType,
        isDefault: restDto.isDefault || false,
      },
    });

    // If this is set as default, update all other payment methods
    if (paymentMethod.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: {
          userId: user.id,
          id: { not: paymentMethod.id },
        },
        data: { isDefault: false },
      });
    }

    return this.mapToPaymentMethodResponse(paymentMethod);
  }

  async updatePaymentMethod(
    authId: string,
    paymentMethodId: string,
    updatePaymentMethodDto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const user = await this.getUser(authId);

    // Verify payment method exists and belongs to user
    const existingPaymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: user.id,
      },
    });

    if (!existingPaymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Update payment method
    const updatedPaymentMethod = await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: updatePaymentMethodDto,
    });

    // If this is set as default, update all other payment methods
    if (updatePaymentMethodDto.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: {
          userId: user.id,
          id: { not: paymentMethodId },
        },
        data: { isDefault: false },
      });
    }

    return this.mapToPaymentMethodResponse(updatedPaymentMethod);
  }

  async deletePaymentMethod(
    authId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const user = await this.getUser(authId);

    // Verify payment method exists and belongs to user
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: user.id,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Check if this is the default payment method
    if (paymentMethod.isDefault) {
      // Find if there are other payment methods
      const otherPaymentMethods = await this.prisma.paymentMethod.findMany({
        where: {
          userId: user.id,
          id: { not: paymentMethodId },
        },
        take: 1,
      });

      // If there is another payment method, make it the default
      if (otherPaymentMethods.length > 0) {
        await this.prisma.paymentMethod.update({
          where: { id: otherPaymentMethods[0].id },
          data: { isDefault: true },
        });
      }
    }

    // Delete the payment method
    await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  async setDefaultPaymentMethod(
    authId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethodResponseDto> {
    const user = await this.getUser(authId);

    // Verify payment method exists and belongs to user
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: user.id,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Update all payment methods to not be default
    await this.prisma.paymentMethod.updateMany({
      where: {
        userId: user.id,
      },
      data: { isDefault: false },
    });

    // Set the specified payment method as default
    const updatedPaymentMethod = await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    return this.mapToPaymentMethodResponse(updatedPaymentMethod);
  }

  // Helper method to map payment method to response DTO
  private mapToPaymentMethodResponse(
    paymentMethod: PaymentMethod,
  ): PaymentMethodResponseDto {
    return {
      id: paymentMethod.id,
      cardHolderName: paymentMethod.cardHolderName,
      cardType: paymentMethod.cardType,
      lastFourDigits: paymentMethod.lastFourDigits,
      expiryMonth: paymentMethod.expiryMonth,
      expiryYear: paymentMethod.expiryYear,
      isDefault: paymentMethod.isDefault,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
    };
  }
}
