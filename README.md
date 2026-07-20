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