/**
 * Integration tests for the entire website functionality
 * These tests make real API calls to the running Next.js server
 */

const BASE_URL = 'http://localhost:3000'

describe('Website Integration Tests', () => {
  describe('API Endpoints', () => {
    test('GET /api/products-simple returns products', async () => {
      const response = await fetch(`${BASE_URL}/api/products-simple`)
      expect(response.status).toBe(200)

      const products = await response.json()
      expect(Array.isArray(products)).toBe(true)
      expect(products.length).toBeGreaterThan(0)

      // Check product structure
      const product = products[0]
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('name')
      expect(product).toHaveProperty('article')
      expect(product).toHaveProperty('images')
      expect(product).toHaveProperty('available')
    })

    test('GET /api/sizes-simple returns sizes', async () => {
      const response = await fetch(`${BASE_URL}/api/sizes-simple`)
      expect(response.status).toBe(200)

      const sizes = await response.json()
      expect(Array.isArray(sizes)).toBe(true)
      expect(sizes.length).toBeGreaterThan(0)

      // Check size structure
      const size = sizes[0]
      expect(size).toHaveProperty('id')
      expect(size).toHaveProperty('label')
      expect(size).toHaveProperty('price')
    })

    test('POST /api/orders-simple creates order', async () => {
      const orderData = {
        name: 'Test Customer',
        phone: '+1234567890',
        deliveryType: 'pickup',
        address: '',
        comment: 'Test order',
        items: [
          {
            productName: 'Test Product',
            article: 'TEST001',
            sizeLabel: '10×15',
            quantity: 1,
            price: 100
          }
        ],
        total: 100
      }

      const response = await fetch(`${BASE_URL}/api/orders-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      expect(response.status).toBe(201)

      const result = await response.json()
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('orderNumber')
      expect(result).toHaveProperty('total', 100)
      expect(result).toHaveProperty('order')
    })

    test('GET /api/orders-simple returns orders', async () => {
      const response = await fetch(`${BASE_URL}/api/orders-simple`)
      expect(response.status).toBe(200)

      const orders = await response.json()
      expect(Array.isArray(orders)).toBe(true)

      if (orders.length > 0) {
        const order = orders[0]
        expect(order).toHaveProperty('id')
        expect(order).toHaveProperty('orderNumber')
        expect(order).toHaveProperty('customerName')
        expect(order).toHaveProperty('phone')
        expect(order).toHaveProperty('totalAmount')
        expect(order).toHaveProperty('createdAt')
        expect(order).toHaveProperty('items')
      }
    })
  })

  describe('Page Rendering', () => {
    test('GET / returns main page HTML', async () => {
      const response = await fetch(`${BASE_URL}/`)
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Заказ багетов')
      expect(html).toContain('Каталог багетов')
      expect(html).toContain('Админ')
    })

    test('GET /admin returns admin page HTML', async () => {
      const response = await fetch(`${BASE_URL}/admin`)
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Админ-панель')
      expect(html).toContain('Управление багетами')
      expect(html).toContain('Багеты')
      expect(html).toContain('Размеры')
      expect(html).toContain('Заказы')
    })
  })

  describe('Database Integration', () => {
    test('Database contains seeded data', async () => {
      // Test products
      const productsResponse = await fetch(`${BASE_URL}/api/products-simple`)
      const products = await productsResponse.json()
      expect(products.length).toBeGreaterThanOrEqual(8) // At least the seeded products

      // Test sizes
      const sizesResponse = await fetch(`${BASE_URL}/api/sizes-simple`)
      const sizes = await sizesResponse.json()
      expect(sizes.length).toBeGreaterThanOrEqual(4) // At least the seeded sizes

      // Check for specific seeded products
      const productNames = products.map((p: any) => p.name)
      expect(productNames).toContain('Багет Классика')
      expect(productNames).toContain('Багет Модерн')
      expect(productNames).toContain('Багет Винтаж')
    })

    test('Order creation persists to database', async () => {
      const initialOrdersResponse = await fetch(`${BASE_URL}/api/orders-simple`)
      const initialOrders = await initialOrdersResponse.json()
      const initialCount = initialOrders.length

      // Create a new order
      const orderData = {
        name: 'Integration Test Customer',
        phone: '+9876543210',
        deliveryType: 'delivery',
        address: 'Test Address 123',
        comment: 'Integration test order',
        items: [
          {
            productName: 'Багет Классика',
            article: 'BG001',
            sizeLabel: '10×15',
            quantity: 2,
            price: 100
          }
        ],
        total: 200
      }

      const createResponse = await fetch(`${BASE_URL}/api/orders-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      expect(createResponse.status).toBe(201)

      // Check that order was added
      const finalOrdersResponse = await fetch(`${BASE_URL}/api/orders-simple`)
      const finalOrders = await finalOrdersResponse.json()
      expect(finalOrders.length).toBe(initialCount + 1)

      // Check the last order
      const lastOrder = finalOrders[finalOrders.length - 1]
      expect(lastOrder.customerName).toBe('Integration Test Customer')
      expect(lastOrder.phone).toBe('+9876543210')
      expect(lastOrder.deliveryType).toBe('delivery')
      expect(lastOrder.address).toBe('Test Address 123')
      expect(lastOrder.comment).toBe('Integration test order')
      expect(lastOrder.totalAmount).toBe(200)
    })
  })

  describe('Business Logic', () => {
    test('Order number generation works correctly', async () => {
      const orderData = {
        name: 'Order Number Test',
        phone: '+1111111111',
        deliveryType: 'pickup',
        address: '',
        comment: '',
        items: [
          {
            productName: 'Test Product',
            article: 'TEST001',
            sizeLabel: '10×15',
            quantity: 1,
            price: 100
          }
        ],
        total: 100
      }

      const response = await fetch(`${BASE_URL}/api/orders-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      expect(result.orderNumber).toMatch(/^\d{4}$/) // Should be 4 digits
      expect(parseInt(result.orderNumber)).toBeGreaterThan(0)
    })

    test('Order total calculation is correct', async () => {
      const orderData = {
        name: 'Total Calculation Test',
        phone: '+2222222222',
        deliveryType: 'pickup',
        address: '',
        comment: '',
        items: [
          {
            productName: 'Test Product 1',
            article: 'TEST001',
            sizeLabel: '10×15',
            quantity: 2,
            price: 100
          },
          {
            productName: 'Test Product 2',
            article: 'TEST002',
            sizeLabel: '15×20',
            quantity: 1,
            price: 150
          }
        ],
        total: 350 // 2*100 + 1*150
      }

      const response = await fetch(`${BASE_URL}/api/orders-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      expect(result.total).toBe(350)
      expect(result.order.totalAmount).toBe(350)
    })
  })
})