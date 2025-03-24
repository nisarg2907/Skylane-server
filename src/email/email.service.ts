import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
// import * as fs from 'fs';
// import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Initialize the nodemailer transporter with your SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE', true),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`Email service error: ${error.message}`);
      } else {
        this.logger.log('Email service is ready to send messages');
      }
    });
  }

  /**
   * Send a booking confirmation email with ticket attached
   */
  async sendBookingConfirmation(
    userEmail: string,
    userName: string,
    bookingDetails: any,
    ticketUrl?: string,
    pdfAttachment?: Buffer,
  ): Promise<void> {
    try {
      const attachments = [];

      // If PDF attachment is provided, add it
      if (pdfAttachment) {
        attachments.push({
          filename: 'ticket.pdf',
          content: pdfAttachment,
          contentType: 'application/pdf',
        });
      }

      // Get the first flight segment for email subject
      const firstSegment = bookingDetails.flightSegments[0];
      const flight = firstSegment.flight;

      // Create email content
      const mailOptions = {
        from: `"${this.configService.get<string>('EMAIL_FROM_NAME', 'Flight Booking')}" <${this.configService.get<string>('EMAIL_FROM')}>`,
        to: userEmail,
        subject: `Flight Booking Confirmation - ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`,
        html: this.getBookingConfirmationTemplate(
          userName,
          bookingDetails,
          ticketUrl,
        ),
        attachments,
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a booking cancellation email
   */
  async sendBookingCancellation(
    userEmail: string,
    userName: string,
    bookingDetails: any,
  ): Promise<void> {
    try {
      // Get the first flight segment for email subject
      const firstSegment = bookingDetails.flightSegments[0];
      const flight = firstSegment.flight;

      // Create email content
      const mailOptions = {
        from: `"${this.configService.get<string>('EMAIL_FROM_NAME', 'Flight Booking')}" <${this.configService.get<string>('EMAIL_FROM')}>`,
        to: userEmail,
        subject: `Flight Booking Cancellation - ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`,
        html: this.getBookingCancellationTemplate(userName, bookingDetails),
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Cancellation email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a booking update email
   */
  async sendBookingUpdate(
    userEmail: string,
    userName: string,
    bookingDetails: any,
    changes: any,
    ticketUrl?: string,
    pdfAttachment?: Buffer,
  ): Promise<void> {
    try {
      const attachments = [];

      // If PDF attachment is provided, add it
      if (pdfAttachment) {
        attachments.push({
          filename: 'updated_ticket.pdf',
          content: pdfAttachment,
          contentType: 'application/pdf',
        });
      }

      // Get the first flight segment for email subject
      const firstSegment = bookingDetails.flightSegments[0];
      const flight = firstSegment.flight;

      // Create email content
      const mailOptions = {
        from: `"${this.configService.get<string>('EMAIL_FROM_NAME', 'Flight Booking')}" <${this.configService.get<string>('EMAIL_FROM')}>`,
        to: userEmail,
        subject: `Flight Booking Update - ${flight.departureAirport.code} to ${flight.arrivalAirport.code}`,
        html: this.getBookingUpdateTemplate(
          userName,
          bookingDetails,
          changes,
          ticketUrl,
        ),
        attachments,
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Update email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send update email: ${error.message}`);
      throw error;
    }
  }

  /**
   * HTML template for booking confirmation email
   */
  private getBookingConfirmationTemplate(
    userName: string,
    bookingDetails: any,
    ticketUrl?: string,
  ): string {
    const firstSegment = bookingDetails.flightSegments[0];
    const flight = firstSegment.flight;

    let ticketSection = '';
    if (ticketUrl) {
      ticketSection = `
        <div style="margin: 20px 0;">
          <a href="${ticketUrl}" target="_blank" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Your E-Ticket</a>
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
          <h1>Booking Confirmation</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${userName},</p>
          
          <p>Your flight booking has been confirmed. Here are your booking details:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Booking Reference:</strong> ${bookingDetails.id}</p>
            <p><strong>Status:</strong> Confirmed</p>
            <p><strong>Total Amount:</strong> $${bookingDetails.totalAmount.toFixed(2)}</p>
          </div>
          
          <h3>Flight Details</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Airline:</strong> ${flight.airline.name} (${flight.airline.code})</p>
            <p><strong>Flight Number:</strong> ${flight.flightNumber}</p>
            <p><strong>From:</strong> ${flight.departureAirport.name} (${flight.departureAirport.code})</p>
            <p><strong>To:</strong> ${flight.arrivalAirport.name} (${flight.arrivalAirport.code})</p>
            <p><strong>Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
            <p><strong>Arrival:</strong> ${new Date(flight.arrivalTime).toLocaleString()}</p>
            <p><strong>Class:</strong> ${firstSegment.cabinClass}</p>
          </div>
          
          <h3>Passenger Information</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${bookingDetails.passengers
              .map(
                (p, i) => `
                <p><strong>Passenger ${i + 1}:</strong> ${p.firstName} ${p.lastName} (${p.passengerType}, ${p.nationality})</p>
              `,
              )
              .join('')}
          </div>
          
          ${ticketSection}
          
          <p>Please arrive at the airport at least 2 hours before your scheduled departure for domestic flights and 3 hours for international flights.</p>
          
          <p>Thank you for choosing our service.</p>
          
          <p>Best regards,<br>Flight Booking Team</p>
        </div>
        
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * HTML template for booking cancellation email
   */
  private getBookingCancellationTemplate(
    userName: string,
    bookingDetails: any,
  ): string {
    const firstSegment = bookingDetails.flightSegments[0];
    const flight = firstSegment.flight;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #8B0000; color: white; padding: 20px; text-align: center;">
          <h1>Booking Cancellation</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${userName},</p>
          
          <p>Your flight booking has been cancelled. Here are the details of the cancelled booking:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Booking Reference:</strong> ${bookingDetails.id}</p>
            <p><strong>Status:</strong> Cancelled</p>
            <p><strong>Total Amount:</strong> $${bookingDetails.totalAmount.toFixed(2)}</p>
          </div>
          
          <h3>Flight Details</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Airline:</strong> ${flight.airline.name} (${flight.airline.code})</p>
            <p><strong>Flight Number:</strong> ${flight.flightNumber}</p>
            <p><strong>From:</strong> ${flight.departureAirport.name} (${flight.departureAirport.code})</p>
            <p><strong>To:</strong> ${flight.arrivalAirport.name} (${flight.arrivalAirport.code})</p>
            <p><strong>Scheduled Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
          </div>
          
          <h3>Passenger Information</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${bookingDetails.passengers
              .map(
                (p, i) => `
                <p><strong>Passenger ${i + 1}:</strong> ${p.firstName} ${p.lastName} (${p.passengerType}, ${p.nationality})</p>
              `,
              )
              .join('')}
          </div>
          
          <p>If you have any questions regarding this cancellation, please contact our customer service.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>Flight Booking Team</p>
        </div>
        
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * HTML template for booking update email
   */
  private getBookingUpdateTemplate(
    userName: string,
    bookingDetails: any,
    changes: any,
    ticketUrl?: string,
  ): string {
    const firstSegment = bookingDetails.flightSegments[0];
    const flight = firstSegment.flight;

    let ticketSection = '';
    if (ticketUrl) {
      ticketSection = `
        <div style="margin: 20px 0;">
          <a href="${ticketUrl}" target="_blank" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">Download Your Updated E-Ticket</a>
        </div>
      `;
    }

    // Build the changes section if changes are provided
    let changesSection = '';
    if (changes && Object.keys(changes).length > 0) {
      changesSection = `
        <h3>Changes to Your Booking</h3>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
      `;

      // Format changes based on what was updated
      if (changes.flight) {
        changesSection += `
          <p><strong>Flight Changes:</strong></p>
          <ul style="margin-top: 5px;">
        `;

        if (changes.flight.flightNumber) {
          changesSection += `<li>Flight number changed to: ${changes.flight.flightNumber}</li>`;
        }

        if (changes.flight.departureTime) {
          changesSection += `<li>Departure time changed to: ${new Date(changes.flight.departureTime).toLocaleString()}</li>`;
        }

        if (changes.flight.arrivalTime) {
          changesSection += `<li>Arrival time changed to: ${new Date(changes.flight.arrivalTime).toLocaleString()}</li>`;
        }

        if (changes.flight.departureAirport) {
          changesSection += `<li>Departure airport changed to: ${changes.flight.departureAirport.name} (${changes.flight.departureAirport.code})</li>`;
        }

        if (changes.flight.arrivalAirport) {
          changesSection += `<li>Arrival airport changed to: ${changes.flight.arrivalAirport.name} (${changes.flight.arrivalAirport.code})</li>`;
        }

        changesSection += `</ul>`;
      }

      if (changes.seating) {
        changesSection += `
          <p><strong>Seating Changes:</strong></p>
          <ul style="margin-top: 5px;">
        `;

        changes.seating.forEach((seat, index) => {
          changesSection += `<li>Passenger ${index + 1}: Seat changed to ${seat.seatNumber} (${seat.cabinClass})</li>`;
        });

        changesSection += `</ul>`;
      }

      if (changes.pricing) {
        changesSection += `
          <p><strong>Pricing Changes:</strong></p>
          <ul style="margin-top: 5px;">
            <li>Previous total: $${changes.pricing.previousAmount.toFixed(2)}</li>
            <li>New total: $${changes.pricing.newAmount.toFixed(2)}</li>
            <li>Difference: $${(changes.pricing.newAmount - changes.pricing.previousAmount).toFixed(2)}</li>
          </ul>
        `;
      }

      changesSection += `</div>`;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #FF8C00; color: white; padding: 20px; text-align: center;">
          <h1>Booking Update</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${userName},</p>
          
          <p>Your flight booking has been updated. Please review the changes and updated details below:</p>
          
          ${changesSection}
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Booking Reference:</strong> ${bookingDetails.id}</p>
            <p><strong>Status:</strong> Confirmed</p>
            <p><strong>Total Amount:</strong> $${bookingDetails.totalAmount.toFixed(2)}</p>
          </div>
          
          <h3>Updated Flight Details</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Airline:</strong> ${flight.airline.name} (${flight.airline.code})</p>
            <p><strong>Flight Number:</strong> ${flight.flightNumber}</p>
            <p><strong>From:</strong> ${flight.departureAirport.name} (${flight.departureAirport.code})</p>
            <p><strong>To:</strong> ${flight.arrivalAirport.name} (${flight.arrivalAirport.code})</p>
            <p><strong>Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
            <p><strong>Arrival:</strong> ${new Date(flight.arrivalTime).toLocaleString()}</p>
            <p><strong>Class:</strong> ${firstSegment.cabinClass}</p>
          </div>
          
          <h3>Passenger Information</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${bookingDetails.passengers
              .map(
                (p, i) => `
                <p><strong>Passenger ${i + 1}:</strong> ${p.firstName} ${p.lastName} (${p.passengerType}, ${p.nationality})</p>
              `,
              )
              .join('')}
          </div>
          
          ${ticketSection}
          
          <p>If you did not request these changes or have any questions, please contact our customer service immediately.</p>
          
          <p>Please arrive at the airport at least 2 hours before your scheduled departure for domestic flights and 3 hours for international flights.</p>
          
          <p>Thank you for your understanding and continued business.</p>
          
          <p>Best regards,<br>Flight Booking Team</p>
        </div>
        
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `;
  }
}
