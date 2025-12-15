import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const sizes = await prisma.size.findMany({
      orderBy: {
        price: 'asc'
      }
    })
    return NextResponse.json(sizes)
  } catch (error) {
    console.error('Error fetching sizes:', error)
    return NextResponse.json({ error: 'Failed to fetch sizes' }, { status: 500 })
  }
}