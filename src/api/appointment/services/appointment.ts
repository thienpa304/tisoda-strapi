/**
 * appointment service
 */

import { factories } from '@strapi/strapi';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

const formatCurrency = (value?: unknown): string | null => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return null;
  }
  return new Intl.NumberFormat('vi-VN').format(numericValue);
};

const sanitizeText = (value?: string | null): string | null => {
  if (!value) return null;
  return value.replace(/\s+/g, ' ').trim();
};

export default factories.createCoreService(
  'api::appointment.appointment',
  ({ strapi }) => ({
    async sendTelegramNotification(appointment: any) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        strapi.log.warn(
          '[appointment] Telegram notification skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID',
        );
        return;
      }

      const summary = appointment?.appointment_summary ?? {};
      const schedule = appointment?.date_time_select ?? {};
      const appointmentId = appointment.documentId || appointment.id;
      const adminUrl = `${process.env.STRAPI_ADMIN_URL}/dashboard/content-manager/collection-types/api::appointment.appointment/${appointmentId}`;

      const lines = [
        '📣 Cuộc hẹn mới vừa được tạo',
        `• Khách: ${sanitizeText(appointment.user_name) || 'Không rõ'}`,
        `• SĐT: ${sanitizeText(appointment.user_phone) || 'Không rõ'}`,
        summary.place_name
          ? `• Địa điểm: ${sanitizeText(summary.place_name)}`
          : null,
        appointmentId ? `• [Xem chi tiết](${adminUrl})` : null
      ].filter(Boolean);

      const message = lines.join('\n');

      try {
        interface TelegramResponse {
          ok: boolean;
          description?: string;
        }

        const response = await fetch(
          `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'Markdown',
            }),
          },
        );

        const payload = (await response.json()) as TelegramResponse;
        if (!payload?.ok) {
          throw new Error(payload?.description || 'Telegram API error');
        }

        strapi.log.info(
          `[appointment] Telegram notification sent for appointment ${appointment.documentId || appointment.id}`,
        );
      } catch (error) {
        strapi.log.error(
          '[appointment] Failed to send Telegram notification:',
          error,
        );
      }
    },
  }),
);
