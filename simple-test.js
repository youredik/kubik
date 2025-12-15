#!/usr/bin/env node

const http = require('http')

const BASE_URL = 'http://localhost:3000'

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })
  })
}

async function runTests() {
  console.log('🚀 Проверка работоспособности сайта...\n')

  const tests = [
    {
      name: 'Главная страница загружается',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/`)
        if (response.status !== 200) throw new Error(`Ожидался 200, получен ${response.status}`)
        if (!response.data.includes('Заказ багетов')) throw new Error('Не найден заголовок страницы')
        return true
      }
    },
    {
      name: 'Админ-панель загружается',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/admin`)
        if (response.status !== 200) throw new Error(`Ожидался 200, получен ${response.status}`)
        if (!response.data.includes('Админ-панель')) throw new Error('Не найден заголовок админ-панели')
        return true
      }
    },
    {
      name: 'API товаров работает',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/api/products-simple`)
        if (response.status !== 200) throw new Error(`Ожидался 200, получен ${response.status}`)
        if (!Array.isArray(response.data)) throw new Error('Ожидался массив товаров')
        if (response.data.length === 0) throw new Error('Ожидался хотя бы один товар')
        return true
      }
    },
    {
      name: 'API размеров работает',
      test: async () => {
        const response = await makeRequest(`${BASE_URL}/api/sizes-simple`)
        if (response.status !== 200) throw new Error(`Ожидался 200, получен ${response.status}`)
        if (!Array.isArray(response.data)) throw new Error('Ожидался массив размеров')
        if (response.data.length === 0) throw new Error('Ожидался хотя бы один размер')
        return true
      }
    },
    {
      name: 'Создание заказа работает',
      test: async () => {
        const orderData = JSON.stringify({
          name: 'Тестовый клиент',
          phone: '+79999999999',
          deliveryType: 'pickup',
          address: '',
          comment: 'Тестовый заказ',
          items: [{
            productName: 'Багет Классика',
            article: 'BG001',
            sizeLabel: '10×15',
            quantity: 1,
            price: 100
          }],
          total: 100
        })

        return new Promise((resolve, reject) => {
          const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders-simple',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(orderData)
            }
          }

          const req = http.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => {
              data += chunk
            })
            res.on('end', () => {
              try {
                if (res.statusCode !== 201) {
                  reject(new Error(`Ожидался 201, получен ${res.statusCode}`))
                  return
                }
                const result = JSON.parse(data)
                if (!result.success) {
                  reject(new Error('Заказ не создан'))
                  return
                }
                resolve(true)
              } catch {
                reject(new Error('Ошибка парсинга ответа'))
              }
            })
          })

          req.on('error', (err) => {
            reject(err)
          })

          req.write(orderData)
          req.end()
        })
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const testCase of tests) {
    try {
      await testCase.test()
      console.log(`✅ ${testCase.name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${testCase.name}: ${error.message}`)
      failed++
    }
  }

  console.log('\n📊 Результаты тестирования:')
  console.log(`✅ Пройдено: ${passed}`)
  console.log(`❌ Провалено: ${failed}`)
  console.log(`📈 Всего: ${passed + failed}`)

  if (failed === 0) {
    console.log('\n🎉 Все тесты пройдены! Сайт работает корректно.')
    process.exit(0)
  } else {
    console.log('\n❌ Некоторые тесты провалены.')
    process.exit(1)
  }
}

runTests().catch(error => {
  console.error('Ошибка выполнения тестов:', error)
  process.exit(1)
})