// Sprint 1d.5: Service Task Execution System
// MockServiceClient - Simulates service calls with predefined responses

import { ServiceClient } from './ServiceClient';
import {
  ServiceConfiguration,
  ServiceResponse,
  ErrorScenario,
  MockServiceDefinition,
} from '../types/service';
import { getMockServiceTemplate } from '../templates/mock-service-templates';

/**
 * Mock Service Client
 *
 * Simulates external service calls for testing workflows without real API dependencies.
 * Supports:
 * - Template-based responses (from mock-service-templates.ts)
 * - Custom inline mock definitions
 * - Error scenario simulation with configurable probabilities
 * - Simulated delays and timeouts
 */
export class MockServiceClient implements ServiceClient {
  /**
   * Execute a mock service call
   *
   * @param endpoint - Not used for mock services (can be identifier)
   * @param input - Input data (may affect response in future)
   * @param config - Service configuration with mock_definition or mock_template_id
   * @returns Simulated service response
   */
  async execute(
    _endpoint: string,
    _input: object,
    config: ServiceConfiguration
  ): Promise<ServiceResponse> {
    const startTime = Date.now();

    try {
      // Get mock definition from template or inline
      const mockDefinition = this.getMockDefinition(config);

      if (!mockDefinition) {
        return {
          status: 'error',
          error: 'No mock definition or template found',
          statusCode: 500,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Check if we should simulate an error scenario
      const errorScenario = this.selectErrorScenario(
        mockDefinition.error_scenarios
      );

      if (errorScenario) {
        // Simulate delay if specified
        if (errorScenario.delay_ms) {
          await this.sleep(errorScenario.delay_ms);
        }

        return {
          status: 'error',
          error: JSON.stringify(errorScenario.response),
          data: errorScenario.response,
          statusCode: errorScenario.status_code || 500,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Simulate realistic processing time (100-500ms)
      const processingTime = Math.random() * 400 + 100;
      await this.sleep(processingTime);

      // Return success response
      return {
        status: 'success',
        data: mockDefinition.success_response,
        statusCode: 200,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Unknown error in mock service',
        statusCode: 500,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get mock definition from template or inline configuration
   */
  private getMockDefinition(
    config: ServiceConfiguration
  ): MockServiceDefinition | null {
    // First check for template ID
    if (config.mock_template_id) {
      const template = getMockServiceTemplate(config.mock_template_id);
      if (template) {
        return {
          success_response: template.success_response,
          error_scenarios: template.error_scenarios,
        };
      }
    }

    // Fall back to inline mock definition
    if (config.mock_definition) {
      return config.mock_definition;
    }

    return null;
  }

  /**
   * Randomly select an error scenario based on probabilities
   *
   * @param scenarios - Array of possible error scenarios
   * @returns Selected error scenario or null if success
   */
  private selectErrorScenario(
    scenarios?: ErrorScenario[]
  ): ErrorScenario | null {
    if (!scenarios || scenarios.length === 0) {
      return null;
    }

    const random = Math.random();
    let cumulativeProbability = 0;

    for (const scenario of scenarios) {
      cumulativeProbability += scenario.probability;
      if (random < cumulativeProbability) {
        return scenario;
      }
    }

    return null;
  }

  /**
   * Sleep utility for simulating delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
