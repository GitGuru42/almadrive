// js/fleet-manager.js
// Отображение автопарка (публичное): список авто из /api/cars + модалка + отзывы

class FleetManager {
  constructor() {
    this.carsGrid = null;
    this.cars = [];
    this.isLoading = false;
  }

  async init() {
    this.carsGrid = document.getElementById('carsGrid');
    if (!this.carsGrid) return;

    try {
      await this.loadAllCars();
      this.bindEvents();
    } catch (e) {
      console.error('❌ FleetManager error:', e);
      this.showError('Ошибка загрузки автопарка');
    }
  }

  async loadAllCars() {
    this.showSkeleton();
    await this.fetchCars();
  }

  normalizeCar(car) {
    const images = Array.isArray(car?.images) ? car.images.filter(Boolean) : [];
    const thumbnail = car?.thumbnail || images[0] || '/static/images/car-placeholder.svg';
    return { ...car, images, thumbnail };
  }

  async fetchCars() {
    this.isLoading = true;
    try {
      const cars = await (window.carAPI?.getCars ? window.carAPI.getCars({}) : []);
      this.cars = (Array.isArray(cars) ? cars : []).map((c) => this.normalizeCar(c));
      this.renderCars();
      if (typeof window.applyTranslations === 'function') window.applyTranslations();
    } catch (e) {
      console.error('❌ fetchCars error:', e);
      this.showError('Не удалось загрузить автомобили');
    } finally {
      this.isLoading = false;
    }
  }

  renderCars() {
    if (!this.cars.length) {
      this.carsGrid.innerHTML = this.createNoCarsMessage();
      return;
    }
    this.carsGrid.innerHTML = this.cars.map((c) => this.createCarCard(c)).join('');
  }

