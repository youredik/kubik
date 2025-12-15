#!/usr/bin/env node

const { spawn } = require('child_process');

// JSON-RPC клиент для общения с MCP серверами
class MCPClient {
  constructor(port) {
    this.port = port;
    this.nextId = 1;
  }

  async call(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const curl = spawn('curl', [
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify(request),
        `http://localhost:${this.port}`
      ]);

      let stdout = '';
      let stderr = '';

      curl.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      curl.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      curl.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(stdout);
            resolve(response);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${stdout}`));
          }
        } else {
          reject(new Error(`Curl failed with code ${code}: ${stderr}`));
        }
      });

      curl.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// Тестирование сайта с помощью MCP браузерного сервера
async function testWebsite() {
  console.log('🚀 Начинаем тестирование сайта с помощью MCP браузерного сервера...\n');

  const browserClient = new MCPClient(3002); // Предполагаем, что браузерный сервер на порту 3002

  try {
    // 1. Навигация на главную страницу
    console.log('1. Открываем главную страницу...');
    const navigateResult = await browserClient.call('navigate', {
      url: 'http://localhost:3000',
      waitUntil: 'load'
    });
    console.log('✅ Страница загружена:', navigateResult.result?.content?.[0]?.text || 'OK');

    // 2. Делаем скриншот
    console.log('\n2. Делаем скриншот главной страницы...');
    const screenshotResult = await browserClient.call('screenshot', {
      fullPage: true
    });
    console.log('✅ Скриншот сделан, размер:', screenshotResult.result?.content?.[1]?.text || 'Unknown');

    // 3. Проверяем заголовок страницы
    console.log('\n3. Проверяем заголовок страницы...');
    const titleResult = await browserClient.call('get_text', {
      selector: 'h1'
    });
    console.log('✅ Заголовок:', titleResult.result?.content?.[0]?.text || 'Not found');

    // 4. Проверяем наличие продуктов
    console.log('\n4. Ищем продукты на странице...');
    const productsResult = await browserClient.call('get_text', {
      selector: '.grid'
    });
    console.log('✅ Найдено продуктов:', productsResult.result?.content?.[0]?.text ? 'Да' : 'Нет');

    // 5. Проверяем навигацию в админку
    console.log('\n5. Переходим в админ-панель...');
    const adminNavigate = await browserClient.call('navigate', {
      url: 'http://localhost:3000/admin',
      waitUntil: 'load'
    });
    console.log('✅ Админ-панель загружена:', adminNavigate.result?.content?.[0]?.text || 'OK');

    // 6. Проверяем админ-панель
    console.log('\n6. Проверяем содержимое админ-панели...');
    const adminContent = await browserClient.call('get_html', {
      selector: 'body'
    });
    console.log('✅ Админ-панель содержит контент:', adminContent.result?.content?.[0]?.text?.length > 0 ? 'Да' : 'Нет');

    console.log('\n🎉 Тестирование сайта завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);

    // Попробуем получить больше информации об ошибке
    try {
      const pageContent = await browserClient.call('get_html', {});
      console.log('📄 Текущее содержимое страницы:', pageContent.result?.content?.[0]?.text?.substring(0, 500) + '...');
    } catch (e) {
      console.error('❌ Не удалось получить содержимое страницы');
    }
  }
}

// Запуск тестирования
if (require.main === module) {
  testWebsite().catch(console.error);
}

module.exports = { MCPClient, testWebsite };