import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { TicketService } from './ticket.service';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
