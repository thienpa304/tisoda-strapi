export default {
  routes: [
    {
      method: 'POST',
      path: '/provinces/seed',
      handler: 'seed.seed',
      config: {
        auth: false, // Set to true if you want authentication
      },
    },
  ],
};
