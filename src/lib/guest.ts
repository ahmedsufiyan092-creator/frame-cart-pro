const KEY = "fc_guest_cart_token";
const COUPON_KEY = "fc_coupon_code";

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  let token = window.localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(KEY, token);
  }
  return token;
}

export function peekGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function clearGuestToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function getStoredCoupon(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COUPON_KEY);
}

export function setStoredCoupon(code: string | null) {
  if (typeof window === "undefined") return;
  if (code) window.localStorage.setItem(COUPON_KEY, code);
  else window.localStorage.removeItem(COUPON_KEY);
}
