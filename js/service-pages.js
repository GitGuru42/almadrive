document.addEventListener("DOMContentLoaded", () => {
  const animated = document.querySelectorAll(
    ".service-hero section, .service-metrics, .service-panel, .service-story, .service-route, .service-cta, .service-faq, .service-related, .service-footer"
  );

  animated.forEach((el, index) => {
    el.classList.add("service-animate");
    el.style.transitionDelay = `${Math.min(index * 60, 320)}ms`;
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  animated.forEach(el => observer.observe(el));

  const heroPrimary = document.querySelector(".service-hero__actions .service-btn--primary");
  const heroSecondary = document.querySelector(".service-hero__actions .service-btn--secondary");
  if (heroPrimary && window.matchMedia("(max-width: 780px)").matches) {
    document.body.classList.add("mobile-cta-active");
    const ctaBar = document.createElement("div");
    ctaBar.className = "mobile-cta-bar";
    ctaBar.innerHTML = `
      <a class="service-btn service-btn--primary" href="${heroPrimary.getAttribute("href")}">${heroPrimary.textContent.trim()}</a>
      <a class="service-btn service-btn--secondary" href="${heroSecondary ? heroSecondary.getAttribute("href") : '/#contact'}">Связаться</a>
    `;
    document.body.appendChild(ctaBar);
  }

  const currentPath = window.location.pathname;
  document.querySelectorAll('.service-topbar__nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.endsWith(href)) {
      link.style.color = '#fff';
      link.style.background = 'rgba(255,255,255,0.1)';
    }
  });
});
