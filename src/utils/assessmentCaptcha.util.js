import crypto from "crypto";

function getSecret() {
  return process.env.SECRET_KEY || process.env.JWT_SECRET || "dev-assessment-captcha-secret";
}

/**
 * HMAC signature for a math captcha challenge (numbers and expiry only; sum is never stored).
 * @param {number} n1
 * @param {number} n2
 * @param {number} expMs
 */
export function signAssessmentCaptcha(n1, n2, expMs) {
  const payload = `${n1}|${n2}|${expMs}`;
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifyAssessmentCaptcha({ n1, n2, answer, exp, sig }) {
  try {
    if (!Number.isFinite(n1) || !Number.isFinite(n2) || !Number.isFinite(exp) || typeof sig !== "string") {
      return false;
    }
    if (n1 < 1 || n1 > 20 || n2 < 1 || n2 > 20) return false;
    if (Date.now() > exp) return false;
    const expectedSig = signAssessmentCaptcha(n1, n2, exp);
    if (expectedSig.length !== sig.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig, "utf8"), Buffer.from(sig, "utf8")))
      return false;
    const userNum = parseInt(String(answer).trim(), 10);
    if (!Number.isFinite(userNum)) return false;
    return userNum === n1 + n2;
  } catch {
    return false;
  }
}
