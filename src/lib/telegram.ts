export async function sendTelegramNotification(orderData: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram bot token or chat ID not configured')
    return
  }

  try {
    const message = formatOrderMessage(orderData)

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Failed to send Telegram notification:', errorData)
    } else {
      console.log('Telegram notification sent successfully')
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}

function formatOrderMessage(order: any) {
  const {
    orderNumber,
    customerName,
    phone,
    deliveryType,
    address,
    comment,
    totalAmount,
    items = []
  } = order

  let message = `<b>🛒 Новый заказ #${orderNumber}</b>\n\n`
  message += `<b>👤 Клиент:</b> ${customerName || 'Не указано'}\n`
  message += `<b>📞 Телефон:</b> ${phone || 'Не указано'}\n`
  message += `<b>🚚 Доставка:</b> ${deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}\n`

  if (address) {
    message += `<b>📍 Адрес:</b> ${address}\n`
  }

  if (comment) {
    message += `<b>💬 Комментарий:</b> ${comment}\n`
  }

  message += `\n<b>📦 Товары:</b>\n`

  if (items && items.length > 0) {
    items.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.productName || 'Неизвестный товар'}\n`
      message += `   Артикул: ${item.article || 'Не указан'}\n`
      message += `   Размер: ${item.size || 'Не указан'}\n`
      message += `   Кол-во: ${item.quantity || 0} × ${item.price || 0} ₽\n`
      message += `   Сумма: ${(item.quantity || 0) * (item.price || 0)} ₽\n\n`
    })
  } else {
    message += `Нет товаров в заказе\n\n`
  }

  message += `<b>💰 Итого: ${totalAmount || 0} ₽</b>\n`
  message += `<b>⏰ Время заказа:</b> ${new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })} (МСК)`

  return message
}