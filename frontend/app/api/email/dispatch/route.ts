import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTERNAL_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "stech_pay_whsec_99a8b1c4d2e3f567890123456789abcdef";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-email-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader || authHeader !== INTERNAL_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized mail gateway access" }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, from_name, reply_to, attachments } = body;

    const cleanTo = (to || "").trim().toLowerCase();
    if (!cleanTo || !cleanTo.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid recipient email required" }, { status: 400 });
    }

    if (
      cleanTo.endsWith("@s-tech-store.tech") ||
      cleanTo.endsWith("@telegram.s-tech-store.tech") ||
      cleanTo.endsWith("@tiktok.s-tech-store.tech")
    ) {
      return NextResponse.json({ success: false, error: "Cannot send to synthetic placeholder email" }, { status: 400 });
    }

    const smtpUser = process.env.MAIL_USERNAME || "mmokompongcham@gmail.com";
    const smtpPass = (process.env.MAIL_PASSWORD || "jvtbivueeqmrvlag").replace(/\s+/g, "");
    const fromName = from_name || "S Tech Store Cambodia";
    const replyToEmail = reply_to || "stech.supporter@gmail.com";

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Port 587 uses STARTTLS
      requireTLS: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions: any = {
      from: `"${fromName}" <${smtpUser}>`,
      to: cleanTo,
      replyTo: replyToEmail,
      subject: subject || "[S Tech Store] Notification",
      html: html || "<p>Notification from S Tech Store Cambodia</p>",
    };

    if (Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att: any) => ({
        filename: att.name || "invoice.html",
        content: att.data ? Buffer.from(att.data) : att.content,
        contentType: att.mime || "text/html",
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      provider: "gmail",
      messageId: info.messageId,
      recipient: cleanTo,
      message: "បានបញ្ជូន Email ជោគជ័យតាមរយៈ Gmail SMTP (Vercel Gateway)",
    });
  } catch (error: any) {
    console.error("[Email Gateway Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to dispatch email via Gmail SMTP",
      },
      { status: 500 }
    );
  }
}
