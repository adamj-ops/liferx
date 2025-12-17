# Background Jobs

Background jobs are internal processes that compound intelligence without user interaction.

## Overview

Jobs are:
- **Triggered manually** via internal API endpoints (protected by `X-Internal-Secret`)
- **Idempotent** - safe to run multiple times
- **Auditable** - all writes go through the tool executor
- **Org-scoped** - require `org_id` for multi-tenancy

---

## Theme Scanner

Scans recent interviews for recurring themes. Extracts themes using AI, stores them with evidence for explainability.

### Endpoint

```
POST /api/internal/jobs/theme-scan
```

### Headers

```
X-Internal-Secret: <your-internal-shared-secret>
Content-Type: application/json
```

### Request Body

```json
{
  "org_id": "uuid-here",
  "lookback_days": 30,
  "max_interviews": 50,
  "dry_run": false
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `org_id` | UUID | Yes | - | Organization ID |
| `lookback_days` | number | No | 30 | How far back to scan |
| `max_interviews` | number | No | 50 | Max interviews to analyze |
| `dry_run` | boolean | No | false | Extract without writing |

### Response

```json
{
  "success": true,
  "result": {
    "dry_run": false,
    "themes_created": 3,
    "themes_updated": 2,
    "links_created": 15,
    "skipped": [],
    "themes": [
      {
        "name": "Redefining Success",
        "slug": "redefining-success",
        "confidence_score": 0.92,
        "occurrences": 5,
        "action": "created"
      }
    ]
  }
}
```

### Dry Run Mode

Set `dry_run: true` to extract themes without writing to the database.
Useful for prompt iteration and testing.

Actions will show as `would_create` or `would_update` instead of `created` or `updated`.

### Safety Caps

| Cap | Value | Description |
|-----|-------|-------------|
| `MAX_THEMES_PER_RUN` | 20 | Maximum themes processed per run |
| `MAX_LINKS_PER_THEME` | 20 | Maximum interview/quote links per theme |

### Example: cURL

```bash
curl -X POST https://your-app.vercel.app/api/internal/jobs/theme-scan \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: your-secret-here" \
  -d '{
    "org_id": "123e4567-e89b-12d3-a456-426614174000",
    "lookback_days": 30,
    "dry_run": true
  }'
```

---

## Scheduling (Future)

Jobs are currently triggered manually. Future scheduling options:

### 1. Railway Cron

Add a Railway cron service that calls the endpoint on schedule.

```yaml
# railway.toml
[cron]
schedule = "0 6 * * *"  # Daily at 6 AM UTC
command = "curl -X POST..."
```

### 2. GitHub Actions

Create a scheduled workflow:

```yaml
# .github/workflows/theme-scanner.yml
name: Theme Scanner
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Run Theme Scanner
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/internal/jobs/theme-scan \
            -H "Content-Type: application/json" \
            -H "X-Internal-Secret: ${{ secrets.INTERNAL_SHARED_SECRET }}" \
            -d '{"org_id": "${{ secrets.ORG_ID }}"}'
```

### 3. Vercel Cron

Configure in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/internal/jobs/theme-scan",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Note: Vercel cron requires the endpoint to support GET or use edge middleware.

### 4. Supabase pg_cron

Use database-level scheduling:

```sql
SELECT cron.schedule(
  'theme-scanner-daily',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-app.vercel.app/api/internal/jobs/theme-scan',
      headers := '{"X-Internal-Secret": "...", "Content-Type": "application/json"}',
      body := '{"org_id": "..."}'
    );
  $$
);
```

Requires `pg_cron` and `pg_net` extensions enabled.

---

## Adding New Jobs

1. Create job file in `src/jobs/<jobName>.ts`
2. Export `run<JobName>` function with typed input/output
3. Create API route in `app/api/internal/jobs/<job-name>/route.ts`
4. Protect with `X-Internal-Secret`
5. Document in this file

