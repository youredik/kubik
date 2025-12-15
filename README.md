# Магазин багетов - Next.js приложение

Полнофункциональный интернет-магазин багетов с админ-панелью, построенный на Next.js 16, TypeScript, Prisma ORM и SQLite.

## 🚀 Возможности

- 🛍️ **Каталог товаров** с изображениями и размерами
- 🛒 **Корзина покупок** с управлением количеством
- 📝 **Оформление заказов** с доставкой и самовывозом
- 👨‍💼 **Админ-панель** для управления товарами и заказами
- 📱 **Адаптивный дизайн** для всех устройств
- 🤖 **Telegram уведомления** о новых заказах
- 🐳 **Docker поддержка** для развертывания
- 🚀 **CI/CD** с автоматическим деплоем в Yandex Cloud

## 🛠️ Технологии

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** SQLite с Prisma ORM
- **Deployment:** Yandex Cloud Serverless Containers
- **CI/CD:** GitHub Actions
- **Notifications:** Telegram Bot API

## 📋 Предварительные требования

- Node.js 20+
- npm или yarn
- Git
- Yandex Cloud аккаунт (для развертывания)

## 🚀 Быстрый старт

### Локальная разработка

1. **Клонируйте репозиторий:**
   ```bash
   git clone git@github.com:youredik/kubik.git
   cd kubik
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Настройте переменные окружения:**
   ```bash
   cp .env.local.example .env.local
   # Отредактируйте .env.local с вашими значениями
   ```

4. **Запустите базу данных:**
   ```bash
   npm run db:seed
   ```

5. **Запустите приложение:**
   ```bash
   npm run dev
   ```

6. **Откройте в браузере:**
   ```
   http://localhost:3000
   ```

### Docker развертывание

```bash
# Сборка и запуск
docker-compose up --build

# Или отдельно
docker build -t baget-shop .
docker run -p 3000:3000 baget-shop
```

## 🔧 Настройка CI/CD

### 1. GitHub Secrets

Добавьте следующие секреты в ваш репозиторий GitHub:

#### Yandex Cloud
- `YANDEX_CLOUD_SA_KEY` - JSON ключ сервисного аккаунта
- `YANDEX_CLOUD_FOLDER_ID` - ID папки Yandex Cloud
- `YANDEX_CLOUD_REGISTRY_ID` - ID Container Registry
- `YANDEX_CLOUD_CONTAINER_STAGING_ID` - ID staging контейнера
- `YANDEX_CLOUD_CONTAINER_PROD_ID` - ID production контейнера
- `YANDEX_CLOUD_SA_ID` - ID сервисного аккаунта

#### Telegram Bot
- `TELEGRAM_BOT_TOKEN` - Токен Telegram бота
- `TELEGRAM_CHAT_ID` - ID чата для уведомлений

#### Security (опционально)
- `SNYK_TOKEN` - Токен для Snyk security scanning

### 2. Yandex Cloud настройка

1. **Создайте сервисный аккаунт:**
   ```bash
   yc iam service-account create baget-shop-deployer \
     --description "Service account for baget-shop deployment"
   ```

2. **Назначьте роли:**
   ```bash
   yc resource-manager folder add-access-binding <folder-id> \
     --role editor \
     --service-account-name baget-shop-deployer

   yc resource-manager folder add-access-binding <folder-id> \
     --role container-registry.admin \
     --service-account-name baget-shop-deployer

   yc resource-manager folder add-access-binding <folder-id> \
     --role serverless-containers.admin \
     --service-account-name baget-shop-deployer
   ```

3. **Создайте Container Registry:**
   ```bash
   yc container registry create --name baget-shop-registry
   ```

4. **Создайте Serverless Containers:**
   ```bash
   # Staging
   yc serverless container create --name baget-shop-staging

   # Production
   yc serverless container create --name baget-shop-prod
   ```

5. **Создайте JSON ключ:**
   ```bash
   yc iam key create --service-account-name baget-shop-deployer --output baget-shop-key.json
   ```

### 3. Telegram Bot настройка

1. **Создайте бота через @BotFather**
2. **Получите токен бота**
3. **Добавьте бота в чат и получите chat_id**

## 📊 CI/CD Pipeline

### Стадии:

1. **🧪 Testing** - Запуск тестов и линтинга
2. **🏗️ Build** - Сборка приложения
3. **🔒 Security** - Сканирование уязвимостей
4. **🚀 Staging** - Деплой в staging среду
5. **🎉 Production** - Деплой в production (ручное подтверждение)

### Автоматические проверки:

- ✅ **Unit tests** - Jest тесты
- ✅ **Integration tests** - API тестирование
- ✅ **Linting** - ESLint проверки
- ✅ **Type checking** - TypeScript проверки
- ✅ **Security audit** - npm audit
- ✅ **Snyk scanning** - уязвимости зависимостей

## 🗂️ Структура проекта

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/          # Админ-панель
│   │   ├── api/            # API маршруты
│   │   ├── order/          # Страница оформления заказа
│   │   └── page.tsx        # Главная страница
│   ├── lib/                # Утилиты
│   │   ├── prisma.ts       # Prisma клиент
│   │   └── telegram.ts     # Telegram интеграция
│   └── components/         # React компоненты
├── prisma/                 # База данных
│   ├── schema.prisma      # Схема БД
│   └── seed.ts            # Начальные данные
├── public/                 # Статические файлы
├── .github/               # GitHub Actions
│   └── workflows/
│       └── ci-cd.yml      # CI/CD pipeline
├── __tests__/             # Тесты
└── docker/                # Docker файлы
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
npm test

# Тесты с покрытием
npm run test:coverage

# Тесты в watch режиме
npm run test:watch
```

## 📚 API Endpoints

### Продукты
- `GET /api/products-simple` - Получить все продукты
- `POST /api/products-simple` - Создать продукт

### Размеры
- `GET /api/sizes-simple` - Получить все размеры

### Заказы
- `GET /api/orders-simple` - Получить все заказы
- `POST /api/orders-simple` - Создать заказ

### Загрузка изображений
- `POST /api/upload` - Загрузить изображение

## 🚀 Деплой

### Автоматический (через GitHub Actions)
1. Push в ветку `main`
2. Автоматический запуск CI/CD pipeline
3. Деплой в staging после успешных тестов
4. Ручное подтверждение для production

### Ручной деплой
```bash
# Сборка образа
docker build -t baget-shop .

# Push в Yandex Container Registry
docker tag baget-shop cr.yandex/<registry-id>/baget-shop:latest
docker push cr.yandex/<registry-id>/baget-shop:latest

# Деплой в Serverless Container
yc serverless container revision deploy \
  --container-id <container-id> \
  --image cr.yandex/<registry-id>/baget-shop:latest \
  --service-account-id <sa-id>
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

Если у вас возникли вопросы или проблемы:
- Создайте Issue в репозитории
- Напишите в Telegram: [@your_support_bot]

---

**Made with ❤️ for baget lovers**