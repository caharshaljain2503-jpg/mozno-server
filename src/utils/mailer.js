import { Resend } from "resend";
import { config } from "dotenv";
config();

let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is missing. Add it in server .env to enable email sending.",
    );
  }

  resendClient = new Resend(apiKey, {
    timeout: 30000, // 30 seconds timeout
    maxRetries: 3,
  });

  return resendClient;
};

const sendMail = async ({ to, subject, html }, retries = 3) => {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`📤 Attempt ${i + 1}/${retries} to send email to ${to}`);
      const resend = getResendClient();

      const { data, error } = await resend.emails.send({
        from:process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      if (error) {
        console.error(`❌ Resend error (attempt ${i + 1}):`, error);

        // If it's a rate limit error, wait before retrying
        if (error.statusCode === 429) {
          const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
          console.log(`⏳ Rate limited, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          lastError = error;
          continue;
        }

        throw error;
      }

      console.log("✅ Email sent successfully:", data.id);
      return data;
    } catch (err) {
      lastError = err;

      if (err?.message?.includes("RESEND_API_KEY is missing")) {
        break;
      }

      // Don't retry on validation errors
      if (err.name === "validation_error" || err.statusCode === 422) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error("❌ All email sending attempts failed:", lastError);
  throw lastError;
};

export default sendMail;
