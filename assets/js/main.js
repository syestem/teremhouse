const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const getSiteConfig = () => window.SITE_CONFIG || {};

const getConfigValue = (path) =>
  path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), getSiteConfig());

const isTodoValue = (value) => !String(value || "").trim() || /\[?\s*TODO/i.test(String(value));

const visibleConfigValue = (value, fallback = "уточняется") =>
  isTodoValue(value) ? fallback : String(value).trim();

const encodeMessage = (message) => encodeURIComponent(message.trim());

const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}.${month}.${year}` : value;
};

const formatInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (value, days) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatInputDate(date);
};

const buildContactLinks = (message = getSiteConfig().defaultMessage || "") => {
  const config = getSiteConfig();
  const encoded = encodeMessage(message);

  return {
    whatsapp: `https://wa.me/${config.whatsappPhone}?text=${encoded}`,
    telegram: `https://t.me/${config.telegramUsername}?text=${encoded}`,
    email: `mailto:${config.email}?subject=${encodeURIComponent("Бронирование ТеремХаус")}&body=${encoded}`,
    phone: config.phoneHref,
    instagram: config.instagramUrl
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
  const config = getSiteConfig();

  qsa("[data-field]").forEach((node) => {
    const key = node.dataset.field;
    if (config.booking?.[key]) {
      node.textContent = config.booking[key];
    }
  });

  qsa("[data-contact='phone']").forEach((node) => {
    node.textContent = config.phoneDisplay;
  });

  qsa("[data-contact='email']").forEach((node) => {
    node.textContent = config.emailDisplay;
  });

  qsa("[data-config-text]").forEach((node) => {
    const value = getConfigValue(node.dataset.configText);
    const fallback = node.dataset.configFallback || "уточняется";
    node.textContent = visibleConfigValue(value, fallback);
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

  const map = config.map || {};
  qsa("[data-map-link='yandex']").forEach((link) => {
    if (map.placeUrl) link.setAttribute("href", map.placeUrl);
  });

  qsa("[data-map-link='google']").forEach((link) => {
    if (map.googleMapsUrl) link.setAttribute("href", map.googleMapsUrl);
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

const initScrollSpy = () => {
  const links = qsa("[data-nav] a[href^='#']");
  const targets = links
    .map((link) => qs(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !targets.length || !("IntersectionObserver" in window)) return;

  const setActive = (id) => {
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-24% 0px -62% 0px", threshold: [0, 0.01, 0.2] }
  );

  targets.forEach((target) => observer.observe(target));
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
  qsa(".accordion-item").forEach((item, index) => {
    const button = qs("button", item);
    const panel = qs(".accordion-panel", item);
    if (!button || !panel) return;

    button.id = button.id || `faq-button-${index + 1}`;
    panel.id = panel.id || `faq-panel-${index + 1}`;
    button.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", button.id);

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
  const carousel = qs("[data-reviews-carousel]");
  const track = qs("[data-reviews-track]");
  const cards = qsa(".review-card", track || document);
  const prev = qs("[data-review-prev]");
  const next = qs("[data-review-next]");

  if (!carousel || !track || !cards.length || !prev || !next) return;

  const cardStep = () => cards[0].getBoundingClientRect().width + 12;

  const updateButtons = () => {
    const atStart = carousel.scrollLeft <= 4;
    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
    prev.disabled = atStart;
    next.disabled = atEnd;
  };

  prev.addEventListener("click", () => {
    carousel.scrollBy({ left: -cardStep(), behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    carousel.scrollBy({ left: cardStep(), behavior: "smooth" });
  });

  carousel.addEventListener("scroll", updateButtons, { passive: true });
  window.addEventListener("resize", updateButtons);
  updateButtons();
};

const initStickyCta = () => {
  const stickyCta = qs("[data-mobile-cta]");
  const blockers = [qs("#contacts"), qs(".site-footer")].filter(Boolean);
  if (!stickyCta) return;

  const visibility = new Map(blockers.map((blocker) => [blocker, false]));

  const update = () => {
    const blocked = Array.from(visibility.values()).some(Boolean);
    stickyCta.classList.toggle("is-visible", window.scrollY > 420 && !blocked);
  };

  if (blockers.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibility.set(entry.target, entry.isIntersecting));
        update();
      },
      { rootMargin: "0px 0px 80px 0px", threshold: 0.01 }
    );
    blockers.forEach((blocker) => observer.observe(blocker));
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
};

const initBookingForm = () => {
  const form = qs("[data-booking-form]");
  const status = qs("[data-form-status]");
  const checkin = qs("[name='checkin']", form || document);
  const checkout = qs("[name='checkout']", form || document);
  const consent = qs("[name='personalDataConsent']", form || document);
  if (!form) return;

  const today = formatInputDate(new Date());
  checkin.min = today;
  checkout.min = addDays(today, 1);

  const showConsentError = () => {
    const message = "Пожалуйста, подтвердите согласие на обработку данных";
    consent?.setCustomValidity(message);
    if (status) {
      status.textContent = message;
      status.classList.add("is-error");
    }
  };

  const validateDates = () => {
    checkout.setCustomValidity("");

    if (checkin.value) {
      checkout.min = addDays(checkin.value, 1);
    } else {
      checkout.min = addDays(today, 1);
    }

    if (checkin.value && checkout.value && checkout.value <= checkin.value) {
      const message = "Дата выезда должна быть минимум на один день позже даты заезда.";
      checkout.setCustomValidity(message);
      if (status) {
        status.textContent = message;
        status.classList.add("is-error");
      }
      return false;
    }

    if (status?.classList.contains("is-error")) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
    return true;
  };

  const submitTo = (channel) => {
    if (consent && !consent.checked) {
      showConsentError();
      consent.reportValidity();
      return;
    }

    consent?.setCustomValidity("");
    if (!validateDates() || !form.reportValidity()) return;
    const message = buildBookingMessage(form);
    if (status) {
      const labels = {
        whatsapp: "Открываем WhatsApp с вашим запросом…",
        telegram: "Открываем Telegram с вашим запросом…",
        email: "Открываем письмо с вашим запросом…"
      };
      status.textContent = labels[channel] || labels.whatsapp;
      status.classList.remove("is-error");
    }
    openChannel(channel, message);
  };

  checkin.addEventListener("change", validateDates);
  checkout.addEventListener("change", validateDates);
  checkout.addEventListener("input", validateDates);
  consent?.addEventListener("invalid", showConsentError);
  consent?.addEventListener("change", () => {
    consent.setCustomValidity("");
    if (status?.classList.contains("is-error")) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitTo("whatsapp");
  });

  qsa("[data-form-channel]", form).forEach((button) => {
    button.addEventListener("click", () => submitTo(button.dataset.formChannel));
  });
};

const initCookieBanner = () => {
  const banner = qs("[data-cookie-banner]");
  const accept = qs("[data-cookie-accept]");
  if (!banner || !accept) return;

  const storageKey = "teremhouseCookieAccepted";
  let isAccepted = false;

  try {
    isAccepted = localStorage.getItem(storageKey) === "true";
  } catch (error) {
    isAccepted = false;
  }

  if (!isAccepted) {
    banner.hidden = false;
  }

  accept.addEventListener("click", () => {
    banner.hidden = true;
    try {
      localStorage.setItem(storageKey, "true");
    } catch (error) {
      // Если localStorage недоступен, баннер всё равно закрывается в текущей сессии.
    }
  });
};

const initMapFallback = () => {
  const config = getSiteConfig();
  const card = qs("[data-map-card]");
  const iframe = qs("[data-map-iframe]", card || document);
  const fallback = qs("[data-map-fallback]", card || document);
  if (!card || !iframe || !fallback) return;

  let timer = null;
  let settled = false;

  const showFallback = () => {
    if (settled) return;
    settled = true;
    card.classList.remove("is-map-loading", "is-map-loaded");
    card.classList.add("is-map-fallback");
  };

  const hideFallback = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    card.classList.remove("is-map-loading", "is-map-fallback");
    card.classList.add("is-map-loaded");
  };

  const startWatch = () => {
    if (timer || settled) return;
    card.classList.add("is-map-loading");
    timer = window.setTimeout(showFallback, 3800);
  };

  iframe.addEventListener("load", hideFallback, { once: true });
  iframe.addEventListener("error", showFallback, { once: true });

  if (config.map?.embedSrc) {
    iframe.setAttribute("src", config.map.embedSrc);
  }

  if (!iframe.getAttribute("src")) {
    showFallback();
    return;
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startWatch();
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px" }
    );
    observer.observe(card);
    return;
  }

  startWatch();
};

document.addEventListener("DOMContentLoaded", () => {
  applyEditableFields();
  initHeader();
  initScrollSpy();
  initReveal();
  initParallax();
  initAccordion();
  initGallery();
  initReviews();
  initStickyCta();
  initBookingForm();
  initCookieBanner();
  initMapFallback();
});
