import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create sizes
  const sizes = [
    { id: '10x15', label: '10×15', price: 100 },
    { id: '15x20', label: '15×20', price: 150 },
    { id: '20x30', label: '20×30', price: 250 },
    { id: '30x40', label: '30×40', price: 300 },
  ]

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { id: size.id },
      update: {},
      create: size,
    })
  }

  // Create products
  const products = [
    { name: 'Багет Классика', article: 'BG001', images: '[]' },
    { name: 'Багет Модерн', article: 'BG002', images: '[]' },
    { name: 'Багет Винтаж', article: 'BG003', images: '[]' },
    { name: 'Багет Золото', article: 'BG004', images: '[]' },
    { name: 'Багет Серебро', article: 'BG005', images: '[]' },
    { name: 'Багет Черный', article: 'BG006', images: '[]' },
    { name: 'Багет Белый', article: 'BG007', images: '[]' },
    { name: 'Багет Дерево', article: 'BG008', images: '[]' },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { article: product.article },
      update: {},
      create: product,
    })
  }

  console.log('Database seeded successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })