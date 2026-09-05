# Development seed

Fixtures for local development only. **Never run against production** — the seed
script refuses unless you explicitly opt in.

## 1. Create the auth users

Domain seed data references real `auth.users` rows. Create them through the local
Auth API (not by inserting into `auth.users` by hand — the schema is owned by
Supabase and changes between releases):

```bash
for email in carla@dev.local tomas@dev.local adele@dev.local eva@dev.local; do
  curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"devpassword123\",\"email_confirm\":true}"
done
```

The `on_auth_user_created` trigger creates the matching `public.profiles` rows.

## 2. Run the seed

```bash
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v allow_dev_seed=on \
  -v carla_id=<uuid> -v tomas_id=<uuid> -v adele_id=<uuid> -v eva_id=<uuid> \
  -f supabase/seed/dev/001_dev_fixtures.sql
```

## 3. Reset

```bash
psql "$DATABASE_URL" -v allow_dev_seed=on -f supabase/seed/dev/999_reset.sql
```
