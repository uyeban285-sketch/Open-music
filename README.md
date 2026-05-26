# Open Music

Мульти-источниковый музыкальный агрегатор с единым плеером, AI-рекомендациями, премиальной визуализацией и динамической палитрой.

Подробнее — `.kiro/specs/open-music/requirements.md` и `.kiro/specs/open-music/design.md`.

## Структура монорепо

```
.
├── apps/
│   ├── api/                          # NestJS backend (TypeScript)
│   └── web/                          # Next.js frontend (TypeScript)
├── services/
│   └── ai/                           # FastAPI AI service (Python 3.11)
├── packages/
│   ├── shared/                       # Общие TS-контракты (DTO, Connector, Zod)
│   └── connectors/
│       ├── yandex-music/             # Yandex Music Connector
│       ├── youtube-music/            # YouTube Music Connector
│       └── file-import/              # Connector импорта из файлов экспорта
├── docker/                           # Init-скрипты dev-инфры
├── docker-compose.dev.yml            # Postgres+pgvector / Redis / MinIO
├── pnpm-workspace.yaml
├── tsconfig.base.json                # Корневой strict TS-конфиг
└── .github/workflows/ci.yml          # lint, typecheck, build, test
```

## Требования

- Node.js 20 LTS (см. `.nvmrc`)
- pnpm 9 (`npm install -g pnpm@9.15.0` или `corepack enable`)
- Docker Desktop (для dev-инфры)
- Python 3.11 (для `services/ai`, опционально на старте)

## Быстрый старт

```bash
# 1. Установить зависимости workspace
pnpm install

# 2. Поднять локальную инфраструктуру (Postgres + pgvector, Redis, MinIO)
pnpm infra:up

# 3. Скопировать переменные окружения
cp .env.example .env

# 4. Проверить тулинг
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Сервисы dev-инфры

| Сервис    | Адрес                   | Учётные данные (dev)            |
| --------- | ----------------------- | ------------------------------- |
| Postgres  | `localhost:5432`        | `open_music` / `open_music_dev` |
| Redis     | `localhost:6379`        | —                               |
| MinIO API | `http://localhost:9000` | `open_music` / `open_music_dev` |
| MinIO UI  | `http://localhost:9001` | те же                           |

В Postgres при первой инициализации автоматически создаются расширения `pgcrypto`, `citext`, `pg_trgm`, `vector` (см. `docker/postgres/initdb/`).

## Контроль качества

- ESLint (`@typescript-eslint`, `eslint-plugin-import`) + Prettier.
- TypeScript `strict` (см. `tsconfig.base.json`).
- Husky + lint-staged запускают ESLint и Prettier на pre-commit.
- GitHub Actions гоняет lint, format-check, typecheck, build, test на push/PR в `main`.

## Дальнейшее наполнение

Каркас задачи 1.1. Реализация модулей идёт по `.kiro/specs/open-music/tasks.md`.
