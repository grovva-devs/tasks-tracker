---
title: Honor Liskov Substitution Principle
impact: HIGH
impactDescription: Ensures implementations are truly interchangeable without breaking callers
tags: dependency-injection, inheritance, solid, lsp
---

## Honor Liskov Substitution Principle

Subtypes must be substitutable for their base types without altering program correctness. In NestJS DI, any implementation must honor the contract completely. A mock must behave like the real service.

**Incorrect (mock violates contract):**

```typescript
@Injectable()
export class MockPaymentService implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    if (amount > 1000) throw new Error('Mock does not support large amounts'); // VIOLATION
    return { success: true } as PaymentResult; // Missing required field!
  }
}
```

**Correct (mock honors contract):**

```typescript
@Injectable()
export class MockPaymentService implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    if (!['USD', 'EUR', 'GBP'].includes(currency)) throw new InvalidCurrencyException(currency);
    if (amount === 99999) throw new PaymentFailedException('Card declined (test scenario)');
    return { success: true, transactionId: `mock_${Date.now()}`, amount };
  }
}

// Shared contract test for all implementations
function testPaymentGatewayContract(createGateway: () => PaymentGateway) {
  describe('PaymentGateway contract', () => {
    let gateway: PaymentGateway;
    beforeEach(() => { gateway = createGateway(); });
    it('returns PaymentResult with all required fields', async () => {
      const result = await gateway.charge(1000, 'USD');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactionId');
    });
  });
}
```

Reference: [Liskov Substitution Principle](https://en.wikipedia.org/wiki/Liskov_substitution_principle)
