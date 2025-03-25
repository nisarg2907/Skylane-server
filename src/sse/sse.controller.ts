import { Controller, Sse, MessageEvent, Query, Res } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('seat-updates')
  seatUpdates(
    @Query('flightId') flightId: string,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    // Set SSE headers
    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');

    return this.sseService.getSeatUpdates(flightId).pipe(
      map((update) => ({
        data: JSON.stringify({
          type: 'seatUpdate',
          flightId: update.flightId,
          cabinClass: update.cabinClass,
          availableSeats: update.availableSeats,
          timestamp: new Date().toISOString(),
        }),
      })),
    );
  }
}
