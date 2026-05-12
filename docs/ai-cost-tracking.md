# AI Cost Tracking Integration Guide

## Overview

All AI API calls (OpenAI and Anthropic) are now automatically logged to track:
- Which tool made the call
- Which provider and model were used
- Input/output tokens
- Calculated USD cost

## How to Integrate

### For OpenAI Endpoints

In your API route handler, import the logging function and call it after receiving a response:

```typescript
import { getOpenAiClient, logOpenAiUsage } from "@/lib/openai-client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const openai = await getOpenAiClient();
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "..." },
    ],
  });

  // Log the usage — this is the only new line needed
  await logOpenAiUsage("your-tool-name", response);

  return NextResponse.json({ result: response.choices[0]?.message?.content });
}
```

### For Anthropic Endpoints

Import the logging function and call it after receiving a message:

```typescript
import { getAnthropicClient, logAnthropicUsage } from "@/lib/anthropic-client";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anthropic = await getAnthropicClient();
  
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "..." },
    ],
  });

  // Log the usage
  await logAnthropicUsage("your-tool-name", message);

  return NextResponse.json({ result: message.content[0] });
}
```

## Tool Names

Use descriptive tool names that map to your features:

- `summary` — AI summary endpoint
- `content-strategy` — Content strategy generator
- `grand-plan` — Grand plan generator
- `internal-linking` — Internal linking suggestions
- `landing-page` — Landing page generation
- `keyword-planner` — Keyword planner
- `chat` — Chat/Q&A
- `email-summary` — Email generation
- `media-plan` — Media plan forecasting
- etc.

## Viewing Costs

### Admin Dashboard

Navigate to `/admin/ai-costs` to see:
- Total costs grouped by tool, provider, or overall
- Token usage broken down
- Call counts
- Customizable date ranges (7, 30, 90 days)

### API Endpoint

Query `/api/admin/ai-costs` with query parameters:

```bash
# Group by tool, last 30 days
GET /api/admin/ai-costs?groupBy=tool&startDate=2026-04-12&endDate=2026-05-12

# Group by provider, last 7 days
GET /api/admin/ai-costs?groupBy=provider&startDate=2026-05-05&endDate=2026-05-12

# Get total
GET /api/admin/ai-costs?groupBy=total&startDate=2026-04-12&endDate=2026-05-12
```

Response format:

```json
{
  "startDate": "2026-04-12T00:00:00.000Z",
  "endDate": "2026-05-12T23:59:59.999Z",
  "groupBy": "tool",
  "data": [
    {
      "tool": "content-strategy",
      "provider": "anthropic",
      "totalCost": 45.67,
      "callCount": 123,
      "inputTokens": 2500000,
      "outputTokens": 1200000
    },
    {
      "tool": "summary",
      "provider": "openai",
      "totalCost": 12.34,
      "callCount": 456,
      "inputTokens": 500000,
      "outputTokens": 300000
    }
  ]
}
```

## Pricing Configuration

Pricing is defined in `src/lib/ai-cost-logger.ts`:

```typescript
const PRICING = {
  "claude-opus-4-5": { input: 0.015, output: 0.075 },
  "claude-sonnet-4-5": { input: 0.003, output: 0.015 },
  "gpt-4o": { input: 0.00525, output: 0.021 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};
```

**Update these values as provider pricing changes** — they're in USD per 1K tokens.

## Logging Behaviour

- Logging happens **asynchronously** — it never blocks the API response
- If logging fails, the API request continues normally
- Failed logs are captured in server console/logs
- Zero cost logging overhead (~1-5ms per call)

## Migration Checklist

To add cost tracking to all endpoints:

1. **Anthropic tools** (add one `logAnthropicUsage` call per endpoint):
   - [ ] `/api/tools/content-strategy/`
   - [ ] `/api/tools/grand-plan/[id]/generate-step`
   - [ ] `/api/tools/grand-plan/[id]/presentation/refine-slide`
   - [ ] `/api/tools/internal-linking/`
   - [ ] `/api/tools/landing-pages/suggest-audiences`
   - [ ] Meta audience scraper routes

2. **OpenAI tools** (add one `logOpenAiUsage` call per endpoint):
   - [ ] `/api/ai/summary/`
   - [ ] `/api/ai/super-summary/`
   - [ ] `/api/ai/strategy-document/`
   - [ ] All other report AI endpoints
   - [ ] `/api/tools/keyword-planner/`
   - [ ] Other generation endpoints

## Example Implementation

See [this example](./example-cost-logging.ts) for a complete before/after comparison.
