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

  private async renderReactEmail(templateModule: string, props: Record<string, unknown>): Promise<string | null> {
    try {
      const { render } = await import("@react-email/render");
      const module = await import(templateModule);
      const Template = module.default || module;
      return await render(Template(props));
    } catch (err) {
      this.logger.warn(`React Email render failed for ${templateModule}: ${(err as Error).message}`);
      return null;
    }
  }

  async sendBoardCompletionEmail(to: string, clientName: string, boardTitle: string, publicToken?: string): Promise<boolean> {
    const appUrl = this.configService.get<string>("NEXT_PUBLIC_API_URL") ?? "http://localhost:3000";
    const boardLink = publicToken ? `${appUrl}/b/${publicToken}` : null;

    let html = await this.renderReactEmail("./email.templates/board-completed", {
      clientName,
      boardTitle,
      boardLink,
    });

    if (!html) {
      // Fallback inline HTML
      html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>✅ Onboarding Concluído!</h2>
        <p>Olá <strong>${clientName}</strong>,</p>
        <p>Seu onboarding para <strong>${boardTitle}</strong> foi concluído com sucesso.</p>
        ${boardLink ? `<p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px">Ver Progresso</a></p>` : ""}
        <p>Obrigado por escolher nossa plataforma!</p>
      </div>`;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `✅ ${boardTitle} — Onboarding Concluído!`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send completion email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendBoardCreatedEmail(to: string, clientName: string, boardTitle: string, publicToken?: string): Promise<boolean> {
    const appUrl = this.configService.get<string>("NEXT_PUBLIC_API_URL") ?? "http://localhost:3000";
    const boardLink = publicToken ? `${appUrl}/b/${publicToken}` : null;

    let html = await this.renderReactEmail("./email.templates/board-created", {
      clientName,
      boardTitle,
      boardLink,
    });

    if (!html) {
      html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>🎉 Onboarding Iniciado!</h2>
        <p>Olá <strong>${clientName}</strong>,</p>
        <p>Seu quadro de onboarding <strong>${boardTitle}</strong> foi criado.</p>
        ${boardLink ? `<p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px">Acompanhar Progresso</a></p>` : ""}
        <p>Obrigado por escolher nossa plataforma!</p>
      </div>`;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `🎉 ${boardTitle} — Onboarding Iniciado!`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send created email: ${(error as Error).message}`);
      return false;
    }
  }

  async sendCardAssignedEmail(to: string, userName: string, cardTitle: string, boardTitle: string): Promise<boolean> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2>📋 Novo Card Atribuído</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Você foi atribuído ao card <strong>${cardTitle}</strong> no quadro <strong>${boardTitle}</strong>.</p>
      </div>`;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `📋 Atribuído: "${cardTitle}" em ${boardTitle}`,
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
        <h2>⏰ Card Atrasado</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>O card <strong>${cardTitle}</strong> no quadro <strong>${boardTitle}</strong> está atrasado.</p>
        <p>Data de vencimento: <strong>${dueDate}</strong></p>
      </div>`;

    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress,
        to,
        subject: `⏰ Atrasado: "${cardTitle}" em ${boardTitle}`,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send overdue email: ${(error as Error).message}`);
      return false;
    }
  }
}
