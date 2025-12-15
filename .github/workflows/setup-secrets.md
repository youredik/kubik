# Настройка секретов GitHub для CI/CD

## 📋 Список необходимых секретов

### 🔑 Yandex Cloud секреты

#### 1. `YANDEX_CLOUD_SA_KEY`
**Описание:** JSON ключ сервисного аккаунта Yandex Cloud
**Как получить:**
```bash
# Создать сервисный аккаунт
yc iam service-account create baget-shop-deployer \
  --description "Service account for baget-shop deployment"

# Создать JSON ключ
yc iam key create --service-account-name baget-shop-deployer \
  --output baget-shop-key.json

# Скопировать содержимое файла baget-shop-key.json
cat baget-shop-key.json
```

#### 2. `YANDEX_CLOUD_FOLDER_ID`
**Описание:** ID папки Yandex Cloud
**Как получить:**
```bash
yc config get folder-id
# или
yc resource-manager folder list
```

#### 3. `YANDEX_CLOUD_REGISTRY_ID`
**Описание:** ID Container Registry
**Как получить:**
```bash
# Создать registry
yc container registry create --name baget-shop-registry

# Получить ID
yc container registry list
```

#### 4. `YANDEX_CLOUD_CONTAINER_STAGING_ID`
**Описание:** ID staging Serverless Container
**Как получить:**
```bash
# Создать контейнер
yc serverless container create --name baget-shop-staging

# Получить ID
yc serverless container list
```

#### 5. `YANDEX_CLOUD_CONTAINER_PROD_ID`
**Описание:** ID production Serverless Container
**Как получить:**
```bash
# Создать контейнер
yc serverless container create --name baget-shop-prod

# Получить ID
yc serverless container list
```

#### 6. `YANDEX_CLOUD_SA_ID`
**Описание:** ID сервисного аккаунта
**Как получить:**
```bash
yc iam service-account list
```

### 🤖 Telegram секреты

#### 7. `TELEGRAM_BOT_TOKEN`
**Описание:** Токен Telegram бота для уведомлений
**Как получить:**
1. Написать @BotFather в Telegram
2. Отправить `/newbot`
3. Следовать инструкциям для создания бота
4. Скопировать токен из сообщения BotFather

#### 8. `TELEGRAM_CHAT_ID`
**Описание:** ID чата для получения уведомлений
**Как получить:**
1. Добавить бота в нужный чат
2. Отправить сообщение в чат
3. Выполнить запрос:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```
4. Найти `"chat":{"id":<CHAT_ID>}` в ответе

### 🔒 Опциональные секреты

#### 9. `SNYK_TOKEN` (опционально)
**Описание:** Токен для Snyk security scanning
**Как получить:**
1. Зарегистрироваться на [snyk.io](https://snyk.io)
2. Перейти в Account Settings → General
3. Скопировать API token

## 🚀 Настройка ролей Yandex Cloud

### Назначение ролей сервисному аккаунту:

```bash
# Получить ID папки
FOLDER_ID=$(yc config get folder-id)

# Назначить роли
yc resource-manager folder add-access-binding $FOLDER_ID \
  --role editor \
  --service-account-name baget-shop-deployer

yc resource-manager folder add-access-binding $FOLDER_ID \
  --role container-registry.admin \
  --service-account-name baget-shop-deployer

yc resource-manager folder add-access-binding $FOLDER_ID \
  --role serverless-containers.admin \
  --service-account-name baget-shop-deployer
```

## ✅ Проверка настройки

### Тест CI/CD pipeline:
1. Сделать push в ветку `main`
2. Проверить статус в Actions: `https://github.com/youredik/kubik/actions`
3. При успешном прохождении всех этапов приложение будет развернуто

### Тест Telegram уведомлений:
1. Создать тестовый заказ через API
2. Проверить получение уведомления в Telegram чате

## 🔧 Troubleshooting

### Ошибка авторизации Yandex Cloud:
- Проверить корректность JSON ключа
- Убедиться, что сервисный аккаунт имеет необходимые роли
- Проверить ID папки и других ресурсов

### Не приходят Telegram уведомления:
- Проверить токен бота
- Убедиться, что бот добавлен в чат
- Проверить корректность chat_id

### Ошибки сборки Docker:
- Проверить, что все переменные окружения указаны
- Убедиться в корректности next.config.ts
- Проверить логи сборки в GitHub Actions

## 📞 Поддержка

При возникновении проблем:
1. Проверить логи GitHub Actions
2. Проверить настройки секретов
3. Создать Issue в репозитории с подробным описанием ошибки