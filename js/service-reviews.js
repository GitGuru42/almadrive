// js/service-reviews.js - Service reviews (about the service) UI
(function () {
  const listEl = document.getElementById('serviceReviewsList');
  const formEl = document.getElementById('serviceReviewForm');
  const msgEl = document.getElementById('serviceReviewMessage');

  if (!listEl || !formEl || !window.carAPI) return;

  function t(key, fallback) {
    try {
      return window.t ? window.t(key, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  function stars(rating) {
    const r = Math.max(1, Math.min(5, Number(rating || 0)));
    return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
  }

  async function load() {
    try {
      const items = await window.carAPI.getServiceReviews({ approved_only: true, limit: 12 });
      if (!items || items.length === 0) {
        listEl.innerHTML = `<p class="service-reviews__empty">${escapeHtml(t('serviceReviews.empty', 'Пока нет отзывов. Будьте первым!'))}</p>`;
        return;
      }
      listEl.innerHTML = items.map((it) => {
        const name = it.author_name ? escapeHtml(it.author_name) : escapeHtml(t('serviceReviews.anonymous', 'Аноним'));
        const text = escapeHtml(it.text);
        const rating = stars(it.rating);
        return `
          <div class="service-review-card">
            <div class="service-review-card__top">
              <div class="service-review-card__name">${name}</div>
              <div class="service-review-card__rating" aria-label="${it.rating}">${rating}</div>
            </div>
            <div class="service-review-card__text">${text}</div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Service reviews load failed', e);
      listEl.innerHTML = `<p class="service-reviews__empty">${escapeHtml(t('serviceReviews.loadError', 'Не удалось загрузить отзывы.'))}</p>`;
    }
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (formEl.querySelector('#serviceReviewName')?.value || '').trim();
    const rating = Number(formEl.querySelector('#serviceReviewRating')?.value || 5);
    const text = (formEl.querySelector('#serviceReviewText')?.value || '').trim();

    msgEl.textContent = '';
    msgEl.className = 'service-reviews__message';

    if (!text || text.length < 2) {
      msgEl.textContent = t('serviceReviews.validation', 'Введите текст отзыва (минимум 2 символа).');
      msgEl.classList.add('is-error');
      return;
    }

    try {
      await window.carAPI.createServiceReview({
        author_name: name || null,
        rating,
        text,
      });
      formEl.reset();
      msgEl.textContent = t('serviceReviews.sent', '✅ Спасибо! Отзыв отправлен на модерацию.');
      msgEl.classList.add('is-success');
    } catch (err) {
      console.warn('Service review submit failed', err);
      msgEl.textContent = t('serviceReviews.sendError', '❌ Не удалось отправить отзыв. Попробуйте позже.');
      msgEl.classList.add('is-error');
    }
  });

  document.addEventListener('DOMContentLoaded', load);
  // Also refresh after language change if your lang-switcher triggers a custom event
  window.addEventListener('languageChanged', load);
})();
