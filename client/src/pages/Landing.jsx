import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";

const FEATURES = [
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
];

const STEPS = [
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
];

const FAQS = [
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
];

function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo">
            <span className="admin-brand-mark">R</span>
            Randevu Yönetim Sistemi
          </Link>
          <nav className="landing-nav-links">
            <a href="#ozellikler">Özellikler</a>
            <a href="#nasil-calisir">Nasıl Çalışır</a>
            <a href="#fiyatlandirma">Fiyatlandırma</a>
            <a href="#sss">SSS</a>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/giris" className="btn btn-ghost">
              Giriş Yap
            </Link>
            <a href="#fiyatlandirma" className="btn btn-primary">
              Satın Al
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <Reveal className="hero-copy">
            <span className="eyebrow">Randevu tabanlı işletmeler için</span>
            <h1>
              Randevularınızı kağıttan kurtarın,
              <br />
              işletmenizi <em>büyütün</em>.
            </h1>
            <p className="hero-subtitle">
              Kuaförden kliniğe, spor salonundan danışmanlık ofisine — tüm
              randevularınızı tek ekrandan yönetin. Müşterileriniz sizi
              aramadan, doğrudan online randevu alsın.
            </p>
            <div className="hero-actions">
              <Link to="/randevu-al" className="btn btn-primary btn-lg">
                Canlı demoyu incele →
              </Link>
              <a href="#fiyatlandirma" className="btn btn-ghost btn-lg">
                Fiyatlandırmayı gör
              </a>
            </div>
            <div className="hero-trust">
              <span>✓ Kurulumu tamam, hemen kullanıma hazır</span>
              <span>✓ Verileriniz size ait</span>
              <span>✓ Her işletme tipine uyarlanabilir</span>
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
                  <div>Pzt</div>
                  <div>Sal</div>
                  <div>Çar</div>
                  <div>Per</div>
                  <div>Cum</div>
                </div>
                {["09:00", "10:00", "11:00", "12:00", "13:00"].map((t, i) => (
                  <div className="mock-schedule-row" key={t}>
                    <div className="mock-hour">{t}</div>
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
              <strong>+24</strong> bu hafta randevu
            </div>
            <div className="mock-badge mock-badge-bottom">
              <strong>%0</strong> komisyon, tüm gelir size ait
            </div>
          </Reveal>
        </div>
      </section>

      <section className="strip">
        <Reveal as="div" className="strip-inner">
          <div>
            <strong>7/24</strong>
            <span>online randevu imkanı</span>
          </div>
          <div>
            <strong>0₺</strong>
            <span>komisyon veya işlem ücreti</span>
          </div>
          <div>
            <strong>&lt; 1 gün</strong>
            <span>kurulum ve devreye alma süresi</span>
          </div>
          <div>
            <strong>∞</strong>
            <span>koltuk / personel / hizmet ekleme</span>
          </div>
        </Reveal>
      </section>

      <section id="ozellikler" className="section">
        <div className="section-inner">
          <span className="eyebrow center">Özellikler</span>
          <h2 className="section-title">Bir işletmeyi yönetmek için gereken her şey</h2>
          <p className="section-subtitle">
            Randevu defterinden dijital panele geçişte hiçbir şeyi eksik bırakmadık.
          </p>

          <div className="feature-grid">
            {FEATURES.map((f, i) => (
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
          <span className="eyebrow center">Nasıl Çalışır</span>
          <h2 className="section-title">3 adımda kullanıma hazır</h2>

          <div className="steps-grid">
            {STEPS.map((s, i) => (
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
            <span className="eyebrow">Neden değişmeli?</span>
            <h2 className="section-title left">
              Defter ve telefonla randevu takibinin bittiği yer
            </h2>
            <p className="section-subtitle left">
              Kağıt defterde çakışan randevular, cevapsız aramalar ve kaybolan
              notlar olmaz. Her şey tek bir yerde, her zaman erişilebilir.
            </p>
          </Reveal>

          <Reveal as="div" className="compare-table" delay={120}>
            <div className="compare-row compare-head">
              <div />
              <div>Defter / Telefon</div>
              <div>Randevu Yönetim Sistemi</div>
            </div>
            {[
              ["Çakışan randevu riski", "Yüksek", "Yok"],
              ["Müşteri kendi randevusunu alabilir mi?", "Hayır", "Evet, 7/24"],
              ["Günlük/haftalık görünüm", "Elle çizilir", "Otomatik, anlık"],
              ["Gelir ve doluluk takibi", "Yok", "Anlık istatistik paneli"],
              ["Birden çok koltuk/personel", "Karışık", "Tek ekranda net"],
            ].map(([label, before, after]) => (
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
          <span className="eyebrow center">Fiyatlandırma</span>
          <h2 className="section-title">Net ve tek seferlik</h2>
          <p className="section-subtitle">
            Abonelik ya da komisyon yok. Kurulumla birlikte sistem size teslim
            edilir, işletmenize göre özelleştirilir.
          </p>

          <div className="pricing-grid">
            <Reveal as="div" className="price-card">
              <h3>Standart Paket</h3>
              <p className="price-desc">Tek şube, tek panel — hemen başlayın.</p>
              <div className="price-amount">
                <span className="price-currency">₺</span>
                <span>İletişime göre teklif</span>
              </div>
              <ul className="price-features">
                <li>✓ Sınırsız randevu ve müşteri kaydı</li>
                <li>✓ Sınırsız koltuk / personel / hizmet</li>
                <li>✓ Herkese açık online randevu sayfası</li>
                <li>✓ İstatistik paneli</li>
                <li>✓ Kurulum ve teslim desteği</li>
              </ul>
              <a
                className="btn btn-primary btn-block"
                href="mailto:mehmetyagizmor@gmail.com?subject=Randevu%20Y%C3%B6netim%20Sistemi%20-%20Teklif%20Talebi"
              >
                Satın Al / Teklif İste
              </a>
            </Reveal>

            <Reveal as="div" className="price-card price-card-highlight" delay={100}>
              <span className="price-badge">Önerilen</span>
              <h3>Özelleştirilmiş Paket</h3>
              <p className="price-desc">
                Çoklu şube, SMS/e-posta hatırlatma, online ödeme gibi ek
                ihtiyaçlarınız için.
              </p>
              <div className="price-amount">
                <span className="price-currency">₺</span>
                <span>Görüşerek belirlenir</span>
              </div>
              <ul className="price-features">
                <li>✓ Standart paketteki her şey</li>
                <li>✓ Şubeye özel ek modüller</li>
                <li>✓ Marka renginize göre tasarım</li>
                <li>✓ Öncelikli destek</li>
              </ul>
              <a
                className="btn btn-primary btn-block"
                href="mailto:mehmetyagizmor@gmail.com?subject=Randevu%20Y%C3%B6netim%20Sistemi%20-%20%C3%96zel%20Teklif"
              >
                Görüşme Talep Et
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="sss" className="section">
        <div className="section-inner">
          <span className="eyebrow center">Sık Sorulan Sorular</span>
          <h2 className="section-title">Merak edilenler</h2>

          <Reveal as="div" className="faq-list">
            {FAQS.map((f) => (
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
          <h2>İşletmenizi bugün dijitalleştirin</h2>
          <p>
            Canlı demo üzerinden randevu alma akışını deneyin, ardından
            işletmeniz için kurulumu birlikte tamamlayalım.
          </p>
          <div className="hero-actions center">
            <Link to="/randevu-al" className="btn btn-primary btn-lg">
              Canlı demoyu incele
            </Link>
            <a
              className="btn btn-ghost btn-lg btn-invert"
              href="mailto:mehmetyagizmor@gmail.com?subject=Randevu%20Y%C3%B6netim%20Sistemi%20-%20Bilgi%20Talebi"
            >
              Bize ulaşın
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <span className="admin-brand-mark">R</span>
            Randevu Yönetim Sistemi
          </div>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
          <div className="landing-footer-links">
            <Link to="/giris">Yönetici Girişi</Link>
            <Link to="/randevu-al">Randevu Al</Link>
            <a href="mailto:mehmetyagizmor@gmail.com">İletişim</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
