// js/api.js - Minimal API client (public)

class CarAPI {
  constructor() {
    this.baseUrl = this.detectApiUrl();
    console.log('🌐 API base URL:', this.baseUrl);
  }

  detectApiUrl() {
    // If deployed behind same domain, keep relative.
    // You can override with window.API_BASE_URL or <meta name="api-base-url" ...>
    const meta = document.querySelector('meta[name="api-base-url"]');
    if (window.API_BASE_URL) return String(window.API_BASE_URL).replace(/\/$/, '');
    if (meta?.content) return String(meta.content).replace(/\/$/, '');
    return '';
  }

  async request(path, { method = 'GET', params, json } = {}) {
    const url = new URL((this.baseUrl || '') + path, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        url.searchParams.set(k, String(v));
      });
    }

    const res = await fetch(url.toString(), {
      method,
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${text.slice(0, 300)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // Booking
  async getServices() {
    return this.request('/api/services');
  }

  async getVehicleClasses() {
    return this.request('/api/vehicle-classes');
  }

  async createBookingRequest(payload) {
    return this.request('/api/booking-requests', { method: 'POST', json: payload });
  }

  async calculateBookingPrice(payload) {
    return this.request('/api/calculate-booking-price', { method: 'POST', json: payload });
  }

  // Cars
  async getCars({ q = null, active_only = true } = {}) {
    return this.request('/api/cars', { params: { q, active_only } });
  }

  async getCar(id) {
    return this.request(`/api/cars/${id}`);
  }

  // Reviews
  async getCarReviews(carId, { approved_only = true } = {}) {
    return this.request(`/api/cars/${carId}/reviews`, { params: { approved_only } });
  }

  async createCarReview(carId, payload) {
    return this.request(`/api/cars/${carId}/reviews`, { method: 'POST', json: payload });
  }

  // Service reviews (about the service)
  async getServiceReviews({ approved_only = true, limit = 20 } = {}) {
    return this.request('/api/service-reviews', { params: { approved_only, limit } });
  }

  async createServiceReview(payload) {
    return this.request('/api/service-reviews', { method: 'POST', json: payload });
  }
}

window.carAPI = new CarAPI();
