// js/booking-form.js

class BookingFormManager {
  constructor() {
    this.form = null;
    this.serviceSelect = null;
    this.vehicleClassSelect = null;
    this.dateInput = null;
    this.contactInput = null;
    this.commentInput = null;
    this.messageEl = null;
    this.calculateBtn = null;
    this.priceBox = null;
    this.priceValueEl = null;
    this.priceMetaEl = null;
    this.hiddenPriceInput = null;
    this.lastCalculation = null;
    this.services = [];
    this.vehicleClasses = [];
  }

  async init() {
    this.form = document.getElementById('bookingForm');
    this.serviceSelect = document.getElementById('serviceSelect');
    this.vehicleClassSelect = document.getElementById('vehicleClassSelect');
    this.dateInput = document.getElementById('serviceDate');
    this.contactInput = document.getElementById('contactInput');
    this.commentInput = document.getElementById('commentInput');
    this.messageEl = document.getElementById('bookingFormMessage');
    this.calculateBtn = document.getElementById('calculatePriceButton');
    this.priceBox = document.getElementById('bookingPriceBox');
    this.priceValueEl = document.getElementById('bookingPriceValue');
    this.priceMetaEl = document.getElementById('bookingPriceMeta');
    this.hiddenPriceInput = document.getElementById('estimatedPriceInput');

    if (!this.form || !window.carAPI) return;

    this.setMinDate();
    await this.loadOptions();
    this.bindEvents();
    this.bindQuickButtons();
  }

  setMinDate() {
    if (!this.dateInput) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    this.dateInput.min = value;
  }

  formatMoney(value) {
    const amount = Number(value || 0);
    return `${new Intl.NumberFormat('ru-RU').format(amount)} ₸`;
  }

  getSelectedService() {
    const id = Number(this.serviceSelect?.value || 0);
    return this.services.find((item) => Number(item.id) === id) || null;
  }

  getSelectedVehicleClass() {
    const id = Number(this.vehicleClassSelect?.value || 0);
    return this.vehicleClasses.find((item) => Number(item.id) === id) || null;
  }

  invalidateCalculation() {
    this.lastCalculation = null;
    if (this.hiddenPriceInput) this.hiddenPriceInput.value = '';
    if (this.priceBox) this.priceBox.classList.remove('is-visible');
  }

  renderPricePreview(result) {
    if (!this.priceBox || !this.priceValueEl || !this.priceMetaEl) return;

    const percent = Math.max(Number(result.price_multiplier || 100) - 100, 0);
    const classLine = percent > 0
      ? `${result.vehicle_class_name} (+${percent}%)`
      : `${result.vehicle_class_name} (базовый тариф)`;

    this.priceValueEl.textContent = this.formatMoney(result.estimated_price);
    this.priceMetaEl.textContent = `${result.service_name} • ${classLine} • от ${this.formatMoney(result.base_price)}`;
    this.priceBox.classList.add('is-visible');
    if (this.hiddenPriceInput) this.hiddenPriceInput.value = String(result.estimated_price);
  }

  async loadOptions() {
    try {
      const [services, vehicleClasses] = await Promise.all([
        window.carAPI.getServices(),
        window.carAPI.getVehicleClasses()
      ]);

      this.services = Array.isArray(services) ? services : [];
      this.vehicleClasses = Array.isArray(vehicleClasses) ? vehicleClasses : [];

      this.serviceSelect.innerHTML = '<option value="">Выберите услугу</option>' + this.services.map((s) => {
        const price = Number.isFinite(s.price_from) ? ` — от ${this.formatMoney(s.price_from)}` : '';
        return `<option value="${s.id}">${this.escapeHtml(s.name)}${this.escapeHtml(price)}</option>`;
      }).join('');

      this.vehicleClassSelect.innerHTML = '<option value="">Выберите класс автомобиля</option>' + this.vehicleClasses.map((v) => {
        const diff = Math.max(Number(v.price_multiplier || 100) - 100, 0);
        const suffix = diff > 0 ? ` — +${diff}%` : ' — базовый тариф';
        return `<option value="${v.id}">${this.escapeHtml(v.name)}${this.escapeHtml(suffix)}</option>`;
      }).join('');

      this.decorateSummaryCards();
    } catch (error) {
      console.error('Booking form options failed:', error);
      this.showMessage(window.t?.('booking.messages.loadError', 'Не удалось загрузить данные формы.') || 'Не удалось загрузить данные формы.', true);
    }
  }

