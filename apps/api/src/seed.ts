import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = 'dev-password-123';
  const hash = await argon2.hash(password);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@openmusic.dev' },
    update: {},
    create: {
      email: 'admin@openmusic.dev',
      passwordHash: hash,
      role: 'admin',
      displayName: 'Admin',
    },
  });

  const listener = await prisma.user.upsert({
    where: { email: 'listener@openmusic.dev' },
    update: {},
    create: {
      email: 'listener@openmusic.dev',
      passwordHash: hash,
      role: 'listener',
      displayName: 'Listener',
    },
  });

  // eslint-disable-next-line no-console
  console.info('Seeded users:', { admin: admin.id, listener: listener.id });
}

main()
  .catch((e: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
