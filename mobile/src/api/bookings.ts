import { apiClient } from './client';

export type Occupancy = Record<string, number>;

export type BookingPayload = {
  customerName: string;
  phoneNumber: string;
  licensePlate: string;
  serviceType: 'MAINTENANCE' | 'REPAIR' | 'WASHING' | 'TIRE';
  appointmentDate: string; // ISO
  note?: string;
};

export function getOccupancy(date: string): Promise<{ occupancy: Occupancy }> {
  return apiClient.get(`/api/bookings?date=${encodeURIComponent(date)}`);
}

export function createBooking(payload: BookingPayload) {
  return apiClient.post<{ message: string; appointment: any }>(
    '/api/bookings',
    payload
  );
}
