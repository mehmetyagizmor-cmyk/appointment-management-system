export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_KEYS = {
  admin: "rys_token",
  customer: "rys_customer_token",
};

export function getToken(type = "admin") {
  return localStorage.getItem(TOKEN_KEYS[type]);
}

export function setToken(token, type = "admin") {
  const key = TOKEN_KEYS[type];
  if (token) localStorage.setItem(key, token);
  else localStorage.removeItem(key);
}

class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const tokenType = auth === "customer" ? "customer" : "admin";
  if (auth) {
    const token = getToken(tokenType);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", 0);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      setToken(null, tokenType);
    }
    throw new ApiError(
      data?.message || "Bir hata oluştu.",
      response.status,
      data?.errors
    );
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export { ApiError };
