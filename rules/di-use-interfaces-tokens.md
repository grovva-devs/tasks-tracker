---
title: Use Injection Tokens for Interfaces
impact: HIGH
impactDescription: Enables interface-based DI at runtime
tags: dependency-injection, tokens, interfaces
---

## Use Injection Tokens for Interfaces

TypeScript interfaces are erased at compile time and can't be used as injection tokens. Use string tokens, symbols, or abstract classes when you want to inject implementations of interfaces.

**Incorrect:**

```typescript
interface PaymentGateway { charge(amount: number): Promise<PaymentResult>; }
@Injectable()
export class OrdersService {
  constructor(private payment: PaymentGateway) {} // WON'T work at runtime!
}
```

**Correct:**

```typescript
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
export interface PaymentGateway { charge(amount: number): Promise<PaymentResult>; }

@Injectable()
export class StripeService implements PaymentGateway { /* ... */ }

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: StripeService }],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentModule {}

@Injectable()
export class OrdersService {
  constructor(@Inject(PAYMENT_GATEWAY) private payment: PaymentGateway) {}
}
```

Reference: [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
