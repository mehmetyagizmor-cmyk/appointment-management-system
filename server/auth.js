const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "12h";

if (!process.env.JWT_SECRET) {
  console.warn(
    "> UYARI: JWT_SECRET .env dosyasında tanımlı değil, geçici bir anahtar kullanılıyor. Üretimde mutlaka ayarlayın."
  );
}

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Oturum gerekli." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Oturum süresi dolmuş veya geçersiz." });
  }
}

module.exports = { signToken, requireAuth };
