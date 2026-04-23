import { Worker } from "bullmq";
import redis from "../configs/redis.js";
import sendMail from '../utils/mailer.js'
import User from "../models/user.model.js";

const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    const { contactId, fullName, email, service } = job.data;

    console.log(`📧 Processing email for: ${email}`);

    // 🛡 Idempotency check
    const contact = await User.findById(contactId);
    if (!contact) {
      console.log(`⚠️ Contact not found: ${contactId}`);
      return;
    }

    if (contact.emailStatus === "sent") {
      console.log(`⏭️ Email already sent for: ${contactId}`);
      return;
    }

    // Send email
    await sendMail({
      to: email,
      subject: "Thanks for contacting Krapto Technology",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f8f7;
      font-family: Arial, Helvetica, sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #14b8a6, #0ea5a4);
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      letter-spacing: 1px;
    }
    .content {
      padding: 30px;
      color: #333333;
    }
    .content h3 {
      margin-top: 0;
      font-size: 20px;
    }
    .highlight {
      color: #14b8a6;
      font-weight: bold;
    }
    .info-box {
      background: #f0fdfa;
      border-left: 4px solid #14b8a6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .cta span {
      display: inline-block;
      background: #14b8a6;
      color: #ffffff;
      padding: 12px 28px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      background: #f9fafb;
      text-align: center;
      padding: 15px;
      font-size: 12px;
      color: #777777;
    }
  </style>
</head>

<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>Krapto Technology</h1>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <h3>Hello ${fullName}, 👋</h3>

      <p>
        Thank you for contacting
        <span class="highlight">Krapto Technology</span>.
      </p>

      <div class="info-box">
        We have successfully received your inquiry regarding
        <b>${service}</b>.
      </div>

      <p>
        Our expert team is currently reviewing your request and will get back to
        you within <b>24–48 hours</b>.
      </p>

      <div class="cta">
  <a
    href="https://kraptotechnologies.com"
    target="_blank"
    style="
      display: inline-block;
      background: #14b8a6;
      color: #ffffff;
      padding: 12px 28px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: bold;
      text-decoration: none;
    "
  >
    Visit Krapto Technology 🚀
  </a>
</div>


      <p>
        Best Regards,<br />
        <b>Krapto Technology Team</b>
      </p>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      © ${new Date().getFullYear()} Krapto Technology. All rights reserved.
    </div>
  </div>
</body>
</html>
  `,
    });

    // Update status
    await User.findByIdAndUpdate(contactId, {
      emailStatus: "sent",
    });

    console.log(`✅ Email sent successfully to: ${email}`);
  },
  {
    connection: redis,
    concurrency: 5,
    lockDuration: 120000,
  },
);

// Event handlers
emailWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);

  if (job?.data?.contactId) {
    await User.findByIdAndUpdate(job.data.contactId, {
      emailStatus: "failed",
    });
  }
});

emailWorker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

process.on("SIGTERM", async () => {
  await emailWorker.close();
});

export default emailWorker;
