#!/usr/bin/env node

/**
 * Manual integration test script for the website
 * This script tests the website functionality by making real HTTP requests
 */

const http = require('http')
const https = require('https')

const BASE_URL = 'http://localhost:3000'

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    const req = protocol.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    if (options.method === 'POST' && options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

async function runTests() {
  console.log('🚀 Starting website integration tests...\n')

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }

  function test(name, testFn) {
    return async () => {
      try {
        await testFn()
        console.log(`✅ ${name}`)
        results.passed++
        results.tests.push({ name, status: 'passed' })
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`)
        results.failed++
        results.tests.push({ name, status: 'failed', error: error.message })
      }
    }
  }

  // Test API endpoints
  try {
    const response = await makeRequest(`${BASE_URL}/api/products-simple`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!Array.isArray(response.data)) throw new Error('Expected array of products')
    if (response.data.length === 0) throw new Error('Expected at least one product')
    const product = response.data[0]
    if (!product.id || !product.name || !product.article) {
      throw new Error('Product missing required fields')
    }
    console.log(`✅ GET /api/products-simple returns products`)
    results.passed++
  } catch (error) {
    console.log(`❌ GET /api/products-simple returns products: ${error.message}`)
    results.failed++
  }

  try {
    const response = await makeRequest(`${BASE_URL}/api/sizes-simple`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!Array.isArray(response.data)) throw new Error('Expected array of sizes')
    if (response.data.length === 0) throw new Error('Expected at least one size')
    const size = response.data[0]
    if (!size.id || !size.label || !size.price) {
      throw new Error('Size missing required fields')
    }
    console.log(`✅ GET /api/sizes-simple returns sizes`)
    results.passed++
  } catch (error) {
    console.log(`❌ GET /api/sizes-simple returns sizes: ${error.message}`)
    results.failed++
  }

  await test('POST /api/orders-simple creates order', async () => {
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

    const response = await makeRequest(`${BASE_URL}/api/orders-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })

    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`)
    if (!response.data.success) throw new Error('Order creation failed')
    if (!response.data.orderNumber) throw new Error('Missing order number')
  })

  await test('GET /api/orders-simple returns orders', async () => {
    const response = await makeRequest(`${BASE_URL}/api/orders-simple`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (!Array.isArray(response.data)) throw new Error('Expected array of orders')
  })

  // Test page rendering
  await test('GET / returns main page HTML', async () => {
    const response = await makeRequest(`${BASE_URL}/`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (typeof response.data !== 'string') throw new Error('Expected HTML string')
    if (!response.data.includes('Заказ багетов')) throw new Error('Missing page title')
    if (!response.data.includes('Каталог багетов')) throw new Error('Missing catalog section')
  })

  await test('GET /admin returns admin page HTML', async () => {
    const response = await makeRequest(`${BASE_URL}/admin`)
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`)
    if (typeof response.data !== 'string') throw new Error('Expected HTML string')
    if (!response.data.includes('Админ-панель')) throw new Error('Missing admin title')
    if (!response.data.includes('Багеты')) throw new Error('Missing products tab')
  })

  // Test database integration
  await test('Database contains seeded data', async () => {
    const productsResponse = await makeRequest(`${BASE_URL}/api/products-simple`)
    const products = productsResponse.data
    if (products.length < 8) throw new Error(`Expected at least 8 products, got ${products.length}`)

    const productNames = products.map(p => p.name)
    if (!productNames.includes('Багет Классика')) throw new Error('Missing seeded product')

    const sizesResponse = await makeRequest(`${BASE_URL}/api/sizes-simple`)
    const sizes = sizesResponse.data
    if (sizes.length < 4) throw new Error(`Expected at least 4 sizes, got ${sizes.length}`)
  })

  // Test business logic
  await test('Order number generation works correctly', async () => {
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

    const response = await makeRequest(`${BASE_URL}/api/orders-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })

    const result = response.data
    if (!result.orderNumber.match(/^\d{4}$/)) {
      throw new Error(`Invalid order number format: ${result.orderNumber}`)
    }
  })

  await test('Order total calculation is correct', async () => {
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
      total: 350
    }

    const response = await makeRequest(`${BASE_URL}/api/orders-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })

    const result = response.data
    if (result.total !== 350) throw new Error(`Expected total 350, got ${result.total}`)
    if (result.order.totalAmount !== 350) throw new Error(`Expected order total 350, got ${result.order.totalAmount}`)
  })

  // Print results
  console.log('\n📊 Test Results:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Total: ${results.passed + results.failed}`)

  if (results.failed > 0) {
    console.log('\n❌ Failed tests:')
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed! Website is working correctly.')
    process.exit(0)
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})
