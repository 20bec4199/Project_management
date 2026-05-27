import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Build the transporter on first use so that missing SMTP config
   * only fails when an email is actually attempted, not at app startup.
   */
  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing). ' +
          'Emails will be skipped.',
      );
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(`Skipping email to ${to} — SMTP not configured.`);
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'noreply@example.com';

    try {
      await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      this.logger.error(
        `Failed to send email → ${to} | ${subject}\n${(err as Error).stack ?? (err as Error).message}`,
      );
      throw err; // re-throw so callers can handle / log the failure
    }
  }
}
