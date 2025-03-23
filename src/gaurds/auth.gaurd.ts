import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accessToken = request.headers.authorization?.split(' ')[1];
    console.log('Authorization Header:', request.headers.Authorization);
    if (!accessToken) {
      throw new UnauthorizedException('Access token is missing');
    }

    try {
      const user = await this.supabaseService.verifyToken(accessToken);
      request.user = user; // Attach the user to the request object
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