  createCarCard(car) {
    const title = (car.title || 'Автомобиль').trim();
    const desc = (car.description || '').trim();
    const img = this.getCarImage(car);

    return `
      <article class="car-card car-card--simple">
        <div class="car-image-container">
          <img class="car-image" src="${this.escapeHtml(img)}" loading="lazy" alt="${this.escapeHtml(title)}">
        </div>

        <div class="car-info">
          <h3 class="car-title">${this.escapeHtml(title)}</h3>

          ${desc ? `<p class="car-desc">${this.escapeHtml(desc)}</p>` : ''}

          ${Array.isArray(car.images) && car.images.length > 1 ? `
            <div class="car-photos-count">Фото: ${car.images.length}</div>
          ` : ''}

          <div class="car-actions">
            <a class="car-button primary" href="#cars" data-car-id="${car.id}">
              <span data-i18n="fleet.details">Подробнее</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  getCarImage(car) {
    if (car?.thumbnail) return car.thumbnail;
    if (Array.isArray(car?.images) && car.images.length) return car.images[0];
    return '/static/images/car-placeholder.svg';
  }

  bindEvents() {
    // Delegate clicks for "details" buttons
    this.carsGrid.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-car-id]');
      if (!btn) return;
      e.preventDefault();
      const carId = Number(btn.getAttribute('data-car-id'));
      if (!carId) return;
      await this.openCarModal(carId);
    });
  }

  async openCarModal(carId) {
    const modal = document.getElementById('carModal');
    if (!modal) return;

    const content = modal.querySelector('.car-modal__content');
    if (!content) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Loading state
    content.innerHTML = this.modalSkeleton();

    try {
      const carRaw = await window.carAPI.getCar(carId);
      const car = this.normalizeCar(carRaw);
      const reviews = await window.carAPI.getCarReviews(carId, { approved_only: true });
      content.innerHTML = this.renderCarModal(car, reviews);
      this.bindModalInteractions(modal, carId);
      if (typeof window.applyTranslations === 'function') window.applyTranslations();
    } catch (err) {
      console.error('❌ openCarModal error:', err);
      content.innerHTML = `<div class="car-modal__error">Ошибка загрузки</div>`;
    }
  }

  closeCarModal() {
    const modal = document.getElementById('carModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  bindModalInteractions(modal, carId) {
    const closeBtn = modal.querySelector('[data-modal-close]');
    if (closeBtn) closeBtn.onclick = () => this.closeCarModal();

    modal.onclick = (e) => {
      if (e.target === modal) this.closeCarModal();
    };

    document.onkeydown = (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) this.closeCarModal();
    };

    const mainImg = modal.querySelector('.car-modal__img');
    modal.querySelectorAll('.car-modal__thumb').forEach((b) => {
      b.addEventListener('click', () => {
        const src = b.getAttribute('data-thumb');
        if (src && mainImg) mainImg.src = src;
      });
    });

    const form = modal.querySelector('#reviewForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (form.querySelector('input[name="author_name"]')?.value || '').trim();
        const rating = Number(form.querySelector('select[name="rating"]')?.value || 5);
        const text = (form.querySelector('textarea[name="text"]')?.value || '').trim();

        const msg = modal.querySelector('#reviewMessage');
        if (msg) msg.textContent = '';

        try {
          await window.carAPI.createCarReview(carId, { author_name: name || null, rating, text });
          // По умолчанию новые отзывы уходят на модерацию и не отображаются публично.
          if (msg) {
            msg.setAttribute('data-i18n', 'fleet.reviewThanks');
            msg.textContent = 'Спасибо! Отзыв отправлен на модерацию.';
          }
          form.reset();
          if (typeof window.applyTranslations === 'function') window.applyTranslations();
        } catch (err) {
          console.error('❌ submit review error:', err);
          if (msg) {
            msg.setAttribute('data-i18n', 'fleet.reviewError');
            msg.textContent = 'Не удалось отправить отзыв. Попробуйте позже.';
          }
          if (typeof window.applyTranslations === 'function') window.applyTranslations();
        }
      });
    }
  }

  modalSkeleton() {
    return `
      <div class="car-modal__skeleton">
        <div class="sk-img"></div>
        <div class="sk-lines">
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line short"></div>
        </div>
      </div>
    `;
  }

  renderCarModal(car, reviews) {
    const title = this.escapeHtml((car.title || 'Автомобиль').trim());
    const desc = this.escapeHtml((car.description || '').trim());
    const images = Array.isArray(car.images) ? car.images : [];
    const thumbnail = car.thumbnail || (images[0] || '/static/images/car-placeholder.svg');
    const gallery = [car.thumbnail, ...images].filter(Boolean);
    const unique = Array.from(new Set(gallery));

    return `
      <button class="car-modal__close" data-modal-close aria-label="Close">✕</button>

      <div class="car-modal__grid">
        <div class="car-modal__media">
          <img class="car-modal__img" src="${this.escapeHtml(thumbnail)}" alt="${title}">
          ${unique.length > 1 ? `
            <div class="car-modal__thumbs">
              ${unique.slice(0, 8).map((u) =>
                `<button class="car-modal__thumb" type="button" data-thumb="${this.escapeHtml(u)}"><img src="${this.escapeHtml(u)}" alt=""></button>`
              ).join('')}
            </div>
          ` : ''}
        </div>

        <div class="car-modal__info">
          <h2 class="car-modal__title">${title}</h2>
          ${desc ? `<p class="car-modal__desc">${desc}</p>` : ''}

          <section class="reviews">
            <h3 class="reviews__title" data-i18n="fleet.reviewsTitle">Отзывы</h3>
            <div id="reviewsList" class="reviews__list">${this.renderReviewsList(reviews)}</div>

            <div class="reviews__form">
              <h4 class="reviews__form-title" data-i18n="fleet.leaveReview">Оставить отзыв</h4>
              <form id="reviewForm">
                <div class="reviews__row">
                  <label class="reviews__label">
                    <span data-i18n="fleet.yourName">Ваше имя</span>
                    <input class="reviews__input" name="author_name" type="text" maxlength="120" placeholder="">
                  </label>
                  <label class="reviews__label">
                    <span data-i18n="fleet.rating">Оценка</span>
                    <select class="reviews__select" name="rating">
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                </div>

                <label class="reviews__label">
                  <span data-i18n="fleet.reviewText">Текст отзыва</span>
                  <textarea class="reviews__textarea" name="text" minlength="2" maxlength="2000" required></textarea>
                </label>

                <div class="reviews__actions">
                  <button class="car-button primary" type="submit" data-i18n="fleet.send">Отправить</button>
                  <div id="reviewMessage" class="reviews__message"></div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderReviewsList(reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return `<div class="reviews__empty" data-i18n="fleet.reviewsEmpty">Пока нет отзывов. Будь первым!</div>`;
    }
    return reviews.map((r) => {
      const name = this.escapeHtml((r.author_name || '').trim() || 'Anon');
      const text = this.escapeHtml((r.text || '').trim());
      const rating = Number(r.rating || 0);
      const safeRating = Math.max(0, Math.min(5, rating));
      const stars = '★★★★★'.slice(0, safeRating) + '☆☆☆☆☆'.slice(0, 5 - safeRating);
      return `
        <div class="review">
          <div class="review__head">
            <div class="review__name">${name}</div>
            <div class="review__stars" aria-label="${safeRating}">${stars}</div>
          </div>
          <div class="review__text">${text}</div>
        </div>
      `;
    }).join('');
  }

  createNoCarsMessage() {
    return `
      <div class="no-cars">
        <h3 data-i18n="fleet.noCarsTitle">Пока нет автомобилей</h3>
        <p data-i18n="fleet.noCarsText">Скоро добавим автопарк — загляни чуть позже.</p>
      </div>
    `;
  }

  showSkeleton() {
    this.carsGrid.innerHTML = `
      ${Array.from({ length: 6 }).map(() => `
        <div class="car-card car-card--simple is-skeleton">
          <div class="car-image-container"></div>
          <div class="car-info">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
          </div>
        </div>
      `).join('')}
    `;
  }

  showError(msg) {
    this.carsGrid.innerHTML = `
      <div class="no-cars">
        <h3>Ошибка</h3>
        <p>${this.escapeHtml(msg)}</p>
      </div>
    `;
  }

  escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fm = new FleetManager();
  fm.init();
});
