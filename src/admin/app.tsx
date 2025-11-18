export default {
  config: {
    locales: ['vi'],
  },
  register(app: any) {
    // Register custom field for service_ids (app-specific, not plugin)
    app.customFields.register({
      name: 'service-select',
      type: 'text',
      intlLabel: {
        id: 'service-select.label',
        defaultMessage: 'Service Selection',
      },
      intlDescription: {
        id: 'service-select.description',
        defaultMessage: 'Select services from place',
      },
      components: {
        Input: async () =>
          import('./extensions/components/ServiceCodesSelect').then((module) => ({
            default: module.ServiceSelectInput,
          })),
      },
    });

    // Register custom field for days multi-select
    app.customFields.register({
      name: 'days-multi-select',
      type: 'json',
      intlLabel: {
        id: 'days-multi-select.label',
        defaultMessage: 'Days (Multi-Select)',
      },
      intlDescription: {
        id: 'days-multi-select.description',
        defaultMessage: 'Select multiple days',
      },
      components: {
        Input: async () =>
          import('./extensions/components/DaysMultiSelect').then((module) => ({
            default: module.DaysMultiSelectInput,
          })),
      },
    });

    // Register custom field for time slots multi-select
    app.customFields.register({
      name: 'time-slot-multi-select',
      type: 'json',
      intlLabel: {
        id: 'time-slot-multi-select.label',
        defaultMessage: 'Time Slots (Multi-Select)',
      },
      intlDescription: {
        id: 'time-slot-multi-select.description',
        defaultMessage: 'Select multiple time slots',
      },
      components: {
        Input: async () =>
          import('./extensions/components/TimeSlotMultiSelect').then((module) => ({
            default: module.TimeSlotMultiSelectInput,
          })),
      },
    });

    // Register custom field for blackout dates multi-select
    app.customFields.register({
      name: 'blackout-dates-multi-select',
      type: 'json',
      intlLabel: {
        id: 'blackout-dates-multi-select.label',
        defaultMessage: 'Blackout dates',
      },
      intlDescription: {
        id: 'blackout-dates-multi-select.description',
        defaultMessage: 'The promotion would be inactive on the dates selected below:',
      },
      components: {
        Input: async () =>
          import('./extensions/components/BlackoutDatesMultiSelect').then((module) => ({
            default: module.BlackoutDatesMultiSelectInput,
          })),
      },
    });

    // Register generic multi-select custom field
    app.customFields.register({
      name: 'multi-select',
      type: 'json',
      intlLabel: {
        id: 'multi-select.label',
        defaultMessage: 'Multi-Select',
      },
      intlDescription: {
        id: 'multi-select.description',
        defaultMessage: 'Select multiple options from the list',
      },
      components: {
        Input: async () =>
          import('./extensions/components/MultiSelect').then((module) => ({
            default: module.MultiSelectInput,
          })),
      },
    });
  },
  bootstrap(app: any) {
    // bootstrap code here if needed
  },
};

