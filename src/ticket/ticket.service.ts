import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  /**
   * Generates a ticket PDF for a booking (or specific segment) and stores it in Supabase
   */
  async generateAndStoreTicket(
    bookingId: string,
    segmentId?: string,
  ): Promise<string> {
    try {
      // 1. Fetch the booking with all necessary data
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          passengers: true,
          flightSegments: {
            include: {
              flight: {
                include: {
                  airline: true,
                  departureAirport: true,
                  arrivalAirport: true,
                },
              },
            },
          },
          user: true,
        },
      });

      if (!booking) {
        throw new Error(`Booking with ID ${bookingId} not found`);
      }

      // Filter segments if segmentId is provided
      const segmentsToInclude = segmentId
        ? booking.flightSegments.filter((s) => s.id === segmentId)
        : booking.flightSegments;

      if (segmentsToInclude.length === 0) {
        throw new Error('No matching flight segments found');
      }

      // 2. Generate a temporary file path for the PDF
      const tempFilePath = path.join(
        os.tmpdir(),
        `ticket-${bookingId}-${segmentId || 'all'}-${Date.now()}.pdf`,
      );

      // 3. Generate the PDF with filtered segments
      await this.createTicketPDF(
        {
          ...booking,
          flightSegments: segmentsToInclude,
        },
        tempFilePath,
      );

      // 4. Upload the PDF to Supabase Storage
      const fileData = fs.readFileSync(tempFilePath);
      const fileName = `tickets/${bookingId}/${path.basename(tempFilePath)}`;

      const { error } = await this.supabaseService
        .getClient()
        .storage.from('bookings')
        .upload(fileName, fileData, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) {
        throw new Error(
          `Failed to upload ticket to Supabase: ${error.message}`,
        );
      }

      // 5. Get the public URL for the uploaded file
      const { data: urlData } = this.supabaseService
        .getClient()
        .storage.from('bookings')
        .getPublicUrl(fileName);

      // 6. Delete old ticket files for this segment if they exist
      if (segmentId) {
        await this.deleteOldTicket(segmentId, bookingId);
      }

      // 7. Update the flight segment with the new ticket URL
      if (segmentId) {
        await this.prisma.flightSegment.update({
          where: { id: segmentId },
          data: { ticketUrl: urlData.publicUrl },
        });
      }

      // 8. Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(
        `Error generating and storing ticket: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Deletes old ticket files for a flight segment if they exist
   */
  async deleteOldTicket(segmentId: string, bookingId: string): Promise<void> {
    try {
      const existingSegment = await this.prisma.flightSegment.findUnique({
        where: { id: segmentId },
        select: { ticketUrl: true },
      });

      if (existingSegment?.ticketUrl) {
        const oldFileName = existingSegment.ticketUrl.split('/').pop();
        await this.supabaseService
          .getClient()
          .storage.from('bookings')
          .remove([`tickets/${bookingId}/${oldFileName}`]);
      }
    } catch (error) {
      this.logger.error(`Failed to delete old ticket: ${error.message}`);
    }
  }

  /**
   * Creates a PDF ticket for a booking
   */
  private async createTicketPDF(
    booking: any,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(outputPath);

        doc.pipe(writeStream);

        // Add airline logo or placeholder
        // doc.image('path/to/logo.png', 50, 45, { width: 50 });

        // Add title
        doc.fontSize(20).text('E-Ticket / Itinerary', { align: 'center' });
        doc.moveDown();

        // Booking reference
        doc
          .fontSize(12)
          .text(`Booking Reference: ${booking.id}`, { align: 'right' });
        doc.text(
          `Date: ${new Date(booking.bookingDate).toLocaleDateString()}`,
          { align: 'right' },
        );
        doc.moveDown();

        // Draw a line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Passenger information
        doc.fontSize(14).text('Passenger Information', { underline: true });
        doc.moveDown(0.5);

        booking.passengers.forEach((passenger, index) => {
          doc
            .fontSize(12)
            .text(
              `Passenger ${index + 1}: ${passenger.firstName} ${passenger.lastName}`,
            );
          if (passenger.passportNumber) {
            doc.text(`Passport: ${passenger.passportNumber}`);
          }
          doc.text(`Type: ${passenger.passengerType}`);
          doc.moveDown(0.5);
        });

        doc.moveDown();

        // Flight information
        doc.fontSize(14).text('Flight Information', { underline: true });
        doc.moveDown(0.5);

        booking.flightSegments.forEach((segment, index) => {
          const flight = segment.flight;

          doc
            .fontSize(12)
            .text(
              `Flight ${index + 1}: ${flight.airline.code}${flight.flightNumber}`,
            );
          doc.text(
            `From: ${flight.departureAirport.name} (${flight.departureAirport.code})`,
          );
          doc.text(
            `To: ${flight.arrivalAirport.name} (${flight.arrivalAirport.code})`,
          );
          doc.text(
            `Departure: ${new Date(flight.departureTime).toLocaleString()}`,
          );
          doc.text(`Arrival: ${new Date(flight.arrivalTime).toLocaleString()}`);
          doc.text(`Class: ${segment.cabinClass}`);

          // Calculate flight duration
          const durationMs =
            new Date(flight.arrivalTime).getTime() -
            new Date(flight.departureTime).getTime();
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
          const durationMinutes = Math.floor(
            (durationMs % (1000 * 60 * 60)) / (1000 * 60),
          );
          doc.text(`Duration: ${durationHours}h ${durationMinutes}m`);

          doc.moveDown();
        });

        // Payment information
        doc.fontSize(14).text('Payment Information', { underline: true });
        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .text(`Total Amount: $${booking.totalAmount.toFixed(2)}`);
        doc.text(`Payment Status: ${booking.paymentStatus}`);
        doc.moveDown();

        // Terms and conditions
        doc.fontSize(10).text('Terms and Conditions', { underline: true });
        doc.moveDown(0.5);
        doc.text(
          'Please arrive at the airport at least 2 hours before your scheduled departure for domestic flights and 3 hours for international flights. Valid photo ID is required for all passengers.',
          {
            align: 'justify',
          },
        );

        doc.moveDown();
        doc.text(
          'This e-ticket is subject to the conditions of carriage of the respective airline. Baggage allowances and other service details vary by airline and ticket class.',
          {
            align: 'justify',
          },
        );

        // Finalize the PDF
        doc.end();

        writeStream.on('finish', () => {
          resolve();
        });

        writeStream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
