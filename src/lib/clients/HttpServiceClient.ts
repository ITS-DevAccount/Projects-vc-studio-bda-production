// Sprint 1d.5: Service Task Execution System
// HttpServiceClient - Makes real HTTP calls to external APIs

import { ServiceClient } from './ServiceClient';
import { ServiceConfiguration, ServiceResponse } from '../types/service';

/**
 * HTTP Service Client
 *
 * Makes real HTTP calls to external APIs with:
 * - Support for GET, POST, PUT, DELETE, PATCH methods
 * - Authentication (API keys, bearer tokens, custom headers)
 * - Configurable timeouts
 * - Error handling for network failures, timeouts, invalid responses
 */
export class HttpServiceClient implements ServiceClient {
  /**
   * Execute an HTTP service call
   *
   * @param endpoint - Full URL to the service endpoint
   * @param input - Input data to send (body for POST/PUT, query params for GET)
   * @param config - Service configuration with auth, timeout, method
   * @returns Service response with status, data, or error
   */
  async execute(
    endpoint: string,
    input: object,
    config: ServiceConfiguration
  ): Promise<ServiceResponse> {
    const startTime = Date.now();

    try {
      // Use endpoint from config if not provided
      const url = endpoint || config.endpoint_url;
      if (!url) {
        return {
          status: 'error',
          error: 'No endpoint URL provided',
          statusCode: 500,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Determine HTTP method
      const method = config.http_method || 'POST';

      // Build request URL (add query params for GET)
      const requestUrl = this.buildRequestUrl(url, input, method);

      // Build headers with authentication
      const headers = this.buildHeaders(config);

      // Build request options
      const requestOptions: RequestInit = {
        method,
        headers,
      };

      // Add body for POST/PUT/PATCH
      if (method !== 'GET' && method !== 'DELETE') {
        requestOptions.body = JSON.stringify(input);
      }

      // Set timeout
      const timeoutMs = (config.timeout_seconds || 30) * 1000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      requestOptions.signal = controller.signal;

      try {
        // Make HTTP request
        const response = await fetch(requestUrl, requestOptions);
        clearTimeout(timeoutId);

        // Parse response
        const contentType = response.headers.get('content-type');
        let responseData: object | string;

        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        // Check if response is successful
        if (response.ok) {
          return {
            status: 'success',
            data: typeof responseData === 'string'
              ? { message: responseData }
              : responseData,
            statusCode: response.status,
            executionTimeMs: Date.now() - startTime,
          };
        } else {
          // HTTP error (4xx, 5xx)
          return {
            status: 'error',
            error: typeof responseData === 'string'
              ? responseData
              : JSON.stringify(responseData),
            data: typeof responseData === 'object' ? responseData : undefined,
            statusCode: response.status,
            executionTimeMs: Date.now() - startTime,
          };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return {
            status: 'error',
            error: `Request timeout after ${config.timeout_seconds || 30} seconds`,
            statusCode: 408,
            executionTimeMs: Date.now() - startTime,
          };
        }

        // Handle other fetch errors
        throw fetchError;
      }
    } catch (error) {
      return {
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error in HTTP service call',
        statusCode: 500,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Build request URL with query parameters for GET requests
   */
  private buildRequestUrl(
    baseUrl: string,
    input: object,
    method: string
  ): string {
    if (method === 'GET' && input && Object.keys(input).length > 0) {
      const url = new URL(baseUrl);
      Object.entries(input).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
      return url.toString();
    }
    return baseUrl;
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(config: ServiceConfiguration): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    // Add authentication headers
    if (config.authentication) {
      const auth = config.authentication as any;
      const authType = auth.type;
      console.log('[HttpServiceClient] Full auth config:', JSON.stringify(auth, null, 2));

      if (authType === 'api_key') {
        const headerName = auth.header_name || 'X-API-Key';
        const apiKey = auth.api_key || '';
        if (apiKey) {
          headers.set(headerName, apiKey);
        }
      } else if (authType === 'bearer_token') {
        const token = auth.token || '';
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      } else if (authType === 'basic_auth') {
        const username = auth.username || '';
        const password = auth.password || '';

        console.log('[HttpServiceClient] Basic Auth - Username:', username ? `${username.substring(0, 10)}...` : 'empty');
        console.log('[HttpServiceClient] Basic Auth - Password:', password ? 'present (length: ' + password.length + ')' : 'empty');

        if (username || password) {
          // Combine username:password and base64 encode
          const credentials = `${username}:${password}`;
          const encoded = Buffer.from(credentials).toString('base64');
          console.log('[HttpServiceClient] Basic Auth - Encoded header:', `Basic ${encoded.substring(0, 20)}...`);
          headers.set('Authorization', `Basic ${encoded}`);
        }
      } else if (authType === 'custom_header') {
        const headerName = auth.header_name || '';
        const headerValue = auth.header_value || '';
        if (headerName && headerValue) {
          headers.set(headerName, headerValue);
        }
      }
    }

    return headers;
  }
}
