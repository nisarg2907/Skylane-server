import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async validateUser(token: string) {
    const supabase = this.supabaseService.getClient();

    // Verify the JWT token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Find or create user in our database
    const user = await this.findOrCreateUser(data.user.id, data.user.email);

    return user;
  }

  async findOrCreateUser(
    authId: string,
    email: string,
    firstName?: string,
    lastName?: string,
  ) {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update user if it exists
      user = await this.prisma.user.update({
        where: { authId },
        data: {
          email,
          firstName,
          lastName,
        },
      });
    } else {
      // Create user if not exists
      user = await this.prisma.user.create({
        data: {
          authId,
          email,
          firstName,
          lastName,
        },
      });
    }

    return user;
  }
}
