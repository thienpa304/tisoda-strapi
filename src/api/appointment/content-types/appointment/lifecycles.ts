export default {
  async afterCreate(event: any) {
    const { result } = event;

    try {
      await strapi.service('api::appointment.appointment').sendTelegramNotification(result);
    } catch (error) {
      strapi.log.error(
        `[appointment] Lifecycle afterCreate failed to trigger Telegram notification:`,
        error,
      );
    }
  },
};
