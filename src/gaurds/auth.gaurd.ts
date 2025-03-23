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

    try {
      console.log('Authorization Header:', request.headers.authorization);
      if (!accessToken) {
        console.log('Access token is missing');
        throw new UnauthorizedException('Access token is missing');
      }

      const user = await this.supabaseService.verifyToken(accessToken);
      request.user = user;
      return true;
    } catch (error) {
      console.log('error', error);
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
