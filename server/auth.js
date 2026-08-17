const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "12h";
const CUSTOMER_TOKEN_TTL = "30d";

if (!process.env.JWT_SECRET) {
  console.warn(
    "> UYARI: JWT_SECRET .env dosyasında tanımlı değil, geçici bir anahtar kullanılıyor. Üretimde mutlaka ayarlayın."
  );
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, businessId: user.business_id, role: "admin" },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function signCustomerToken(customer) {
  return jwt.sign(
    { sub: customer.id, phone: customer.phone, businessId: customer.business_id, role: "customer" },
    JWT_SECRET,
    { expiresIn: CUSTOMER_TOKEN_TTL }
  );
}

function requireRole(role) {
  return function (req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Oturum gerekli." });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role !== role) {
        return res.status(403).json({ message: "Bu işlem için yetkiniz yok." });
      }
      // Çok işletmeli göçten önce verilmiş eski token'larda businessId yok —
      // bu token'ları geçersiz say (kullanıcı bir kez daha giriş yapmalı).
      if (!payload.businessId) {
        return res.status(401).json({ message: "Oturum süresi dolmuş veya geçersiz." });
      }
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Oturum süresi dolmuş veya geçersiz." });
    }
  };
}

const requireAuth = requireRole("admin");
const requireCustomerAuth = requireRole("customer");

module.exports = { signToken, signCustomerToken, requireAuth, requireCustomerAuth };
