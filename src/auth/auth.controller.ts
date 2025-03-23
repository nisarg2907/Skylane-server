import { Controller, Get, Post, UseGuards, Req, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from 'src/gaurds/auth.gaurd';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@Req() req) {
    return req.user;
  }

  @Post('sync')
  async syncUser(
    @Req() req,
    @Body()
    userData: {
      authId: string;
      email: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    console.log('Sync user request received:', userData);

    // Update or create user in your database
    const user = await this.authService.findOrCreateUser(
      userData.authId,
      userData.email,
      userData.firstName,
      userData.lastName,
    );

    console.log('User synced successfully:', user);

    return user;
  }
}
