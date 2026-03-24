// js/services.js

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('.services-accordion');
  if (!root) return;

  const items = Array.from(root.querySelectorAll('.service-item'));

  const closeAll = (exceptEl = null) => {
    items.forEach((item) => {
      if (exceptEl && item === exceptEl) return;
      item.classList.remove('is-open');
      const icon = item.querySelector('.service-icon');
      if (icon) icon.textContent = '+';
    });
  };

  items.forEach((item) => {
    const btn = item.querySelector('.service-trigger');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      if (isOpen) {
        item.classList.remove('is-open');
        const icon = item.querySelector('.service-icon');
        if (icon) icon.textContent = '+';
        return;
      }

      closeAll(item);
      item.classList.add('is-open');
      const icon = item.querySelector('.service-icon');
      if (icon) icon.textContent = '−';

      const rect = item.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
        item.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (!window.carAPI) return;

  try {
    const services = await window.carAPI.getServices();
    const formatMoney = (value) => `${new Intl.NumberFormat('ru-RU').format(Number(value || 0))} ₸`;

    items.forEach((item) => {
      const titleEl = item.querySelector('.service-title');
      const trigger = item.querySelector('.service-trigger');
      if (!titleEl || !trigger) return;

      const titleText = titleEl.textContent.trim().toLowerCase();
      const matched = services.find((service) => titleText.includes(String(service.name).trim().toLowerCase()) || String(service.name).trim().toLowerCase().includes(titleText));
      if (!matched || !Number.isFinite(matched.price_from)) return;

      let priceEl = trigger.querySelector('.service-price');
      if (!priceEl) {
        priceEl = document.createElement('span');
        priceEl.className = 'service-price';
        trigger.insertBefore(priceEl, trigger.querySelector('.service-icon'));
      }
      priceEl.textContent = `от ${formatMoney(matched.price_from)}`;
    });
  } catch (error) {
    console.error('Failed to load dynamic service prices:', error);
  }
});
