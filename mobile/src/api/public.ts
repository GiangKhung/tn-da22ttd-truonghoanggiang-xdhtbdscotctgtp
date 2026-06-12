import { apiClient } from './client';

export type CustomerAppointment = {
  id: number;
  serviceType: string;
  appointmentDate: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
  cancelReason?: string | null;
  createdAt: string;
  licensePlate: string;
};

export type MaintenanceTaskBrief = { taskName: string; isCompleted: boolean };
export type MaintenancePartBrief = { quanty: number; part: { name: string } };

export type MaintenanceRecordBrief = {
  id: number;
  date: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | string;
  cost: number | null;
  maintenanceTasks: MaintenanceTaskBrief[];
  maintenanceParts: MaintenancePartBrief[];
};

export type HistoryResponse = {
  car: {
    licensePlate: string;
    brand: string;
    model: string;
    year: number;
  } | null;
  records: MaintenanceRecordBrief[];
};

export function getHistory(licensePlate: string, phone: string) {
  const params = new URLSearchParams({ licensePlate, phone });
  return apiClient.get<HistoryResponse>(`/api/public/history?${params}`);
}

export function getMyAppointments(phone: string, licensePlate: string) {
  const params = new URLSearchParams({ phone, licensePlate });
  return apiClient.get<{ appointments: CustomerAppointment[] }>(
    `/api/public/appointments?${params}`,
    true
  );
}

export function cancelAppointment(id: number, phone: string, licensePlate: string, cancelReason: string) {
  return apiClient.patch<{ appointment: CustomerAppointment }>(
    `/api/public/appointments/${id}`,
    { phone, licensePlate, action: 'CANCEL', cancelReason }
  );
}

export type CarInfo = {
  id: number;
  licensePlate: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  vin?: string | null;
  engineNumber?: string | null;
  color?: string | null;
};

export function getMyCars() {
  return apiClient.get<{ cars: CarInfo[] }>('/api/public/cars', true);
}

export function addMyCar(car: Omit<CarInfo, 'id'>) {
  return apiClient.post<{ car: CarInfo }>('/api/public/cars', car, true);
}

export function removeMyCar(id: number) {
  return apiClient.delete<{ message: string }>(`/api/public/cars?id=${id}`, true);
}

export type NotificationInfo = {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export function getNotifications(phone: string) {
  const params = new URLSearchParams({ phone });
  return apiClient.get<{ notifications: NotificationInfo[] }>(`/api/public/notifications?${params}`, true);
}

export function markNotificationsAsRead(phone: string) {
  return apiClient.patch<{ success: boolean }>('/api/public/notifications', { phone }, true);
}

export function savePushToken(phone: string, pushToken: string) {
  return apiClient.post<{ success: boolean }>('/api/public/customers/push-token', { phone, pushToken }, true);
}

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function sendAiChatMessage(messages: ChatMessage[]) {
  return apiClient.post<{ reply: string }>('/api/ai/chat', { messages }, true);
}


