---
title: Validate All Input with DTOs and Pipes
impact: HIGH
impactDescription: First line of defense against attacks
tags: security, validation, dto, pipes
---

## Validate All Input with DTOs and Pipes

Always validate incoming data using class-validator decorators on DTOs and the global ValidationPipe. Never trust user input.

```typescript
// Global pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
}));

// DTO
export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail() @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString() @MinLength(8) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;
}
```

Reference: [NestJS Validation](https://docs.nestjs.com/techniques/validation)
