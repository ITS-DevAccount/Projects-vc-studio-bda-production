// Sprint 1d.5: Service Task Execution System
// Mock Service Templates Library

import { MockServiceTemplate } from '../types/service';

/**
 * Pre-built mock service templates for testing workflows without external dependencies
 */
export const MOCK_SERVICE_TEMPLATES: MockServiceTemplate[] = [
  // ============================================================================
  // Template 1: Weather Service Mock
  // ============================================================================
  {
    template_id: 'weather_service_mock',
    service_name: 'Weather Service',
    description: 'Mock weather API with realistic responses including temperature, humidity, and forecast data',
    success_response: {
      temperature: 72,
      temperature_unit: 'fahrenheit',
      humidity: 65,
      humidity_unit: 'percent',
      condition: 'Sunny',
      wind_speed: 8,
      wind_direction: 'NW',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
      },
      forecast: [
        {
          day: 'Monday',
          high: 75,
          low: 62,
          condition: 'Cloudy',
          precipitation_chance: 20,
        },
        {
          day: 'Tuesday',
          high: 70,
          low: 60,
          condition: 'Rainy',
          precipitation_chance: 80,
        },
        {
          day: 'Wednesday',
          high: 73,
          low: 61,
          condition: 'Partly Cloudy',
          precipitation_chance: 30,
        },
      ],
      last_updated: new Date().toISOString(),
    },
    error_scenarios: [
      {
        name: 'Timeout',
        probability: 0.1, // 10% chance
        delay_ms: 35000, // Exceeds typical 30s timeout
        response: {
          error: 'Request timeout',
          code: 'TIMEOUT',
        },
      },
      {
        name: 'API Error',
        probability: 0.05, // 5% chance
        status_code: 500,
        response: {
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          message: 'Weather service temporarily unavailable',
        },
      },
      {
        name: 'Invalid Location',
        probability: 0.03, // 3% chance
        status_code: 404,
        response: {
          error: 'Location not found',
          code: 'LOCATION_NOT_FOUND',
          message: 'The requested location could not be found',
        },
      },
    ],
  },

  // ============================================================================
  // Template 2: News Service Mock
  // ============================================================================
  {
    template_id: 'news_service_mock',
    service_name: 'News Service',
    description: 'Mock news API returning articles from various sources',
    success_response: {
      articles: [
        {
          article_id: 'news_001',
          title: 'Major AI Breakthrough Announced',
          source: 'TechNews',
          author: 'Jane Smith',
          date: new Date().toISOString().split('T')[0],
          category: 'Technology',
          content: 'Scientists announce breakthrough in artificial intelligence that could revolutionize natural language processing. The new model demonstrates unprecedented understanding of context and nuance...',
          url: 'https://technews.example.com/ai-breakthrough',
          image_url: 'https://technews.example.com/images/ai-breakthrough.jpg',
        },
        {
          article_id: 'news_002',
          title: 'Stock Markets Reach New Highs',
          source: 'FinanceDaily',
          author: 'John Doe',
          date: new Date().toISOString().split('T')[0],
          category: 'Finance',
          content: 'Global stock markets continue their upward trajectory, with major indices reaching record levels. Analysts attribute the gains to strong corporate earnings and positive economic indicators...',
          url: 'https://financedaily.example.com/market-highs',
          image_url: 'https://financedaily.example.com/images/market-chart.jpg',
        },
        {
          article_id: 'news_003',
          title: 'Climate Summit Produces New Commitments',
          source: 'WorldNews',
          author: 'Sarah Johnson',
          date: new Date().toISOString().split('T')[0],
          category: 'Environment',
          content: 'World leaders gather for climate summit, announcing new commitments to reduce carbon emissions and transition to renewable energy sources...',
          url: 'https://worldnews.example.com/climate-summit',
          image_url: 'https://worldnews.example.com/images/climate.jpg',
        },
      ],
      total_articles: 3,
      page: 1,
      page_size: 10,
      query: 'latest',
      generated_at: new Date().toISOString(),
    },
    error_scenarios: [
      {
        name: 'Rate Limited',
        probability: 0.15, // 15% chance
        status_code: 429,
        response: {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'API rate limit exceeded. Please try again later.',
          retry_after: 60,
        },
      },
      {
        name: 'Unauthorized',
        probability: 0.02, // 2% chance
        status_code: 401,
        response: {
          error: 'Unauthorized',
          code: 'INVALID_API_KEY',
          message: 'The provided API key is invalid or expired',
        },
      },
    ],
  },

  // ============================================================================
  // Template 3: Document Generator Mock
  // ============================================================================
  {
    template_id: 'document_generator_mock',
    service_name: 'Document Generator',
    description: 'Mock document generation service that simulates PDF/DOCX creation',
    success_response: {
      document_id: `doc_${Date.now()}`,
      document_name: 'Generated_Document.pdf',
      document_type: 'PDF',
      url: `https://storage.example.com/documents/doc_${Date.now()}.pdf`,
      download_url: `https://storage.example.com/documents/doc_${Date.now()}.pdf?download=true`,
      status: 'generated',
      page_count: 5,
      file_size_bytes: 245760, // ~240 KB
      metadata: {
        template_used: 'business_report',
        author: 'System Generated',
        created_date: new Date().toISOString(),
        version: '1.0',
      },
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    },
    error_scenarios: [
      {
        name: 'Template Not Found',
        probability: 0.05, // 5% chance
        status_code: 404,
        response: {
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
          message: 'The requested document template does not exist',
        },
      },
      {
        name: 'Generation Failed',
        probability: 0.08, // 8% chance
        status_code: 500,
        response: {
          error: 'Document generation failed',
          code: 'GENERATION_ERROR',
          message: 'Failed to generate document due to internal error',
        },
      },
    ],
  },

  // ============================================================================
  // Template 4: Data Validation Service Mock
  // ============================================================================
  {
    template_id: 'data_validation_mock',
    service_name: 'Data Validator',
    description: 'Mock data validation service that checks data quality and integrity',
    success_response: {
      valid: true,
      validation_id: `val_${Date.now()}`,
      issues: [],
      warnings: [],
      confidence: 0.95,
      fields_validated: 12,
      fields_passed: 12,
      fields_failed: 0,
      validation_details: [
        {
          field: 'email',
          status: 'valid',
          message: 'Email format is correct',
        },
        {
          field: 'phone',
          status: 'valid',
          message: 'Phone number format is valid',
        },
        {
          field: 'postal_code',
          status: 'valid',
          message: 'Postal code matches expected format',
        },
      ],
      validated_at: new Date().toISOString(),
    },
    error_scenarios: [
      {
        name: 'Validation Failure',
        probability: 0.2, // 20% chance
        status_code: 200, // Not an HTTP error, just validation failed
        response: {
          valid: false,
          validation_id: `val_${Date.now()}`,
          issues: [
            {
              field: 'email',
              severity: 'error',
              message: 'Email field is required but missing',
              code: 'REQUIRED_FIELD_MISSING',
            },
            {
              field: 'phone',
              severity: 'error',
              message: 'Phone number has invalid format',
              code: 'INVALID_FORMAT',
            },
          ],
          warnings: [
            {
              field: 'address',
              severity: 'warning',
              message: 'Address could not be verified against postal database',
              code: 'UNVERIFIED_ADDRESS',
            },
          ],
          confidence: 0.60,
          fields_validated: 12,
          fields_passed: 9,
          fields_failed: 3,
          validated_at: new Date().toISOString(),
        },
      },
      {
        name: 'Service Unavailable',
        probability: 0.05, // 5% chance
        status_code: 503,
        response: {
          error: 'Service unavailable',
          code: 'SERVICE_UNAVAILABLE',
          message: 'Validation service is temporarily unavailable',
        },
      },
    ],
  },
];

/**
 * Get mock service template by ID
 */
export function getMockServiceTemplate(
  templateId: string
): MockServiceTemplate | undefined {
  return MOCK_SERVICE_TEMPLATES.find(
    (template) => template.template_id === templateId
  );
}

/**
 * Get all available mock service template IDs
 */
export function getMockServiceTemplateIds(): string[] {
  return MOCK_SERVICE_TEMPLATES.map((template) => template.template_id);
}

/**
 * Get mock service templates for dropdown selection
 */
export function getMockServiceTemplateOptions(): Array<{
  value: string;
  label: string;
  description: string;
}> {
  return MOCK_SERVICE_TEMPLATES.map((template) => ({
    value: template.template_id,
    label: template.service_name,
    description: template.description,
  }));
}