  decorateSummaryCards() {
    const service = this.getSelectedService();
    const vehicleClass = this.getSelectedVehicleClass();

    const serviceEl = document.getElementById('bookingCurrentService');
    const classEl = document.getElementById('bookingCurrentClass');
    const baseEl = document.getElementById('bookingBasePrice');

    if (serviceEl) serviceEl.textContent = service?.name || '—';
    if (classEl) classEl.textContent = vehicleClass?.name || '—';
    if (baseEl) baseEl.textContent = Number.isFinite(service?.price_from) ? this.formatMoney(service.price_from) : '—';
  }

  bindEvents() {
    const invalidate = () => {
      this.invalidateCalculation();
      this.decorateSummaryCards();
    };

    this.serviceSelect?.addEventListener('change', invalidate);
    this.vehicleClassSelect?.addEventListener('change', invalidate);
    this.dateInput?.addEventListener('change', invalidate);

    this.calculateBtn?.addEventListener('click', async () => {
      await this.handlePriceCalculation();
    });

    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      this.showMessage('');

      const payload = {
        service_id: Number(this.serviceSelect.value),
        vehicle_class_id: Number(this.vehicleClassSelect.value),
        service_date: this.dateInput.value,
        contact: this.contactInput.value.trim(),
        comment: this.commentInput.value.trim() || null,
        estimated_price: this.hiddenPriceInput?.value ? Number(this.hiddenPriceInput.value) : null
      };

      if (!payload.service_id || !payload.vehicle_class_id || !payload.service_date || !payload.contact) {
        this.showMessage(window.t?.('booking.messages.validation', 'Пожалуйста, заполните все обязательные поля.') || 'Пожалуйста, заполните все обязательные поля.', true);
        return;
      }

      if (!payload.estimated_price) {
        const result = await this.handlePriceCalculation({ silentError: true });
        if (result?.estimated_price) payload.estimated_price = result.estimated_price;
      }

      const submitBtn = this.form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (this.calculateBtn) this.calculateBtn.disabled = true;

      try {
        await window.carAPI.createBookingRequest(payload);
        this.form.reset();
        this.setMinDate();
        this.invalidateCalculation();
        this.decorateSummaryCards();
        this.showMessage(window.t?.('booking.messages.success', 'Заявка успешно отправлена. Мы свяжемся с вами.') || 'Заявка успешно отправлена. Мы свяжемся с вами.');
      } catch (error) {
        console.error('Booking request failed:', error);
        this.showMessage(window.t?.('booking.messages.error', 'Не удалось отправить заявку. Попробуйте позже.') || 'Не удалось отправить заявку. Попробуйте позже.', true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (this.calculateBtn) this.calculateBtn.disabled = false;
      }
    });
  }

  async handlePriceCalculation({ silentError = false } = {}) {
    const serviceId = Number(this.serviceSelect?.value || 0);
    const vehicleClassId = Number(this.vehicleClassSelect?.value || 0);

    if (!serviceId || !vehicleClassId) {
      if (!silentError) {
        this.showMessage(window.t?.('booking.messages.calcValidation', 'Сначала выберите услугу и класс автомобиля.') || 'Сначала выберите услугу и класс автомобиля.', true);
      }
      return null;
    }

    if (this.calculateBtn) this.calculateBtn.disabled = true;

    try {
      const result = await window.carAPI.calculateBookingPrice({
        service_id: serviceId,
        vehicle_class_id: vehicleClassId
      });
      this.lastCalculation = result;
      this.renderPricePreview(result);
      this.decorateSummaryCards();
      this.showMessage(window.t?.('booking.messages.calcSuccess', 'Примерная стоимость рассчитана.') || 'Примерная стоимость рассчитана.');
      return result;
    } catch (error) {
      console.error('Price calculation failed:', error);
      if (!silentError) {
        this.showMessage(window.t?.('booking.messages.calcError', 'Не удалось рассчитать стоимость.') || 'Не удалось рассчитать стоимость.', true);
      }
      return null;
    } finally {
      if (this.calculateBtn) this.calculateBtn.disabled = false;
    }
  }

  bindQuickButtons() {
    document.querySelectorAll('[data-book-service]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-book-service') || '';
        const target = document.getElementById('booking');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (!value || !this.serviceSelect) return;

        const applySelection = () => {
          const normalizedValue = value.toLowerCase();
          const option = Array.from(this.serviceSelect.options).find((item) => item.textContent.toLowerCase().includes(normalizedValue));
          if (option) {
            this.serviceSelect.value = option.value;
            this.invalidateCalculation();
            this.decorateSummaryCards();
          }
        };

        if (this.serviceSelect.options.length <= 1) {
          await this.loadOptions();
        }
        applySelection();
      });
    });
  }

  showMessage(text, isError = false) {
    if (!this.messageEl) return;
    this.messageEl.textContent = text;
    this.messageEl.className = `booking-form__message${isError ? ' is-error' : text ? ' is-success' : ''}`;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const manager = new BookingFormManager();
  await manager.init();
});
