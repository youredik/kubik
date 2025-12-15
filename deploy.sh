#!/bin/bash

# Yandex Cloud Deployment Script for Baget Shop Backend
# This script demonstrates the deployment process using YC CLI

set -e

echo "🚀 Starting Yandex Cloud deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
YC_BIN="/Users/ed/yandex-cloud/bin/yc"
FOLDER_ID="${FOLDER_ID:-}"
REGISTRY_NAME="baget-shop-registry"
IMAGE_NAME="baget-shop-backend"
SERVICE_NAME="baget-shop-backend"

# Load environment variables from backend/.env if it exists
if [ -f "backend/.env" ]; then
    echo -e "${BLUE}📄 Loading environment variables from backend/.env${NC}"
    export $(grep -v '^#' backend/.env | xargs)
fi

# Check if YC CLI is installed
if ! command -v $YC_BIN &> /dev/null; then
    echo -e "${RED}❌ YC CLI not found. Please install it first.${NC}"
    echo "Run: curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash"
    exit 1
fi

echo -e "${GREEN}✅ YC CLI found${NC}"

# Check authentication
if ! $YC_BIN config list &> /dev/null; then
    echo -e "${RED}❌ YC CLI not authenticated. Please run:${NC}"
    echo "$YC_BIN init"
    echo ""
    echo -e "${YELLOW}After authentication, run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ YC CLI authenticated${NC}"

# Get current folder
CURRENT_FOLDER=$($YC_BIN config get folder-id 2>/dev/null || echo "")
if [ -z "$CURRENT_FOLDER" ]; then
    if [ -z "$FOLDER_ID" ]; then
        echo -e "${RED}❌ No folder ID specified. Please set FOLDER_ID environment variable or add it to backend/.env${NC}"
        echo "Example: FOLDER_ID=b1g12345678901234567"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  Setting folder to: $FOLDER_ID${NC}"
    $YC_BIN config set folder-id $FOLDER_ID
else
    FOLDER_ID=$CURRENT_FOLDER
    echo -e "${GREEN}✅ Using folder: $FOLDER_ID${NC}"
fi

echo ""
echo "📦 Step 1: Creating Container Registry..."

# Create registry if it doesn't exist
if ! $YC_BIN container registry get $REGISTRY_NAME &> /dev/null; then
    echo "Creating registry: $REGISTRY_NAME"
    $YC_BIN container registry create --name $REGISTRY_NAME --description "Registry for Baget Shop application"
else
    echo -e "${GREEN}✅ Registry $REGISTRY_NAME already exists${NC}"
fi

# Get registry ID
REGISTRY_ID=$($YC_BIN container registry get $REGISTRY_NAME --format json | jq -r .id)
echo "Registry ID: $REGISTRY_ID"

echo ""
echo "🐳 Step 2: Building and pushing Docker image..."

cd backend

# Build Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME .

# Tag for Yandex Cloud
IMAGE_TAG="cr.yandex/$REGISTRY_ID/$IMAGE_NAME:latest"
echo "Tagging image: $IMAGE_TAG"
docker tag $IMAGE_NAME $IMAGE_TAG

# Authenticate Docker with Yandex Cloud
echo "Authenticating Docker with Yandex Cloud..."
$YC_BIN container registry configure-docker

# Push image
echo "Pushing image to registry..."
docker push $IMAGE_TAG

echo -e "${GREEN}✅ Image pushed successfully${NC}"

echo ""
echo "🚀 Step 3: Creating Serverless Container..."

# Create serverless container
if ! $YC_BIN serverless container get $SERVICE_NAME &> /dev/null; then
    echo "Creating serverless container: $SERVICE_NAME"
    $YC_BIN serverless container create --name $SERVICE_NAME \
        --description "Baget Shop Backend API" \
        --memory 512MB \
        --cores 1 \
        --execution-timeout 30s \
        --concurrency 4
else
    echo -e "${GREEN}✅ Serverless container $SERVICE_NAME already exists${NC}"
fi

echo ""
echo "⚙️  Step 4: Deploying container revision..."

# Deploy container revision
$YC_BIN serverless container revision deploy $SERVICE_NAME \
    --image $IMAGE_TAG \
    --service-account-id "" \
    --environment DB_PATH=/tmp/baget_shop.db \
    --environment UPLOAD_DIR=/tmp/uploads/ \
    --environment TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-""} \
    --environment TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-""} \
    --cores 1 \
    --memory 512MB \
    --execution-timeout 30s \
    --concurrency 4

echo -e "${GREEN}✅ Container deployed successfully${NC}"

echo ""
echo "🌐 Step 5: Getting service URL..."

# Get service URL
SERVICE_URL=$($YC_BIN serverless container get $SERVICE_NAME --format json | jq -r .url)
echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"

echo ""
echo "📋 Deployment Summary:"
echo "======================"
echo "Service Name: $SERVICE_NAME"
echo "Registry: $REGISTRY_NAME"
echo "Image: $IMAGE_TAG"
echo "URL: $SERVICE_URL"
echo ""
echo "To check logs:"
echo "$YC_BIN serverless container logs $SERVICE_NAME"
echo ""
echo "To update environment variables:"
echo "$YC_BIN serverless container revision deploy $SERVICE_NAME --environment KEY=VALUE ..."
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"