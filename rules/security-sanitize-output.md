---
title: Sanitize Output to Prevent XSS
impact: HIGH
impactDescription: XSS vulnerabilities can compromise user sessions and data
tags: security, xss, sanitization, html
---

## Sanitize Output to Prevent XSS

Sanitize user-generated content before storage using `sanitize-html`. Use Helmet for CSP headers. Never reflect user input in error messages without validation. Never expose sensitive fields in responses.

```typescript
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class CommentsService {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: { a: ['href', 'title'] },
  };

  async create(dto: CreateCommentDto): Promise<Comment> {
    return this.repo.save({
      content: sanitizeHtml(dto.content, this.sanitizeOptions),
      authorId: dto.authorId,
    });
  }
}

// Helmet for CSP
import helmet from 'helmet';
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
```

Reference: [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
