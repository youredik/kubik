'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface Product {
  id: number
  name: string
  article: string
  images: string[]
  available: boolean
}

interface Size {
  id: string
  label: string
  price: number
}

interface CartItem {
  product: Product
  size: Size
  quantity: number
  price: number
}

function OrderPageContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [orderData, setOrderData] = useState<any>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    deliveryType: 'pickup',
    address: '',
    comment: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchSizes()
    loadCartFromParams()
  }, [loadCartFromParams])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products-simple')
      const data = await response.json()
      const transformedData = data.map((product: any) => ({
        ...product,
        images: JSON.parse(product.images || '[]'),
        available: Boolean(product.available)
      }))
      setProducts(transformedData)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchSizes = async () => {
    try {
      const response = await fetch('/api/sizes-simple')
      const data = await response.json()
      setSizes(data)
    } catch (error) {
      console.error('Error fetching sizes:', error)
    }
  }

  const loadCartFromParams = useCallback(() => {
    const cartParam = searchParams.get('cart')
    if (cartParam) {
      try {
        const cartData = JSON.parse(decodeURIComponent(cartParam))
        setCart(cartData)
      } catch (error) {
        console.error('Error parsing cart data:', error)
      }
    }
  }, [searchParams])

  const addToCart = (product: Product, size: Size) => {
    const existingItem = cart.find(
      item => item.product.id === product.id && item.size.id === size.id
    )

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id && item.size.id === size.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, {
        product,
        size,
        quantity: 1,
        price: size.price
      }])
    }
  }

  const removeFromCart = (productId: number, sizeId: string) => {
    setCart(cart.filter(item => !(item.product.id === productId && item.size.id === sizeId)))
  }

  const updateQuantity = (productId: number, sizeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, sizeId)
      return
    }

    setCart(cart.map(item =>
      item.product.id === productId && item.size.id === sizeId
        ? { ...item, quantity }
        : item
    ))
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cart.length === 0) {
      alert('Корзина пуста')
      return
    }

    if (!formData.name || !formData.phone) {
      alert('Заполните имя и телефон')
      return
    }

    if (formData.deliveryType === 'delivery' && !formData.address) {
      alert('Укажите адрес доставки')
      return
    }

    setLoading(true)

    try {
      const orderItems = cart.map(item => ({
        productName: item.product.name,
        article: item.product.article,
        sizeLabel: item.size.label,
        quantity: item.quantity,
        price: item.price
      }))

      const response = await fetch('/api/orders-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          items: orderItems,
          total: getTotalPrice()
        })
      })

      if (response.ok) {
        const result = await response.json()
        setOrderNumber(result.orderNumber)
        setOrderData(result.order)
        setOrderPlaced(true)
        setCart([])
      } else {
        alert('Ошибка при оформлении заказа')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      alert('Ошибка при оформлении заказа')
    } finally {
      setLoading(false)
    }
  }

  if (orderPlaced && orderData) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #c3e6cb'
        }}>
          <h2>✅ Заказ успешно оформлен!</h2>
          <p><strong>Номер заказа:</strong> {orderNumber}</p>
        </div>

        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Информация о заказе</h3>

          <div style={{ marginBottom: '20px' }}>
            <h4>Данные клиента</h4>
            <p><strong>Имя:</strong> {orderData.customerName}</p>
            <p><strong>Телефон:</strong> {orderData.phone}</p>
            <p><strong>Способ получения:</strong> {orderData.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}</p>
            {orderData.address && <p><strong>Адрес:</strong> {orderData.address}</p>}
            {orderData.comment && <p><strong>Комментарий:</strong> {orderData.comment}</p>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>Товары в заказе</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {orderData.items.map((item: any, index: number) => (
                <div key={index} style={{
                  padding: '15px',
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{item.productName}</strong>
                    <br />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      Артикул: {item.article} | Размер: {item.size} | Кол-во: {item.quantity}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{item.price * item.quantity} ₽</strong>
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {item.price} ₽ × {item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '15px',
            background: '#e9ecef',
            borderRadius: '4px',
            textAlign: 'right'
          }}>
            <strong style={{ fontSize: '18px' }}>
              Итого: {orderData.totalAmount} ₽
            </strong>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Оформление заказа</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Products Section */}
        <div>
          <h2>Выберите товары</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {products.filter(p => p.available).map(product => (
              <div key={product.id} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                background: '#fff'
              }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>{product.name}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Артикул: {product.article}
                </p>

                {product.images && product.images.length > 0 && (
                  <Image
                    src={`/uploads/${product.images[0].replace(/\.[^/.]+$/, '')}_catalog.jpg`}
                    alt={product.name}
                    width={250}
                    height={150}
                    style={{
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}
                    objectFit="cover"
                  />
                )}

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '14px', marginRight: '10px' }}>Размер:</label>
                  <select
                    onChange={(e) => {
                      const size = sizes.find(s => s.id === e.target.value)
                      if (size) addToCart(product, size)
                    }}
                    style={{
                      padding: '5px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Выберите размер</option>
                    {sizes.map(size => (
                      <option key={size.id} value={size.id}>
                        {size.label} - {size.price} ₽
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart and Order Form */}
        <div>
          {/* Cart */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            background: '#f8f9fa'
          }}>
            <h3>Корзина</h3>
            {cart.length === 0 ? (
              <p>Корзина пуста</p>
            ) : (
              <div>
                {cart.map((item, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    marginBottom: '10px',
                    background: 'white',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <strong>{item.product.name}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {item.size.label} - {item.price} ₽
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.size.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size.id, item.quantity - 1)}
                        style={{
                          padding: '2px 8px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        -
                      </button>
                      <span style={{ margin: '0 10px' }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size.id, item.quantity + 1)}
                        style={{
                          padding: '2px 8px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                      <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                        {item.price * item.quantity} ₽
                      </span>
                    </div>
                  </div>
                ))}
                <div style={{
                  padding: '10px',
                  background: '#e9ecef',
                  borderRadius: '4px',
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>
                  Итого: {getTotalPrice()} ₽
                </div>
              </div>
            )}
          </div>

          {/* Order Form */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            background: '#f8f9fa'
          }}>
            <h3>Данные для заказа</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Имя *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Телефон *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Способ получения</label>
                <select
                  value={formData.deliveryType}
                  onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="pickup">Самовывоз</option>
                  <option value="delivery">Доставка</option>
                </select>
              </div>

              {formData.deliveryType === 'delivery' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Адрес доставки *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Комментарий</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (loading || cart.length === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Оформляем заказ...' : 'Оформить заказ'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderPageContent />
    </Suspense>
  )
}