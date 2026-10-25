import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  availabilityDaysQuerySchema,
  availabilityQuerySchema,
  bookingSchema,
  type AvailabilityDaysQuery,
  type AvailabilityQuery,
  type BookingConfirmation,
  type BookingDetails,
  type BookingInput,
  type DayAvailability,
  type DayAvailabilitySummary,
  type PublicBusiness,
} from '@turnero/shared';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import {
  BookAppointment,
  GetBooking,
  GetPublicAvailabilityDays,
  GetPublicBusiness,
  GetPublicDayAvailability,
} from '../application/public-booking.js';

/**
 * The business's public booking page: no session, the business comes from its link. Limited per
 * visitor, more strictly for booking (each booking holds a time in the agenda).
 */
@Controller('public/businesses/:slug')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class PublicBookingController {
  constructor(
    private readonly getPublicBusiness: GetPublicBusiness,
    private readonly getPublicDayAvailability: GetPublicDayAvailability,
    private readonly getPublicAvailabilityDays: GetPublicAvailabilityDays,
    private readonly bookAppointment: BookAppointment,
    private readonly getBooking: GetBooking,
  ) {}

  @Get()
  business(@Param('slug') slug: string): Promise<PublicBusiness> {
    return this.getPublicBusiness.execute(slug);
  }

  /** ?serviceId=…&date=YYYY-MM-DD[&professionalId=…] */
  @Get('availability')
  day(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(availabilityQuerySchema)) query: AvailabilityQuery,
  ): Promise<DayAvailability> {
    return this.getPublicDayAvailability.execute(slug, query);
  }

  /** ?serviceId=…&from=YYYY-MM-DD[&days=14][&professionalId=…] */
  @Get('availability/days')
  days(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(availabilityDaysQuerySchema)) query: AvailabilityDaysQuery,
  ): Promise<DayAvailabilitySummary[]> {
    return this.getPublicAvailabilityDays.execute(slug, query);
  }

  @Post('appointments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  book(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(bookingSchema)) body: BookingInput,
  ): Promise<BookingConfirmation> {
    return this.bookAppointment.execute(slug, body);
  }

  @Get('appointments/:code')
  booking(@Param('slug') slug: string, @Param('code') code: string): Promise<BookingDetails> {
    return this.getBooking.execute(slug, code);
  }
}
