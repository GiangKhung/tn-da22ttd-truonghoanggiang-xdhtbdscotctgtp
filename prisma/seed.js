const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('123', 10);
  const techHash = await bcrypt.hash('123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminHash,
      role: 'ADMIN',
      fullname: 'Quản trị viên'
    },
  });

  await prisma.user.upsert({
    where: { username: 'tech1' },
    update: {},
    create: {
      username: 'tech1',
      password: techHash,
      role: 'TECHNICIAN',
      fullname: 'Kỹ thuật viên 1'
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
