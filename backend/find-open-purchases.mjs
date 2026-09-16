import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.purchaseItem.findMany({
    where: { productId: { in: [20, 21] } },
    select: { id: true, productId: true, purchase: { select: { id: true, status: true, orderNumber: true } } },
  });
  console.log(JSON.stringify(items, null, 2));
}
main().finally(() => prisma.$disconnect());
