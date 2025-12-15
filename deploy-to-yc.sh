#!/bin/bash

# Скрипт для ручного развертывания в Yandex Cloud
# Использование: ./deploy-to-yc.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
PROJECT_NAME="baget-shop"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Начинаем развертывание в $ENVIRONMENT среду..."

# Проверка наличия yc CLI
if ! command -v yc &> /dev/null; then
    echo "❌ Yandex Cloud CLI не установлен. Установите его: https://cloud.yandex.ru/docs/cli/quickstart"
    exit 1
fi

# Проверка авторизации
if ! yc config get folder-id &> /dev/null; then
    echo "❌ Не настроена авторизация в Yandex Cloud. Выполните: yc init"
    exit 1
fi

# Получение переменных окружения
FOLDER_ID=$(yc config get folder-id)
REGISTRY_ID=${YANDEX_CLOUD_REGISTRY_ID:-$(yc container registry list --format json | jq -r '.[0].id')}

if [ "$ENVIRONMENT" = "staging" ]; then
    CONTAINER_NAME="$PROJECT_NAME-staging"
    IMAGE_TAG="staging-$TIMESTAMP"
    CONTAINER_ID=${YANDEX_CLOUD_CONTAINER_STAGING_ID}
else
    CONTAINER_NAME="$PROJECT_NAME-prod"
    IMAGE_TAG="prod-$TIMESTAMP"
    CONTAINER_ID=${YANDEX_CLOUD_CONTAINER_PROD_ID}
fi

echo "📦 Сборка Docker образа..."
docker build -t $PROJECT_NAME:$IMAGE_TAG .

echo "🔄 Авторизация в Container Registry..."
yc container registry configure-docker

echo "📤 Push образа в registry..."
FULL_IMAGE_NAME="cr.yandex/$REGISTRY_ID/$PROJECT_NAME:$IMAGE_TAG"
docker tag $PROJECT_NAME:$IMAGE_TAG $FULL_IMAGE_NAME
docker push $FULL_IMAGE_NAME

echo "🚀 Развертывание в Serverless Container..."

if [ "$ENVIRONMENT" = "staging" ]; then
    # Staging конфигурация
    yc serverless container revision deploy \
        --container-id $CONTAINER_ID \
        --image $FULL_IMAGE_NAME \
        --service-account-id ${YANDEX_CLOUD_SA_ID} \
        --environment TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN},TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID} \
        --concurrency 4 \
        --memory 512MB \
        --cores 1 \
        --execution-timeout 30s \
        --min-instances 0 \
        --max-instances 2
else
    # Production конфигурация
    yc serverless container revision deploy \
        --container-id $CONTAINER_ID \
        --image $FULL_IMAGE_NAME \
        --service-account-id ${YANDEX_CLOUD_SA_ID} \
        --environment TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN},TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID} \
        --concurrency 8 \
        --memory 1GB \
        --cores 2 \
        --execution-timeout 30s \
        --min-instances 1 \
        --max-instances 5
fi

# Получение URL развернутого приложения
CONTAINER_URL=$(yc serverless container get $CONTAINER_ID --format json | jq -r '.url')

echo ""
echo "🎉 Развертывание завершено успешно!"
echo "🌐 URL приложения: $CONTAINER_URL"
echo "🏷️  Тег образа: $IMAGE_TAG"
echo "📅 Время: $(date '+%Y-%m-%d %H:%M:%S %Z')"

# Отправка уведомления в Telegram
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    echo "📱 Отправка уведомления в Telegram..."
    curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"🚀 Ручное развертывание в $ENVIRONMENT завершено!\\n\\n📦 Версия: $IMAGE_TAG\\n🌐 URL: $CONTAINER_URL\\n👤 Развернул: $(whoami)\", \"parse_mode\": \"HTML\"}" \
        -s > /dev/null
    echo "✅ Уведомление отправлено"
fi

echo ""
echo "🔍 Проверить статус можно командой:"
echo "yc serverless container revision list --container-id $CONTAINER_ID"