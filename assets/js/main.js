/* TODO: замените контакты и условия на реальные перед публикацией. */
const SITE_CONFIG = {
  whatsappPhone: "70000000000",
  telegramUsername: "teremhouse_todo",
  instagramUrl: "#",
  phoneDisplay: "[TODO: телефон]",
  phoneHref: "tel:+70000000000",
  email: "hello@example.com",
  emailDisplay: "[TODO: email]",
  booking: {
    price: "60 000 ₽/сутки (уточнить)",
    prepayment: "20% (уточнить)",
    deposit: "15 000 ₽ (уточнить)",
    cleaning: "10 000 ₽ (уточнить)",
    checkIn: "с 14:00",
    checkOut: "до 12:00",
    payment: "[TODO: способы оплаты]"
  },
  defaultMessage:
    "Здравствуйте! Хочу уточнить свободные даты и условия бронирования коттеджа «ТеремХаус»."
};

const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const encodeMessage = (message) => encodeURIComponent(message.trim());

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}.${month}.${year}` : value;
};

const buildContactLinks = (message = SITE_CONFIG.defaultMessage) => {
  const encoded = encodeMessage(message);

  return {
    whatsapp: `https://wa.me/${SITE_CONFIG.whatsappPhone}?text=${encoded}`,
    telegram: `https://t.me/${SITE_CONFIG.telegramUsername}?text=${encoded}`,
    email: `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent("Бронирование ТеремХаус")}&body=${encoded}`,
    phone: SITE_CONFIG.phoneHref,
    instagram: SITE_CONFIG.instagramUrl
  };
};

const buildBookingMessage = (form) => {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const checkin = formatDate(String(data.get("checkin") || ""));
  const checkout = formatDate(String(data.get("checkout") || ""));
  const guests = String(data.get("guests") || "").trim();
  const message = String(data.get("message") || "").trim();

  return [
    "Здравствуйте! Хочу забронировать коттедж «ТеремХаус».",
    name ? `Имя: ${name}` : "",
    phone ? `Телефон: ${phone}` : "",
    checkin ? `Заезд: ${checkin}` : "",
    checkout ? `Выезд: ${checkout}` : "",
    guests ? `Гостей: ${guests}` : "",
    message ? `Комментарий: ${message}` : "",
    "",
    "Пожалуйста, подскажите свободные даты и итоговые условия."
  ]
    .filter(Boolean)
    .join("\n");
};

const openChannel = (channel, message) => {
  const links = buildContactLinks(message);
  const url = links[channel] || links.whatsapp;
  window.open(url, "_blank", "noopener,noreferrer");
};

const applyEditableFields = () => {
  qsa("[data-field]").forEach((node) => {
    const key = node.dataset.field;
    if (SITE_CONFIG.booking[key]) {
      node.textContent = SITE_CONFIG.booking[key];
    }
  });

  qsa("[data-contact='phone']").forEach((node) => {
    node.textContent = SITE_CONFIG.phoneDisplay;
  });

  qsa("[data-contact='email']").forEach((node) => {
    node.textContent = SITE_CONFIG.emailDisplay;
  });

  qsa("[data-link]").forEach((link) => {
    const type = link.dataset.link;
    const links = buildContactLinks();
    if (links[type]) {
      link.setAttribute("href", links[type]);
      link.setAttribute("target", type === "phone" ? "_self" : "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
};

const initHeader = () => {
  const header = qs("[data-header]");
  const nav = qs("[data-nav]");
  const toggle = qs("[data-nav-toggle]");

  if (!header || !nav || !toggle) return;

  const closeNav = () => {
    document.body.classList.remove("nav-open");
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    document.body.classList.toggle("nav-open", !isOpen);
    nav.classList.toggle("is-open", !isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  qsa("a", nav).forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNav();
  });

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
};

const initReveal = () => {
  const items = qsa(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
};

const initParallax = () => {
  const hero = qs(".hero");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const update = () => {
    const offset = Math.min(window.scrollY * 0.08, 34);
    hero.style.setProperty("--hero-parallax", `${offset}px`);
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
};

const initAccordion = () => {
  qsa(".accordion-item").forEach((item) => {
    const button = qs("button", item);
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });
};

const initGallery = () => {
  const lightbox = qs("[data-lightbox]");
  const image = qs("[data-lightbox-image]");
  const caption = qs("[data-lightbox-caption]");
  const closeButton = qs("[data-lightbox-close]");
  const nextButton = qs("[data-lightbox-next]");
  const prevButton = qs("[data-lightbox-prev]");
  const items = qsa("[data-gallery] .gallery-item");

  if (!lightbox || !image || !caption || !items.length) return;

  let activeIndex = 0;

  const render = () => {
    const item = items[activeIndex];
    const source = item.dataset.full || qs("img", item)?.src || "";
    const text = item.dataset.caption || qs("img", item)?.alt || "";
    image.src = source;
    image.alt = text;
    caption.textContent = text;
  };

  const open = (index) => {
    activeIndex = index;
    render();
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeButton?.focus();
  };

  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    items[activeIndex]?.focus();
  };

  const move = (step) => {
    activeIndex = (activeIndex + step + items.length) % items.length;
    render();
  };

  items.forEach((item, index) => {
    item.addEventListener("click", () => open(index));
  });

  closeButton?.addEventListener("click", close);
  nextButton?.addEventListener("click", () => move(1));
  prevButton?.addEventListener("click", () => move(-1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
  });
};

const initReviews = () => {
  const track = qs("[data-reviews-track]");
  const cards = qsa(".review-card", track || document);
  const prev = qs("[data-review-prev]");
  const next = qs("[data-review-next]");

  if (!track || !cards.length || !prev || !next) return;

  let index = 0;

  const visibleCount = () => (window.matchMedia("(min-width: 900px)").matches ? 3 : 1);

  const update = () => {
    const maxIndex = Math.max(cards.length - visibleCount(), 0);
    index = Math.min(index, maxIndex);
    const cardWidth = cards[0].getBoundingClientRect().width + (visibleCount() > 1 ? 12 : 0);
    track.style.transform = `translateX(${-index * cardWidth}px)`;
    prev.disabled = index === 0;
    next.disabled = index === maxIndex;
  };

  prev.addEventListener("click", () => {
    index = Math.max(index - 1, 0);
    update();
  });

  next.addEventListener("click", () => {
    index += 1;
    update();
  });

  window.addEventListener("resize", update);
  update();
};

const initBookingForm = () => {
  const form = qs("[data-booking-form]");
  const status = qs("[data-form-status]");
  if (!form) return;

  const submitTo = (channel) => {
    if (!form.reportValidity()) return;
    const message = buildBookingMessage(form);
    openChannel(channel, message);
    if (status) {
      status.textContent =
        channel === "email"
          ? "Откроется письмо с подготовленным текстом."
          : "Откроется мессенджер с подготовленным текстом.";
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitTo("whatsapp");
  });

  qsa("[data-form-channel]", form).forEach((button) => {
    button.addEventListener("click", () => submitTo(button.dataset.formChannel));
  });
};

document.addEventListener("DOMContentLoaded", () => {
  applyEditableFields();
  initHeader();
  initReveal();
  initParallax();
  initAccordion();
  initGallery();
  initReviews();
  initBookingForm();
});
