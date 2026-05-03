import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailSender {
  private _transporter?: nodemailer.Transporter;
  private readonly logger = new Logger(EmailSender.name);
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    this.fromAddress = configService?.get<string>("EMAIL_FROM") ?? "noreply@onboardingtracker.com";
  }

  /** Lazy-initialize transport on first use, so constructor never fails */
  private getTransporter(): nodemailer.Transporter {
    if (!this._transporter) {
      const smtpHost = this.configService?.get<string>("SMTP_HOST") ?? "";
      if (smtpHost) {
        const smtpPort = parseInt(this.configService?.get<string>("SMTP_PORT") ?? "465", 10);
        this._transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: this.configService?.get<string>("SMTP_USER") ?? "",
            pass: this.configService?.get<string>("SMTP_PASSWORD") ?? "",
          },
        });
      } else {
        // Stub transport for development / test without SMTP
        this._transporter = nodemailer.createTransport({ jsonTransport: true } as any);
      }
    }
    return this._transporter;
  }

  async sendBoardCompletionEmail(to: string, clientName: string, boardTitle: string, publicToken?: string): Promise<boolean> {
    const appUrl = this.configService.get<string>("NEXT_PUBLIC_API_URL") ?? "http://localhost:3000";
    const boardLink = publicToken ? `${appUrl}/b/${publicToken}` : null;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>🎉 Onboarding Complete!</h2>
        <p>Hello <strong>${clientName}</strong>,</p>
        <p>Your onboarding for <strong>${boardTitle}</strong> has been completed.</p>
        ${boardLink ? `<p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px">View Progress</a></p>` : ""}
        <p>Thank you for choosing us!</p>
      </div>`;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `✅ ${boardTitle} — Onboarding Complete!`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send completion email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendCardAssignedEmail(to: string, userName: string, cardTitle: string, boardTitle: string): Promise<boolean> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>📋 New Card Assigned</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>You've been assigned to <strong>${cardTitle}</strong> on <strong>${boardTitle}</strong>.</p>
      </div>`;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `📋 Assigned: "${cardTitle}" on ${boardTitle}`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send assignment email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendOverdueNotificationEmail(to: string, userName: string, cardTitle: string, boardTitle: string, dueDate: string): Promise<boolean> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>⏰ Overdue Card</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p><strong>${cardTitle}</strong> on <strong>${boardTitle}</strong> is overdue.</p>
        <p>Due date was: <strong>${dueDate}</strong></p>
      </div>`;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `⏰ Overdue: "${cardTitle}" on ${boardTitle}`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send overdue email: ${(error as Error).message}`);
      return false;
    }
  }
}