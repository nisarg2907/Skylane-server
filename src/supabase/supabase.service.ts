import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseKey) {
      this.logger.error('supabaseKey is required.');
      throw new Error('supabaseKey is required.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async verifyToken(accessToken: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);
      if (error) throw error;
      return data.user;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }
}
