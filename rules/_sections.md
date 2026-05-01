# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
Adapted for NestJS + Drizzle ORM + PostgreSQL stack.

---

## 1. Architecture (arch)

**Impact:** CRITICAL
**Description:** Proper module organization and dependency management are the foundation of maintainable NestJS applications. Circular dependencies and god services are the #1 architecture killer.

## 2. Dependency Injection (di)

**Impact:** CRITICAL
**Description:** NestJS's IoC container is powerful but can be misused. Understanding scopes, injection tokens, and proper patterns is essential for testable code.

## 3. Error Handling (error)

**Impact:** HIGH
**Description:** Consistent error handling improves debugging, user experience, and API reliability. Centralized exception filters ensure uniform error responses.

## 4. Security (security)

**Impact:** HIGH
**Description:** Security vulnerabilities can be catastrophic. Input validation, authentication, authorization, and data protection are non-negotiable.

## 5. Database & ORM (db)

**Impact:** HIGH
**Description:** Proper database access patterns, Drizzle ORM usage, transactions, and query optimization are crucial for data-intensive applications. SQL injection prevention is critical with AI-generated code.

## 6. Performance (perf)

**Impact:** MEDIUM-HIGH
**Description:** Optimizing request handling, caching, and database queries directly impacts application responsiveness and scalability.

## 7. API Design (api)

**Impact:** MEDIUM
**Description:** RESTful conventions, versioning, DTOs, and consistent response formats improve API usability and maintainability.

## 8. Testing (test)

**Impact:** MEDIUM-HIGH
**Description:** Well-tested applications are more reliable. NestJS testing utilities enable comprehensive unit and e2e coverage.

## 9. Microservices (micro)

**Impact:** MEDIUM
**Description:** Building distributed systems requires understanding message patterns, health checks, and inter-service communication.

## 10. DevOps & Deployment (devops)

**Impact:** LOW-MEDIUM
**Description:** Configuration management, structured logging, and graceful shutdown ensure production readiness and zero-downtime deployments.