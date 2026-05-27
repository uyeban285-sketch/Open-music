# Dev Infrastructure

## Quick start

```bash
pnpm infra:up      # поднять Postgres, Redis, MinIO, mock-KMS
cp .env.example .env
pnpm db:seed:dev   # заполнить БД начальными данными (после pnpm prisma migrate dev)
```

## Services

| Service   | URL                   | Credentials                 |
| --------- | --------------------- | --------------------------- |
| Postgres  | localhost:5432        | open_music / open_music_dev |
| Redis     | localhost:6379        | —                           |
| MinIO API | http://localhost:9000 | open_music / open_music_dev |
| MinIO UI  | http://localhost:9001 | open_music / open_music_dev |
| Mock KMS  | http://localhost:2599 | —                           |

## Seed users

After running `pnpm db:seed:dev`:

| Email                  | Role     | Password                 |
| ---------------------- | -------- | ------------------------ |
| admin@openmusic.dev    | admin    | (set via /auth/register) |
| listener@openmusic.dev | listener | (set via /auth/register) |
