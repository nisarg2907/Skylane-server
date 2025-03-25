// src/sse/sse.service.ts
import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class SseService {
  private seatUpdates = new Subject<{
    flightId: string;
    cabinClass: string;
    availableSeats: number;
  }>();

  // Send seat update to all connected clients
  sendSeatUpdate(flightId: string, cabinClass: string, availableSeats: number) {
    this.seatUpdates.next({ flightId, cabinClass, availableSeats });
  }

  // Get observable filtered by flightId
  getSeatUpdates(flightId?: string): Observable<{
    flightId: string;
    cabinClass: string;
    availableSeats: number;
  }> {
    return this.seatUpdates
      .asObservable()
      .pipe(filter((update) => !flightId || update.flightId === flightId));
  }
}
