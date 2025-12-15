import { sendTelegramNotification } from '../../src/lib/telegram'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Telegram notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set test environment variables
    process.env.TELEGRAM_BOT_TOKEN = 'test_token'
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id'
  })

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
  })

  it('should send notification successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true })
    } as Response)

    const orderData = {
      orderNumber: '0001',
      customerName: 'Test User',
      phone: '+1234567890',
      deliveryType: 'pickup',
      address: null,
      comment: 'Test comment',
      totalAmount: 200,
      items: [
        {
          productName: 'Test Product',
          article: 'ART001',
          size: 'A4',
          quantity: 2,
          price: 100
        }
      ]
    }

    await sendTelegramNotification(orderData)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest_token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String)
      })
    )

    const callBody = JSON.parse((mockFetch as any).mock.calls[0][1].body)
    expect(callBody.chat_id).toBe('test_chat_id')
    expect(callBody.parse_mode).toBe('HTML')
    expect(callBody.text).toContain('<b>🛒 Новый заказ #0001</b>')
    expect(callBody.text).toContain('Test User')
    expect(callBody.text).toContain('+1234567890')
  })

  it('should handle missing environment variables', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await sendTelegramNotification({})

    expect(mockFetch).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Telegram bot token or chat ID not configured')

    consoleSpy.mockRestore()
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Bad Request' })
    } as Response)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await sendTelegramNotification({ orderNumber: '0001' })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to send Telegram notification:', { error: 'Bad Request' })

    consoleSpy.mockRestore()
  })

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    await sendTelegramNotification({ orderNumber: '0001' })

    expect(consoleSpy).toHaveBeenCalledWith('Error sending Telegram notification:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})