import apiClient from "./client";

export async function getMyRegistrations() {
  const response = await apiClient.get("/registrations/mine");
  return response.data;
}

export async function registerForEvent(eventId) {
  const response = await apiClient.post(`/registrations/events/${eventId}`);
  return response.data;
}

export async function cancelRegistration(registrationId) {
  const response = await apiClient.post(`/registrations/${registrationId}/cancel`);
  return response.data;
}
