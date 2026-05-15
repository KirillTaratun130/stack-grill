# @repo/db

Слой доступа к данным монорепозитория: Prisma 7 + PostgreSQL.
Экспортирует готовый singleton `PrismaClient` и все сгенерированные типы.

- **ORM:** Prisma `7.8.x` (генератор `prisma-client`, driver adapter `@prisma/adapter-pg`)
- **БД:** PostgreSQL
- **Схема:** [`prisma/schema.prisma`](./prisma/schema.prisma)
- **Конфиг:** [`prisma.config.ts`](./prisma.config.ts) (грузит `.env` через `dotenv`)
- **Сгенерированный клиент:** `generated/prisma/` (в git **не** коммитится)

---

## 1. Настройка окружения

`.env` git-игнорируется. Скопируйте шаблон и впишите реальную строку подключения:

```bash
cp packages/db/.env.example packages/db/.env
```

```dotenv
# packages/db/.env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/stack_grill?schema=public"
```

> В Prisma 7 `.env` **не** загружается автоматически. Он подхватывается через
> `import "dotenv/config"` в `prisma.config.ts` — это уже настроено.

---

## 2. Генерация клиента

Запускать **после `pnpm install`, изменения схемы или клонирования репозитория** —
папка `generated/prisma/` не хранится в git, без неё импорт из `@repo/db` не соберётся.

```bash
# из любого места монорепо
pnpm --filter @repo/db db:generate

# либо из packages/db
pnpm db:generate
```

---

## 3. Команды

Все скрипты живут в `package.json` пакета. Префикс из корня — `pnpm --filter @repo/db <script>`.

| Скрипт              | Команда              | Назначение                                                        |
| ------------------- | -------------------- | ----------------------------------------------------------------- |
| `db:generate`       | `prisma generate`    | Сгенерировать клиент в `generated/prisma/`                         |
| `db:migrate`        | `prisma migrate dev` | Создать и применить миграцию в dev (спросит имя миграции)          |
| `db:deploy`         | `prisma migrate deploy` | Применить готовые миграции (CI / прод, без генерации новых)     |
| `db:push`           | `prisma db push`     | Залить схему в БД без файла миграции (быстрый прототип)            |
| `db:studio`         | `prisma studio`      | Web-GUI для просмотра/правки данных                                |
| `lint`              | `eslint .`           | Линт пакета                                                       |
| `check-types`       | `tsc --noEmit`       | Проверка типов                                                    |

---

## 4. Типичный цикл работы со схемой

```bash
# 1. Отредактировать модели в prisma/schema.prisma
# 2. Создать миграцию + применить её к dev-БД + перегенерировать клиент
pnpm --filter @repo/db db:migrate
#    -> Prisma спросит имя миграции, напр. "add_user"

# 3. Готово. Клиент обновлён, новые типы доступны через @repo/db
```

Деплой на проде / в CI (миграции уже в репозитории):

```bash
pnpm --filter @repo/db db:deploy
pnpm --filter @repo/db db:generate
```

---

## 5. Использование из других пакетов

Добавьте зависимость в нужное приложение (напр. `apps/api`):

```jsonc
// apps/api/package.json
{
  "dependencies": {
    "@repo/db": "workspace:*"
  }
}
```

```bash
pnpm install
```

Затем импортируйте singleton-клиент и типы из одной точки:

```ts
import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db"; // сгенерированные типы тоже ре-экспортируются

const users = await prisma.user.findMany();
```

`prisma` — единый инстанс на процесс (в dev переиспользуется через `globalThis`,
чтобы hot-reload не плодил подключения). Создавать `new PrismaClient()`
вручную в приложениях не нужно.

---

## 6. Частые проблемы

| Симптом                                              | Причина / решение                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `Cannot find module '../generated/prisma/client.js'` | Не сгенерирован клиент → `pnpm --filter @repo/db db:generate`             |
| `DATABASE_URL is not set`                            | Нет `packages/db/.env` → скопировать из `.env.example` (см. п.1)          |
| Изменил схему, новых полей нет в типах                | Не перегенерирован клиент → `db:generate` (или `db:migrate`, он генерит)  |
| Ошибка подключения к БД                               | PostgreSQL не запущен или неверный `DATABASE_URL`                         |
