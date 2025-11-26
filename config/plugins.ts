import { customRoutesDocs } from './documentation';

export default () => ({
  upload: {
    config: {
      sizeLimit: 250 * 1024 * 1024, // 250MB
      providerOptions: {
        localServer: {
          maxage: 86400000, // 1 day = 24 hours cache for better performance
        },
      },
    },
  },
  documentation: {
    enabled: true,
    config: {
      openapi: '3.0.0',
      info: {
        version: '1.0.0',
        title: 'TISODA API Documentation',
        description: 'API documentation for TISODA Strapi application',
        termsOfService: 'YOUR_TERMS_OF_SERVICE_URL',
        contact: {
          name: 'API Support',
          email: 'support@tisoda.com',
          url: 'https://tisoda.com/support',
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
        },
      },
      'x-strapi-config': {
        // Add your API token here for authentication in Swagger UI
        // plugins: ['users-permissions'],
        path: '/documentation',

        // Custom routes documentation - imported from config/documentation.ts
        mutateDocumentation: customRoutesDocs,
      },
      servers: [
        {
          url: 'http://localhost:1337/api',
          description: 'Development server',
        },
        {
          url: 'https://admin.tisoda.com/api',
          description: 'Production server',
        },
      ],
    },
  },
  graphql: {
    config: {
      endpoint: '/graphql',
      shadowCRUD: true,
      landingPage: true,
      introspection: true,
      amountLimit: 100,
    },
  },
});
