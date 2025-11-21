// Sprint 1d.5: Service Task Execution System
// ServiceClient interface - Base interface for all service clients

import { ServiceConfiguration, ServiceResponse } from '../types/service';

/**
 * Base interface for service clients (Mock and HTTP)
 *
 * Implementations:
 * - MockServiceClient: Simulates service calls with predefined responses
 * - HttpServiceClient: Makes real HTTP calls to external APIs
 */
export interface ServiceClient {
  /**
   * Execute a service call
   *
   * @param endpoint - Service endpoint URL (for REAL) or identifier (for MOCK)
   * @param input - Input data to pass to the service
   * @param config - Service configuration containing auth, timeout, etc.
   * @returns ServiceResponse with status, data, or error
   */
  execute(
    endpoint: string,
    input: object,
    config: ServiceConfiguration
  ): Promise<ServiceResponse>;
}

/**
 * Factory function to create appropriate service client based on configuration
 */
export async function createServiceClient(
  config: ServiceConfiguration
): Promise<ServiceClient> {
  if (config.service_type === 'MOCK') {
    const { MockServiceClient } = await import('./MockServiceClient');
    return new MockServiceClient();
  } else {
    const { HttpServiceClient } = await import('./HttpServiceClient');
    return new HttpServiceClient();
  }
}
