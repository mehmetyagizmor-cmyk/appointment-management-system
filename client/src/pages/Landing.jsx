import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";

const SITE_URL = "https://randevu-yonetim-sistemi.example.com";

const CONTENT = {
  tr: {
    htmlLang: "tr",
    ogLocale: "tr_TR",
    path: "/",
    bookingPath: "/randevu-al",
    seo: {
      title: "Randevu Yönetim Sistemi | Online Randevu & İşletme Paneli",
      description:
        "Kuaför, berber, klinik, spor salonu ve danışmanlık ofisleri için uçtan uca randevu yönetim sistemi. Müşterileriniz 7/24 online randevu alsın, siz tek panelden yönetin.",
    },
    langSwitch: { label: "EN", to: "/en", title: "Switch to English" },
    nav: {
      features: "Özellikler",
      how: "Nasıl Çalışır",
      pricing: "Fiyatlandırma",
      faq: "SSS",
      login: "Giriş Yap",
      buy: "Satın Al",
    },
    hero: {
      eyebrow: "Randevu tabanlı işletmeler için",
      titleLine1: "Randevularınızı kağıttan kurtarın,",
      titlePrefix: "işletmenizi ",
      titleEm: "büyütün",
      titleAfter: ".",
      subtitle:
        "Kuaförden kliniğe, spor salonundan danışmanlık ofisine — tüm randevularınızı tek ekrandan yönetin. Müşterileriniz sizi aramadan, doğrudan online randevu alsın.",
      ctaPrimary: "Canlı demoyu incele →",
      ctaSecondary: "Fiyatlandırmayı gör",
      trust: [
        "✓ Kurulumu tamam, hemen kullanıma hazır",
        "✓ Verileriniz size ait",
        "✓ Her işletme tipine uyarlanabilir",
      ],
      mockDays: ["Pzt", "Sal", "Çar", "Per", "Cum"],
      badgeTop: "bu hafta randevu",
      badgeBottom: "komisyon, tüm gelir size ait",
    },
    strip: [
      { value: "7/24", label: "online randevu imkanı" },
      { value: "0₺", label: "komisyon veya işlem ücreti" },
      { value: "< 1 gün", label: "kurulum ve devreye alma süresi" },
      { value: "∞", label: "koltuk / personel / hizmet ekleme" },
    ],
    featuresEyebrow: "Özellikler",
    featuresTitle: "Bir işletmeyi yönetmek için gereken her şey",
    featuresSubtitle:
      "Randevu defterinden dijital panele geçişte hiçbir şeyi eksik bırakmadık.",
    features: [
      {
        icon: "🗓",
        title: "Haftalık takvim görünümü",
        desc: "Tüm koltuk, personel veya odalarınızı tek ekranda görün; boş bir saate tıklayıp saniyeler içinde randevu oluşturun.",
      },
      {
        icon: "🌐",
        title: "Müşteriler kendi randevusunu alsın",
        desc: "Herkese açık randevu sayfanız sayesinde müşterileriniz telefonla aramadan, 7/24 kendi randevusunu oluşturabilir.",
      },
      {
        icon: "✂",
        title: "Hizmet ve fiyat yönetimi",
        desc: "Sunduğunuz her hizmeti süresi ve fiyatıyla tanımlayın; randevu formunda otomatik olarak listelensin.",
      },
      {
        icon: "👥",
        title: "Sınırsız kaynak / personel",
        desc: "Koltuk, uzman, oda ya da ekipman — işletmenize göre adlandırıp istediğiniz kadar kaynak ekleyin.",
      },
      {
        icon: "🔒",
        title: "Çakışma önleme ve güvenli giriş",
        desc: "Aynı saatte aynı kaynağa iki randevu asla düşmez. Yönetim paneli şifreli giriş ile korunur.",
      },
      {
        icon: "📊",
        title: "Anlık istatistikler",
        desc: "Bugünkü ve bu haftaki randevu sayısı, aylık ciro tahmini ve en çok tercih edilen hizmetleri tek bakışta görün.",
      },
    ],
    stepsEyebrow: "Nasıl Çalışır",
    stepsTitle: "3 adımda kullanıma hazır",
    steps: [
      {
        n: "1",
        title: "İşletmenizi tanımlayın",
        desc: "İşletme adınızı, çalışma saatlerinizi, koltuk/personel sayınızı ve hizmetlerinizi birkaç dakikada girin.",
      },
      {
        n: "2",
        title: "Randevu sayfanızı paylaşın",
        desc: "Size özel randevu linkini Instagram biyografinize, Google İşletme profilinize veya WhatsApp'a ekleyin.",
      },
      {
        n: "3",
        title: "Panelden yönetin",
        desc: "Gelen randevuları takvimde görün, telefonla gelen müşteriler için manuel randevu ekleyin, gün sonunda raporu inceleyin.",
      },
    ],
    compare: {
      eyebrow: "Neden değişmeli?",
      title: "Defter ve telefonla randevu takibinin bittiği yer",
      subtitle:
        "Kağıt defterde çakışan randevular, cevapsız aramalar ve kaybolan notlar olmaz. Her şey tek bir yerde, her zaman erişilebilir.",
      headBefore: "Defter / Telefon",
      headAfter: "Randevu Yönetim Sistemi",
      rows: [
        ["Çakışan randevu riski", "Yüksek", "Yok"],
        ["Müşteri kendi randevusunu alabilir mi?", "Hayır", "Evet, 7/24"],
        ["Günlük/haftalık görünüm", "Elle çizilir", "Otomatik, anlık"],
        ["Gelir ve doluluk takibi", "Yok", "Anlık istatistik paneli"],
        ["Birden çok koltuk/personel", "Karışık", "Tek ekranda net"],
      ],
    },
    pricing: {
      eyebrow: "Fiyatlandırma",
      title: "Net ve tek seferlik",
      subtitle:
        "Abonelik ya da komisyon yok. Kurulumla birlikte sistem size teslim edilir, işletmenize göre özelleştirilir.",
      standard: {
        name: "Standart Paket",
        desc: "Tek şube, tek panel — hemen başlayın.",
        priceCurrency: "₺",
        priceLabel: "İletişime göre teklif",
        features: [
          "✓ Sınırsız randevu ve müşteri kaydı",
          "✓ Sınırsız koltuk / personel / hizmet",
          "✓ Herkese açık online randevu sayfası",
          "✓ İstatistik paneli",
          "✓ Kurulum ve teslim desteği",
        ],
        cta: "Satın Al / Teklif İste",
        mailSubject: "Randevu Yönetim Sistemi - Teklif Talebi",
      },
      custom: {
        badge: "Önerilen",
        name: "Özelleştirilmiş Paket",
        desc: "Çoklu şube, SMS/e-posta hatırlatma, online ödeme gibi ek ihtiyaçlarınız için.",
        priceCurrency: "₺",
        priceLabel: "Görüşerek belirlenir",
        features: [
          "✓ Standart paketteki her şey",
          "✓ Şubeye özel ek modüller",
          "✓ Marka renginize göre tasarım",
          "✓ Öncelikli destek",
        ],
        cta: "Görüşme Talep Et",
        mailSubject: "Randevu Yönetim Sistemi - Özel Teklif",
      },
    },
    faqEyebrow: "Sık Sorulan Sorular",
    faqTitle: "Merak edilenler",
    faqs: [
      {
        q: "Verilerimiz nerede tutuluyor, güvenli mi?",
        a: "Tüm randevu, müşteri ve işletme verileriniz kendi sunucunuzdaki veritabanında saklanır; üçüncü bir platforma bağımlı değilsiniz. Yönetim paneline yalnızca şifrenizi bilen kişiler erişebilir.",
      },
      {
        q: "Kurulum ne kadar sürer?",
        a: "Sistem kurulu haliyle teslim edilir. İşletme adınızı, çalışma saatlerinizi ve hizmetlerinizi girmeniz yeterli — aynı gün kullanmaya başlayabilirsiniz.",
      },
      {
        q: "Sadece kuaför/berber için mi uygun?",
        a: "Hayır. 'Koltuk' etiketini istediğiniz gibi değiştirebilirsiniz — diyetisyen için 'Uzman', klinik için 'Oda', spor salonu için 'Antrenör' olarak kullanan işletmeler de var.",
      },
      {
        q: "Mevcut özelliklere ek istek iletebilir miyim?",
        a: "Evet. SMS/e-posta hatırlatma, online ödeme veya çoklu şube gibi ek modüller talebe göre eklenebilir.",
      },
    ],
    cta: {
      title: "İşletmenizi bugün dijitalleştirin",
      subtitle:
        "Canlı demo üzerinden randevu alma akışını deneyin, ardından işletmeniz için kurulumu birlikte tamamlayalım.",
      primary: "Canlı demoyu incele",
      secondary: "Bize ulaşın",
      mailSubject: "Randevu Yönetim Sistemi - Bilgi Talebi",
    },
    footer: {
      rights: "Tüm hakları saklıdır.",
      adminLogin: "Yönetici Girişi",
      bookNow: "Randevu Al",
      contact: "İletişim",
    },
  },

  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    path: "/en",
    bookingPath: "/book",
    seo: {
      title: "Appointment Manager | Online Booking & Business Dashboard",
      description:
        "End-to-end appointment scheduling for salons, barbershops, clinics, gyms and consulting offices. Let clients book online 24/7 while you run everything from one dashboard.",
    },
    langSwitch: { label: "TR", to: "/", title: "Türkçe'ye geç" },
    nav: {
      features: "Features",
      how: "How it works",
      pricing: "Pricing",
      faq: "FAQ",
      login: "Log in",
      buy: "Get started",
    },
    hero: {
      eyebrow: "For appointment-based businesses",
      titleLine1: "Ditch the paper book,",
      titlePrefix: "",
      titleEm: "grow",
      titleAfter: " your business.",
      subtitle:
        "From salons to clinics, gyms to consulting offices — manage every appointment from one screen. Let clients book directly online, no phone calls needed.",
      ctaPrimary: "See the live demo →",
      ctaSecondary: "View pricing",
      trust: [
        "✓ Fully set up, ready to use right away",
        "✓ Your data stays yours",
        "✓ Adapts to any appointment-based business",
      ],
      mockDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      badgeTop: "bookings this week",
      badgeBottom: "commission — you keep 100% of revenue",
    },
    strip: [
      { value: "24/7", label: "online booking availability" },
      { value: "0%", label: "commission or transaction fees" },
      { value: "< 1 day", label: "setup and go-live time" },
      { value: "∞", label: "resources / staff / services" },
    ],
    featuresEyebrow: "Features",
    featuresTitle: "Everything you need to run a business",
    featuresSubtitle:
      "From paper booking to a digital dashboard — we didn't leave anything out.",
    features: [
      {
        icon: "🗓",
        title: "Weekly calendar view",
        desc: "See every chair, staff member or room on one screen; click an open slot to create a booking in seconds.",
      },
      {
        icon: "🌐",
        title: "Let clients book themselves",
        desc: "With your public booking page, clients can book anytime, 24/7, without ever calling you.",
      },
      {
        icon: "✂",
        title: "Services & pricing",
        desc: "Define every service with its duration and price; it's listed automatically in the booking form.",
      },
      {
        icon: "👥",
        title: "Unlimited staff & resources",
        desc: "Chairs, specialists, rooms or equipment — name them however fits your business and add as many as you need.",
      },
      {
        icon: "🔒",
        title: "Conflict-free & secure login",
        desc: "The same resource can never be double-booked at the same time. The dashboard is protected behind a secure login.",
      },
      {
        icon: "📊",
        title: "Live stats",
        desc: "See today's and this week's bookings, estimated monthly revenue, and your most-booked services at a glance.",
      },
    ],
    stepsEyebrow: "How it works",
    stepsTitle: "Live in 3 steps",
    steps: [
      {
        n: "1",
        title: "Set up your business",
        desc: "Add your business name, working hours, number of staff/resources and services in a few minutes.",
      },
      {
        n: "2",
        title: "Share your booking link",
        desc: "Add your personal booking link to your Instagram bio, Google Business profile or WhatsApp.",
      },
      {
        n: "3",
        title: "Manage it from the dashboard",
        desc: "See incoming bookings on the calendar, add manual bookings for phone-in clients, and review your daily report.",
      },
    ],
    compare: {
      eyebrow: "Why switch?",
      title: "Where notebooks and phone bookings stop working",
      subtitle:
        "No more double-bookings, missed calls or lost notes scribbled on paper. Everything lives in one place, accessible anytime.",
      headBefore: "Notebook / Phone",
      headAfter: "Appointment Manager",
      rows: [
        ["Risk of double-booking", "High", "None"],
        ["Can clients book themselves?", "No", "Yes, 24/7"],
        ["Daily / weekly view", "Drawn by hand", "Automatic, real-time"],
        ["Revenue & utilization tracking", "None", "Live stats dashboard"],
        ["Multiple chairs / staff", "Messy", "Clear, single screen"],
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Clear and one-time",
      subtitle:
        "No subscriptions, no commissions. The system is delivered fully set up and customized to your business.",
      standard: {
        name: "Standard Plan",
        desc: "Single location, single dashboard — get started right away.",
        priceCurrency: "$",
        priceLabel: "Get a quote",
        features: [
          "✓ Unlimited bookings & client records",
          "✓ Unlimited resources / staff / services",
          "✓ Public online booking page",
          "✓ Stats dashboard",
          "✓ Setup & delivery support",
        ],
        cta: "Buy / Request a quote",
        mailSubject: "Appointment Manager - Quote Request",
      },
      custom: {
        badge: "Recommended",
        name: "Custom Plan",
        desc: "For multi-location businesses and extras like SMS/email reminders or online payments.",
        priceCurrency: "$",
        priceLabel: "Priced on a call",
        features: [
          "✓ Everything in Standard",
          "✓ Location-specific add-on modules",
          "✓ Design matched to your brand colors",
          "✓ Priority support",
        ],
        cta: "Request a call",
        mailSubject: "Appointment Manager - Custom Quote",
      },
    },
    faqEyebrow: "FAQ",
    faqTitle: "Common questions",
    faqs: [
      {
        q: "Where is our data stored — is it secure?",
        a: "All appointment, client and business data is stored in a database on your own server; you don't depend on a third-party platform. Only people who know your password can access the dashboard.",
      },
      {
        q: "How long does setup take?",
        a: "The system is delivered already installed. Just add your business name, working hours and services — you can start using it the same day.",
      },
      {
        q: "Is it only for salons and barbershops?",
        a: "No. The 'chair' label can be renamed to anything — businesses use 'Specialist' for dietitians, 'Room' for clinics, or 'Trainer' for gyms.",
      },
      {
        q: "Can I request features beyond what's listed?",
        a: "Yes. Add-on modules like SMS/email reminders, online payments or multi-location support can be added on request.",
      },
    ],
    cta: {
      title: "Digitize your business today",
      subtitle:
        "Try the booking flow in the live demo, then let's finish setting it up for your business together.",
      primary: "See the live demo",
      secondary: "Contact us",
      mailSubject: "Appointment Manager - Information Request",
    },
    footer: {
      rights: "All rights reserved.",
      adminLogin: "Admin Login",
      bookNow: "Book Now",
      contact: "Contact",
    },
  },
};

