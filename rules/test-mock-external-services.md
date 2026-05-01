---
title: Mock External Services in Tests
impact: HIGH
tags: testing,mocking,external-services,jest
---

## Mock External Services in Tests

Full rule with NestJS examples at: https://github.com/Kadajett/agent-nestjs-skills/blob/main/rules/test-mock-external-services.md

 echo "**Key Drizzle rules:** SELECT only needed columns, use proper indexes (PostgreSQL does NOT auto-create FK indexes), add indexes on WHERE/JOIN/ORDER BY columns, always paginate, use `db.query` with `with` for nested data, use `placeholder()` + `.prepare()` for repeated queries.";;
  perf-use-caching) echo "**Key principle:** Use NestJS CacheModule with Redis for production. Cache with TTL and invalidation. Don't cache everything — focus on high-impact areas. Invalidate on writes via events.";;
  perf-lazy-loading) echo "**Key principle:** Use LazyModuleLoader for rarely-used modules. Improves startup time for large applications and serverless cold starts.";;
  perf-async-hooks) echo "**Key principle:** Return promises from async lifecycle hooks (onModuleInit, onApplicationBootstrap). Never fire-and-forget async in constructors. Enable shutdown hooks via `app.enableShutdownHooks()`.";;
  devops-use-config-module) echo "**Key principle:** Never access process.env directly. Use ConfigModule with Joi validation at startup. Namespaced configs with registerAs(). Fail fast on misconfiguration.";;
  devops-graceful-shutdown) echo "**Key principle:** Enable shutdown hooks, stop accepting new requests on SIGTERM, wait for in-flight requests, close DB connections, clean up resources. Use health checks for k8s readiness probes.";;
  devops-use-logging) echo "**Key principle:** Use structured JSON logging in production. Include request ID, user ID. Use Pino for high performance. Redact sensitive data (passwords, tokens, authorization headers).";;
  test-use-testing-module) echo "**Key principle:** Use Test.createTestingModule with mocked dependencies. Never instantiate services manually. Mock Drizzle as { provide: DRIZZLE, useValue: mockDb }.";;
  test-e2e-supertest) echo "**Key principle:** Use Supertest against real NestJS app. Validate HTTP status codes, response shapes, and error messages. Use separate test database. Clean DB between tests.";;
  test-mock-external-services) echo "**Key principle:** Never call real APIs in tests. Mock all external services via injection tokens. Create mock factories for complex SDKs.";;
  micro-use-health-checks) echo "**Key principle:** Use @nestjs/terminus. /health/live for liveness (heap check), /health/ready for readiness (DB + Redis ping). Mark as unhealthy during shutdown so k8s stops routing traffic.";;
  micro-use-patterns) echo "**Key principle:** Use @MessagePattern for request-response (sync, needs reply). Use @EventPattern for fire-and-forget (async, no reply). Never use MessagePattern when you don't need a response.";;
  micro-use-queues) echo "**Key principle:** Use @nestjs/bullmq for background jobs (emails, reports, imports). Retry with exponential backoff. Never run long tasks in HTTP handlers.";;
esac)
