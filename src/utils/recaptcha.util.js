/**
 * Verifies Google reCAPTCHA v2 checkbox token.
 * @param {string} token - g-recaptcha-response value from the client
 * @param {string} [remoteip] - optional user IP
 * @returns {Promise<boolean>}
 */
export async function verifyRecaptchaV2(token, remoteip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token?.trim()) {
    return false;
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token.trim());
  if (remoteip) params.set("remoteip", remoteip);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}
