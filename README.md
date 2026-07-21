# New You Software

A clinic management system built with Next.js, Prisma, and Tailwind CSS.

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Development Setup

```bash
npm install
npm run dev
```

### Database

This project uses Prisma ORM with SQLite by default.

#### SQLite (Development)
```bash
# Default configuration
npx prisma db push
```

#### MySQL (Production)
1. Update `.env`:
```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/newyou_hms"
DIRECT_URL="mysql://USER:PASSWORD@HOST:3306/newyou_hms"
```

2. Install MySQL driver:
```bash
npm install mysql2
npm install --save-dev @types/mysql2
```

3. Run migration:
```bash
npx prisma migrate dev --name init
```

### Prisma Commands
| Command | Description |
|---------|-------------|
| `npx prisma db push` | Sync schema to database (no migrations) |
| `npx prisma migrate dev` | Create migrations and sync |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx prisma generate` | Regenerate Prisma Client |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test:api` | Run API tests |
| `npm run db:seed` | Seed database |
| `npm run db:push` | Push schema to database |

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## License

MIT

# Prisma + MySQL Setup Guide

## 1. Configure the Database Connection

Update your `.env` file:

```env
DATABASE_URL="mysql://root:password@localhost:3306/newyou_hms"
```

---

## 2. Generate the Prisma Client

Run:

```bash
npx prisma generate
```

---

## 3. Create the Database Tables

### Recommended (Using Migrations)

```bash
npx prisma migrate dev --name init_mysql
```

This command will:

* Create the database (if it doesn't exist)
* Create all tables from `schema.prisma`
* Create a migration inside `prisma/migrations/`
* Generate the Prisma Client automatically

---

### Alternative (Without Migrations)

If you don't want migration history, you can use:

```bash
npx prisma db push
```

> **Note:** For production applications, using migrations is recommended.

---

## 4. After Changing `schema.prisma`

Whenever you modify your Prisma schema, create a new migration:

```bash
npx prisma migrate dev --name describe_change
```

### Examples

```bash
npx prisma migrate dev --name add_patient_status
npx prisma migrate dev --name add_invoice_fields
npx prisma migrate dev --name update_followup_table
```

---

## Recommended Workflow

### First-Time Setup

```bash
npx prisma generate
npx prisma migrate dev --name init_mysql
```

### Future Schema Changes

```bash
npx prisma migrate dev --name describe_change
```

---

## Best Practice

* ✅ Use `prisma migrate dev` during development.
* ✅ Commit the `prisma/migrations/` folder to Git.
* ✅ Use `prisma migrate deploy` when deploying to production.
* ❌ Avoid mixing `prisma db push` and `prisma migrate dev` in the same project.
