import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

async function main() {
  const [inventories, movementTotals] = await Promise.all([
    prisma.inventory.findMany({
      select: {
        productId: true,
        quantity: true,
        product: { select: { name: true, sku: true } },
      },
    }),
    prisma.inventoryMovement.groupBy({
      by: ['productId'],
      _sum: { quantityChange: true },
    }),
  ]);

  const movementByProduct = new Map(
    movementTotals.map((row) => [row.productId, row._sum.quantityChange ?? 0])
  );
  const differences = inventories
    .map((inventory) => ({
      productId: inventory.productId,
      product: inventory.product.name,
      sku: inventory.product.sku,
      storedQuantity: inventory.quantity,
      ledgerQuantity: movementByProduct.get(inventory.productId) ?? 0,
    }))
    .filter((row) => row.storedQuantity !== row.ledgerQuantity);

  const result = {
    checkedProducts: inventories.length,
    consistentProducts: inventories.length - differences.length,
    differences,
  };
  console.log(JSON.stringify(result, null, 2));
  if (differences.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('No se pudo auditar la consistencia del inventario.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
