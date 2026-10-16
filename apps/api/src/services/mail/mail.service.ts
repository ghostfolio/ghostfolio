import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Injectable, Logger } from '@nestjs/common';
import { AlertCondition, InvestmentSignal, PriceAlert } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public async sendInvestmentSignalEmail(
    toEmail: string,
    signals: InvestmentSignal[],
    language = 'en'
  ): Promise<boolean> {
    const smtpUser = this.configurationService.get('SMTP_USER');
    if (!smtpUser || !toEmail) return false;

    try {
      const isZh = language === 'zh';

      const subject = isZh
        ? '【Ghostfolio】本周投资建议'
        : '[Ghostfolio] Weekly Investment Signals';

      const body = this.buildSignalsHtml(language, signals);

      const transporter = nodemailer.createTransport({
        auth: {
          pass: this.configurationService.get('SMTP_PASS'),
          user: smtpUser
        },
        host: this.configurationService.get('SMTP_HOST'),
        port: this.configurationService.get('SMTP_PORT'),
        secure: false
      });

      await transporter.sendMail({
        from: this.configurationService.get('SMTP_FROM') || smtpUser,
        html: body,
        subject,
        to: toEmail
      });

      this.logger.log(`Investment signal email sent to ${toEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return false;
    }
  }

  public async sendPriceAlertEmail(
    toEmail: string,
    alert: PriceAlert,
    currentValue: number
  ): Promise<boolean> {
    const smtpUser = this.configurationService.get('SMTP_USER');
    if (!smtpUser || !toEmail) return false;

    try {
      const displayName = alert.name || alert.symbol;
      const conditionLabel = this.getConditionLabel(alert.condition);
      const isAbove =
        alert.condition === AlertCondition.GREATER_THAN ||
        alert.condition === AlertCondition.GREATER_THAN_OR_EQUAL;
      const accentColor = isAbove ? '#1e8e3e' : '#d93025';

      const message = this.applyTemplateVariables(alert.messageTemplate || '', {
        currentValue: currentValue.toFixed(2),
        name: displayName,
        symbol: displayName,
        targetValue: String(alert.targetValue)
      });

      const subject = `[Ghostfolio] 🔔 Price Alert: ${displayName} ${conditionLabel} ${alert.targetValue}`;

      const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:${accentColor};color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <div style="font-size:28px;font-weight:700;">🔔 ${displayName}</div>
          <div style="font-size:16px;margin-top:6px;">${isAbove ? '↑' : '↓'} ${conditionLabel} ${alert.targetValue}</div>
        </div>
        <div style="border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:20px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr>
              <td style="padding:8px;color:#666;">Current value</td>
              <td style="padding:8px;font-size:22px;font-weight:700;color:${accentColor};text-align:right;">${currentValue.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:8px;color:#666;">Threshold</td>
              <td style="padding:8px;text-align:right;">${conditionLabel} ${alert.targetValue}</td>
            </tr>
          </table>
          ${message ? `<p style="font-size:16px;font-weight:600;background:#fff8e1;padding:12px;border-radius:6px;border-left:4px solid #f9ab00;">${message}</p>` : ''}
          <p style="color:#888;font-size:12px;margin-top:16px">⚠️ For informational purposes only. Not investment advice.</p>
        </div>
      </div>`;

      const transporter = nodemailer.createTransport({
        auth: {
          pass: this.configurationService.get('SMTP_PASS'),
          user: smtpUser
        },
        host: this.configurationService.get('SMTP_HOST'),
        port: this.configurationService.get('SMTP_PORT'),
        secure: false
      });

      await transporter.sendMail({
        from: this.configurationService.get('SMTP_FROM') || smtpUser,
        html,
        subject,
        to: toEmail
      });

      this.logger.log(`Price alert email sent to ${toEmail} for ${alert.symbol}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send price alert email: ${error}`);
      return false;
    }
  }

  private applyTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    return Object.entries(variables).reduce(
      (result, [key, value]) => result.split(`{${key}}`).join(value),
      template
    );
  }

  private getConditionLabel(condition: AlertCondition): string {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return '>';
      case AlertCondition.GREATER_THAN_OR_EQUAL:
        return '≥';
      case AlertCondition.LESS_THAN:
        return '<';
      case AlertCondition.LESS_THAN_OR_EQUAL:
        return '≤';
      default:
        return '';
    }
  }

  private buildSignalsHtml(language: string, signals: InvestmentSignal[]): string {
    const isZh = language === 'zh';
    const rows = signals.map((s) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${s.symbol}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${s.type}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">$${s.amount.toFixed(0)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${s.reason}</td>
      </tr>`).join('');

    return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2>${isZh ? '本周投资建议' : 'Weekly Investment Signals'}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">${isZh ? '资产' : 'Symbol'}</th>
          <th style="padding:8px;text-align:left">${isZh ? '类型' : 'Type'}</th>
          <th style="padding:8px;text-align:left">${isZh ? '金额' : 'Amount'}</th>
          <th style="padding:8px;text-align:left">${isZh ? '原因' : 'Reason'}</th>
        </tr>
        ${rows}
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">
        ${isZh ? '⚠️ 以上内容仅供参考，不构成投资建议，投资有风险，入市需谨慎。' : '⚠️ For informational purposes only. Not investment advice.'}
      </p>
    </div>`;
  }
}
