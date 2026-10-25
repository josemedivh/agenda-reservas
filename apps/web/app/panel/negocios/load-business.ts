import type {
  Appointment,
  Block,
  BusinessDetails,
  Professional,
  ProfessionalSchedule,
  Service,
  WeeklySchedule,
} from '@turnero/shared';
import { notFound, redirect } from 'next/navigation';
import {
  fetchAppointments,
  fetchBlocks,
  fetchBusiness,
  fetchProfessional,
  fetchProfessionals,
  fetchProfessionalWorkingHours,
  fetchService,
  fetchServices,
  fetchWorkingHours,
  type ApiResult,
} from '../../../lib/api/server';

/** The data for a panel page, or the right exit: login when the session ended, 404 otherwise. */
function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) {
    return result.data;
  }
  if (result.status === 401) {
    redirect('/sesion/caducada');
  }
  // Not a member and not found look the same, so nothing leaks about other businesses.
  notFound();
}

export async function loadBusiness(businessId: string): Promise<BusinessDetails> {
  return unwrap(await fetchBusiness(businessId));
}

export async function loadProfessionals(businessId: string): Promise<Professional[]> {
  return unwrap(await fetchProfessionals(businessId));
}

export async function loadProfessional(
  businessId: string,
  professionalId: string,
): Promise<Professional> {
  return unwrap(await fetchProfessional(businessId, professionalId));
}

export async function loadServices(businessId: string): Promise<Service[]> {
  return unwrap(await fetchServices(businessId));
}

export async function loadService(businessId: string, serviceId: string): Promise<Service> {
  return unwrap(await fetchService(businessId, serviceId));
}

export async function loadWorkingHours(businessId: string): Promise<ProfessionalSchedule[]> {
  return unwrap(await fetchWorkingHours(businessId));
}

export async function loadProfessionalWorkingHours(
  businessId: string,
  professionalId: string,
): Promise<WeeklySchedule> {
  return unwrap(await fetchProfessionalWorkingHours(businessId, professionalId));
}

export async function loadBlocks(businessId: string): Promise<Block[]> {
  return unwrap(await fetchBlocks(businessId));
}

export async function loadAppointments(
  businessId: string,
  from: string,
  days: number,
): Promise<Appointment[]> {
  return unwrap(await fetchAppointments(businessId, from, days));
}
