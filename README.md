# Randevu Yönetim Sistemi

Randevu tabanlı işletmeler (kuaför, berber, diyetisyen, klinik, spor salonu,
danışmanlık ofisi vb.) için hazırlanmış, uçtan uca çalışan bir randevu
yönetim ürünü. Tanıtım/pazarlama sayfası, müşterilerin kendi randevusunu
oluşturabildiği herkese açık bir randevu sayfası ve işletme sahibinin
randevu, hizmet, personel/koltuk ve ayarları yönettiği şifreli bir yönetim
paneli içerir.

## Öne çıkanlar

- **Tanıtım sayfası** (`/`) — özellikler, "nasıl çalışır", fiyatlandırma ve
  SSS bölümleriyle ürünü doğrudan sunuma hazır hâlde sergiler.
- **Herkese açık randevu sayfası** (`/randevu-al`) — müşteriler hizmet,
  koltuk/uzman, tarih ve saat seçip telefonla aramadan randevu oluşturur.
  Dolu saatler otomatik olarak listeden düşer.
- **Yönetim paneli** (`/panel`, şifreli giriş gerektirir):
  - **Genel Bakış**: bugünkü/haftalık randevu sayısı, toplam müşteri, aylık
    tahmini ciro, yaklaşan randevular ve en çok tercih edilen hizmetler.
  - **Randevular**: haftalık takvim görünümü + arama yapılabilir liste,
    boş saatlere tıklayarak tek adımda randevu oluşturma.
  - **Hizmetler**: hizmet adı, süresi ve fiyatını yönetme.
  - **Kaynaklar**: koltuk/personel/oda gibi kaynakları yönetme (isim
    işletmeye göre `Ayarlar`'dan değiştirilebilir — "Koltuk", "Uzman",
    "Oda" gibi).
  - **Ayarlar**: işletme adı, iletişim bilgileri, kaynak etiketi, randevu
    aralığı (dakika) ve haftanın her günü için çalışma saatleri.
- **Çakışma koruması**: aynı kaynağa aynı tarih/saat için iki randevu asla
  düşmez; herkese açık sayfa da yalnızca gerçekten müsait saatleri gösterir.
- **Kalıcı veri**: tüm veriler kendi sunucunuzdaki SQLite veritabanında
  tutulur, üçüncü parti bir servise bağımlılık yoktur.
- **Genel amaçlı**: "koltuk" kavramı yeniden adlandırılabilir bir "kaynak"
  soyutlamasıdır — tek bir kod tabanı kuaförden kliniğe birçok randevu
  tabanlı işletme tipine uyarlanabilir.

## Teknoloji

- **İstemci**: React 19, React Router, Vite, plain CSS (tasarım sistemi)
- **Sunucu**: Node.js, Express 5
- **Veritabanı**: SQLite (Node.js'in yerleşik `node:sqlite` modülü — ek
  derleme/native bağımlılık gerekmez)
- **Kimlik doğrulama**: JWT (jsonwebtoken) + bcryptjs ile şifrelenmiş parola

## Kurulum

Node.js 22.5+ gereklidir (yerleşik `node:sqlite` modülü için).

```bash
# 1) Sunucu
cd server
npm install
cp .env.example .env   # JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD değerlerini ayarlayın
npm run dev             # http://localhost:5000

# 2) İstemci (yeni bir terminalde)
cd client
npm install
npm run dev              # http://localhost:5173
```

Sunucu ilk çalıştırıldığında veritabanı otomatik oluşturulur; örnek bir
işletme, iki koltuk, birkaç hizmet ve birkaç demo randevu ile birlikte gelir
— böylece panel ilk açılışta boş görünmez. `.env` dosyasındaki
`ADMIN_USERNAME` / `ADMIN_PASSWORD` ile ilk yönetici hesabı oluşturulur
(varsayılan: `admin` / `admin123`, üretimde mutlaka değiştirin).

## Proje yapısı

```
client/   React tabanlı arayüz (tanıtım, randevu alma, yönetim paneli)
server/   Express API + SQLite veri katmanı
```

## Durum

Satışa/teslime hazır — çalışan kimlik doğrulama, kalıcı veri, genel amaçlı
ayarlanabilir yapı ve uçtan uca tasarlanmış arayüzle birlikte teslim edilir.