function useLandingSeo(t) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = t.seo.title;
    document.documentElement.lang = t.htmlLang;

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) return null;
      const prev = el.getAttribute(attr);
      el.setAttribute(attr, value);
      return () => el && el.setAttribute(attr, prev ?? "");
    };

    const restores = [
      setMeta('meta[name="description"]', "content", t.seo.description),
      setMeta('meta[property="og:title"]', "content", t.seo.title),
      setMeta('meta[property="og:description"]', "content", t.seo.description),
      setMeta('meta[property="og:locale"]', "content", t.ogLocale),
      setMeta('meta[name="twitter:title"]', "content", t.seo.title),
      setMeta('meta[name="twitter:description"]', "content", t.seo.description),
      setMeta('link[rel="canonical"]', "href", `${SITE_URL}${t.path}`),
    ];

    return () => {
      document.title = prevTitle;
      restores.forEach((restore) => restore && restore());
    };
  }, [t]);
}

function Landing({ lang = "tr" }) {
  const t = CONTENT[lang] ?? CONTENT.tr;
  const [scrolled, setScrolled] = useState(false);

  useLandingSeo(t);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brandName =
    lang === "en" ? "Appointment Manager" : "Randevu Yönetim Sistemi";

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <Link to={t.path} className="landing-logo">
            <span className="admin-brand-mark">R</span>
            {brandName}
          </Link>
          <nav className="landing-nav-links">
            <a href="#ozellikler">{t.nav.features}</a>
            <a href="#nasil-calisir">{t.nav.how}</a>
            <a href="#fiyatlandirma">{t.nav.pricing}</a>
            <a href="#sss">{t.nav.faq}</a>
          </nav>
          <div className="landing-nav-actions">
            <Link
              to={t.langSwitch.to}
              className="btn btn-ghost btn-lang"
              title={t.langSwitch.title}
            >
              {t.langSwitch.label}
            </Link>
            <Link to="/giris" className="btn btn-ghost">
              {t.nav.login}
            </Link>
            <a href="#fiyatlandirma" className="btn btn-primary">
              {t.nav.buy}
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <Reveal className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>
              {t.hero.titleLine1}
              <br />
              {t.hero.titlePrefix}
              <em>{t.hero.titleEm}</em>
              {t.hero.titleAfter}
            </h1>
            <p className="hero-subtitle">{t.hero.subtitle}</p>
            <div className="hero-actions">
              <Link to={t.bookingPath} className="btn btn-primary btn-lg">
                {t.hero.ctaPrimary}
              </Link>
              <a href="#fiyatlandirma" className="btn btn-ghost btn-lg">
                {t.hero.ctaSecondary}
              </a>
            </div>
            <div className="hero-trust">
              {t.hero.trust.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </Reveal>

          <Reveal className="hero-visual" delay={150} aria-hidden="true">
            <div className="mock-window">
              <div className="mock-window-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="mock-schedule">
                <div className="mock-schedule-row mock-schedule-head">
                  <div />
                  {t.hero.mockDays.map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                {["09:00", "10:00", "11:00", "12:00", "13:00"].map((time, i) => (
                  <div className="mock-schedule-row" key={time}>
                    <div className="mock-hour">{time}</div>
                    {Array.from({ length: 5 }).map((_, j) => {
                      const booked = (i + j) % 3 === 0;
                      return (
                        <div
                          key={j}
                          className={`mock-cell ${booked ? "booked" : ""}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mock-badge mock-badge-top">
              <strong>+24</strong> {t.hero.badgeTop}
            </div>
            <div className="mock-badge mock-badge-bottom">
              <strong>{lang === "en" ? "0%" : "%0"}</strong> {t.hero.badgeBottom}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="strip">
        <Reveal as="div" className="strip-inner">
          {t.strip.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </Reveal>
      </section>

      <section id="ozellikler" className="section">
        <div className="section-inner">
          <span className="eyebrow center">{t.featuresEyebrow}</span>
          <h2 className="section-title">{t.featuresTitle}</h2>
          <p className="section-subtitle">{t.featuresSubtitle}</p>

          <div className="feature-grid">
            {t.features.map((f, i) => (
              <Reveal as="div" className="feature-card" key={f.title} delay={i * 70}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil-calisir" className="section section-alt">
        <div className="section-inner">
          <span className="eyebrow center">{t.stepsEyebrow}</span>
          <h2 className="section-title">{t.stepsTitle}</h2>

          <div className="steps-grid">
            {t.steps.map((s, i) => (
              <Reveal as="div" className="step-card" key={s.n} delay={i * 100}>
                <div className="step-number">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner compare-inner">
          <Reveal as="div" className="compare-copy">
            <span className="eyebrow">{t.compare.eyebrow}</span>
            <h2 className="section-title left">{t.compare.title}</h2>
            <p className="section-subtitle left">{t.compare.subtitle}</p>
          </Reveal>

          <Reveal as="div" className="compare-table" delay={120}>
            <div className="compare-row compare-head">
              <div />
              <div>{t.compare.headBefore}</div>
              <div>{t.compare.headAfter}</div>
            </div>
            {t.compare.rows.map(([label, before, after]) => (
              <div className="compare-row" key={label}>
                <div className="compare-label">{label}</div>
                <div className="compare-before">{before}</div>
                <div className="compare-after">{after}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="fiyatlandirma" className="section section-alt">
        <div className="section-inner">
          <span className="eyebrow center">{t.pricing.eyebrow}</span>
          <h2 className="section-title">{t.pricing.title}</h2>
          <p className="section-subtitle">{t.pricing.subtitle}</p>

          <div className="pricing-grid">
            <Reveal as="div" className="price-card">
              <h3>{t.pricing.standard.name}</h3>
              <p className="price-desc">{t.pricing.standard.desc}</p>
              <div className="price-amount">
                <span className="price-currency">{t.pricing.standard.priceCurrency}</span>
                <span>{t.pricing.standard.priceLabel}</span>
              </div>
              <ul className="price-features">
                {t.pricing.standard.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                className="btn btn-primary btn-block"
                href={`mailto:mehmetyagizmor@gmail.com?subject=${encodeURIComponent(
                  t.pricing.standard.mailSubject
                )}`}
              >
                {t.pricing.standard.cta}
              </a>
            </Reveal>

            <Reveal as="div" className="price-card price-card-highlight" delay={100}>
              <span className="price-badge">{t.pricing.custom.badge}</span>
              <h3>{t.pricing.custom.name}</h3>
              <p className="price-desc">{t.pricing.custom.desc}</p>
              <div className="price-amount">
                <span className="price-currency">{t.pricing.custom.priceCurrency}</span>
                <span>{t.pricing.custom.priceLabel}</span>
              </div>
              <ul className="price-features">
                {t.pricing.custom.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                className="btn btn-primary btn-block"
                href={`mailto:mehmetyagizmor@gmail.com?subject=${encodeURIComponent(
                  t.pricing.custom.mailSubject
                )}`}
              >
                {t.pricing.custom.cta}
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="sss" className="section">
        <div className="section-inner">
          <span className="eyebrow center">{t.faqEyebrow}</span>
          <h2 className="section-title">{t.faqTitle}</h2>

          <Reveal as="div" className="faq-list">
            {t.faqs.map((f) => (
              <details className="faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="cta-banner">
        <Reveal as="div" className="cta-banner-inner">
          <h2>{t.cta.title}</h2>
          <p>{t.cta.subtitle}</p>
          <div className="hero-actions center">
            <Link to={t.bookingPath} className="btn btn-primary btn-lg">
              {t.cta.primary}
            </Link>
            <a
              className="btn btn-ghost btn-lg btn-invert"
              href={`mailto:mehmetyagizmor@gmail.com?subject=${encodeURIComponent(
                t.cta.mailSubject
              )}`}
            >
              {t.cta.secondary}
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <span className="admin-brand-mark">R</span>
            {brandName}
          </div>
          <p>
            © {new Date().getFullYear()} {t.footer.rights}
          </p>
          <div className="landing-footer-links">
            <Link to="/giris">{t.footer.adminLogin}</Link>
            <Link to={t.bookingPath}>{t.footer.bookNow}</Link>
            <a href="mailto:mehmetyagizmor@gmail.com">{t.footer.contact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
