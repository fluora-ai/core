import { describe, it, expect } from 'vitest';
import { operationDescriptions } from '../../src/prompts/operation-descriptions';
import { FluoraOperation } from '../../src/types/operations';

describe('Operation Descriptions', () => {
  it('should have descriptions for all operations', () => {
    const allOperations = Object.values(FluoraOperation);

    for (const operation of allOperations) {
      expect(operationDescriptions.has(operation)).toBe(true);
      expect(operationDescriptions.get(operation)).toBeDefined();
      expect(typeof operationDescriptions.get(operation)).toBe('string');
      expect(operationDescriptions.get(operation)!.length).toBeGreaterThan(0);
    }
  });

  it('should have unique descriptions for each operation', () => {
    const descriptions = Array.from(operationDescriptions.values());
    const uniqueDescriptions = new Set(descriptions);

    expect(descriptions.length).toBe(uniqueDescriptions.size);
  });

  it('should contain expected keywords in descriptions', () => {
    const searchDescription = operationDescriptions.get(
      FluoraOperation.SEARCH_FLUORA
    );
    expect(searchDescription).toContain('search');
    expect(searchDescription).toContain('Fluora');
    expect(searchDescription).toContain('JSON');

    const priceDescription = operationDescriptions.get(
      FluoraOperation.PRICE_LISTING
    );
    expect(priceDescription).toContain('pricing');
    expect(priceDescription).toContain('payment');
    expect(priceDescription).toContain('JSON');

    const purchaseDescription = operationDescriptions.get(
      FluoraOperation.MAKE_PURCHASE
    );
    expect(purchaseDescription).toContain('Purchase');
    expect(purchaseDescription).toContain('transaction');
    expect(purchaseDescription).toContain('JSON');
  });

  it('should have proper format for operation descriptions', () => {
    for (const [operation, description] of operationDescriptions) {
      // Each description should be a non-empty string
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(10);

      // Descriptions should not be just whitespace
      expect(description.trim().length).toBeGreaterThan(0);

      // Most descriptions should contain "JSON" indicating response format
      if (operation !== FluoraOperation.CALL_SERVER_TOOL) {
        expect(description.toLowerCase()).toContain('json');
      }
    }
  });

  it('should have descriptions for core operations', () => {
    const coreOperations = [
      FluoraOperation.SEARCH_FLUORA,
      FluoraOperation.LIST_SERVERS,
      FluoraOperation.GET_SERVER_INFO,
      FluoraOperation.PRICE_LISTING,
      FluoraOperation.PAYMENT_METHODS,
      FluoraOperation.MAKE_PURCHASE,
      FluoraOperation.VALIDATE_PAYMENT,
    ];

    for (const operation of coreOperations) {
      expect(operationDescriptions.has(operation)).toBe(true);
      const description = operationDescriptions.get(operation);
      expect(description).toBeDefined();
      expect(description!.length).toBeGreaterThan(50); // Should be substantial descriptions
    }
  });
});
