'use client'

import { useEffect, useState } from 'react'

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
  productId: number
  productName: string
  article: string
  size: string
  sizeLabel: string
  price: number
  quantity: number
}

interface OrderForm {
  name: string
  phone: string
  comment: string
  deliveryType: 'pickup' | 'delivery'
  address: string
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [currentStep, setCurrentStep] = useState<'catalog' | 'cart' | 'order' | 'success'>('catalog')
  const [orderForm, setOrderForm] = useState<OrderForm>({
    name: '',
    phone: '',
    comment: '',
    deliveryType: 'pickup',
    address: ''
  })
  const [orderResult, setOrderResult] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    fetchProducts()
    fetchSizes()
  }, [])

  useEffect(() => {
    if (selectedProduct && selectedProduct.images && selectedProduct.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % selectedProduct.images.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedProduct])

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
      setProducts([])
    }
  }

  const fetchSizes = async () => {
    try {
      const response = await fetch('/api/sizes-simple')
      const data = await response.json()
      setSizes(data)
    } catch (error) {
      console.error('Error fetching sizes:', error)
      setSizes([])
    }
  }

  const addToCart = (product: Product, size: Size) => {
    const existingItem = cart.find(item =>
      item.productId === product.id && item.size === size.id
    )

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id && item.size === size.id
          ? {...item, quantity: item.quantity + 1}
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        article: product.article,
        size: size.id,
        sizeLabel: size.label,
        price: size.price,
        quantity: 1
      }])
    }
  }

  const updateQuantity = (productId: number, size: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => !(item.productId === productId && item.size === size)))
    } else {
      setCart(cart.map(item =>
        item.productId === productId && item.size === size
          ? {...item, quantity}
          : item
      ))
    }
  }

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const submitOrder = async () => {
    if (submitting) return

    setSubmitting(true)
    setLoading(true)

    try {
      const response = await fetch('/api/orders-simple', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...orderForm,
          items: cart,
          total: getTotal()
        })
      })
      const result = await response.json()
      setOrderResult(result)
      setOrderItems([...cart])
      setCart([])
      setCurrentStep('success')
    } catch (error) {
      console.error('Error submitting order:', error)
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const openImageModal = (product: Product, imageIndex = 0) => {
    setSelectedProduct(product)
    setCurrentImageIndex(imageIndex)
  }

  const closeImageModal = () => {
    setSelectedProduct(null)
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    if (selectedProduct && selectedProduct.images && selectedProduct.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedProduct.images.length)
    }
  }

  const prevImage = () => {
    if (selectedProduct && selectedProduct.images && selectedProduct.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)
    }
  }

  const renderCatalog = () => {
    const availableProducts = products.filter(p => p.available)

    return (
      <div className="catalog">
        <h2>Каталог багетов</h2>
        {availableProducts.length === 0 ? (
          <p>Временно нет доступных багетов</p>
        ) : (
          <div className="products-grid">
            {availableProducts.map(product => (
              <div key={product.id} className="product-card">
                <div className="product-images">
                  <img
                    src={product.images && product.images.length > 0 ? `/uploads/${product.images[0].replace(/\.[^/.]+$/, '')}_catalog.jpg` : '/placeholder.jpg'}
                    alt={product.name}
                    onClick={() => openImageModal(product, 0)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      // Try different formats if original fails
                      const baseSrc = target.src.replace('_catalog.jpg', '')
                      if (target.src.includes('_catalog.jpg')) {
                        target.src = `${baseSrc}_catalog.jpeg`
                      } else if (target.src.includes('_catalog.jpeg')) {
                        target.src = `${baseSrc}_catalog.png`
                      } else if (target.src.includes('_catalog.png')) {
                        target.src = `${baseSrc}_catalog.gif`
                      } else if (target.src.includes('_catalog.gif')) {
                        target.src = '/placeholder.jpg'
                      }
                    }}
                  />
                </div>
                <h3>{product.name}</h3>
                <p>Артикул: {product.article}</p>
                <div className="sizes">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => addToCart(product, size)}
                      className="size-btn"
                    >
                      {size.label} - {size.price} ₽
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderCart = () => (
    <div className="cart">
      <h2>Корзина</h2>
      {cart.length === 0 ? (
        <p>Корзина пуста</p>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((item, index) => (
              <div key={index} className="cart-item">
                <div>
                  <h4>{item.productName}</h4>
                  <p>{item.sizeLabel} - {item.price} ₽</p>
                </div>
                <div className="quantity-controls">
                  <button
                    onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}>-
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}>+
                  </button>
                </div>
                <span>{item.price * item.quantity} ₽</span>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <strong>Итого: {getTotal()} ₽</strong>
          </div>
          <div className="cart-actions">
            <button onClick={() => setCurrentStep('catalog')}>Продолжить покупки</button>
            <button onClick={() => setCurrentStep('order')} className="checkout-btn">Оформить заказ</button>
          </div>
        </>
      )}
    </div>
  )

  const renderOrderForm = () => (
    <div className="order-form">
      <h2>Оформление заказа</h2>
      <form onSubmit={(e) => {
        e.preventDefault()
        submitOrder()
      }}>
        <div className="form-group">
          <label>Имя или название компании:</label>
          <input
            type="text"
            required
            value={orderForm.name}
            onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Телефон:</label>
          <input
            type="tel"
            required
            value={orderForm.phone}
            onChange={(e) => setOrderForm({...orderForm, phone: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Комментарий:</label>
          <textarea
            value={orderForm.comment}
            onChange={(e) => setOrderForm({...orderForm, comment: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Способ получения:</label>
          <select
            value={orderForm.deliveryType}
            onChange={(e) => setOrderForm({...orderForm, deliveryType: e.target.value as 'pickup' | 'delivery'})}
          >
            <option value="pickup">Самовывоз</option>
            <option value="delivery">Доставка</option>
          </select>
        </div>
        {orderForm.deliveryType === 'delivery' && (
          <div className="form-group">
            <label>Адрес доставки:</label>
            <input
              type="text"
              required
              value={orderForm.address}
              onChange={(e) => setOrderForm({...orderForm, address: e.target.value})}
            />
          </div>
        )}
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Отправка...' : 'Оформить заказ'}
        </button>
      </form>
    </div>
  )

  const renderSuccess = () => (
    <div className="success" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        background: '#d4edda',
        color: '#155724',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid #c3e6cb'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>✅ Заказ успешно оформлен!</h2>
        {orderResult && (
          <p style={{ margin: 0, fontSize: '18px' }}>
            <strong>Номер заказа: {orderResult.orderNumber}</strong>
          </p>
        )}
      </div>

      {orderResult && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: 0 }}>Информация о заказе</h3>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Данные клиента</h4>
            <p style={{ margin: '5px 0' }}><strong>Имя:</strong> {orderForm.name}</p>
            <p style={{ margin: '5px 0' }}><strong>Телефон:</strong> {orderForm.phone}</p>
            <p style={{ margin: '5px 0' }}><strong>Способ получения:</strong> {orderForm.deliveryType === 'pickup' ? 'Самовывоз' : 'Доставка'}</p>
            {orderForm.deliveryType === 'delivery' && orderForm.address && (
              <p style={{ margin: '5px 0' }}><strong>Адрес:</strong> {orderForm.address}</p>
            )}
            {orderForm.comment && (
              <p style={{ margin: '5px 0' }}><strong>Комментарий:</strong> {orderForm.comment}</p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Товары в заказе</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {orderItems.map((item, index) => (
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
                      Артикул: {item.article} | Размер: {item.sizeLabel} | Кол-во: {item.quantity}
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
              Итого: {orderResult.total} ₽
            </strong>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={() => {
                setCurrentStep('catalog')
                setOrderResult(null)
                setOrderItems([])
                setOrderForm({
                  name: '',
                  phone: '',
                  comment: '',
                  deliveryType: 'pickup',
                  address: ''
                })
              }}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Вернуться в каталог
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="App">
      <header>
        <h1>Заказ багетов</h1>
        <div className="header-right">
          {currentStep !== 'catalog' && (
            <button onClick={() => setCurrentStep('catalog')}>← Назад в каталог</button>
          )}
          <a
            href="/order"
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.1)',
              marginRight: '10px'
            }}
          >
            Оформить заказ
          </a>
          <a
            href="/admin"
            style={{
              color: 'white',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.1)',
              marginRight: '10px'
            }}
          >
            Админ
          </a>
          <div className="cart-icon-container" onClick={() => setCurrentStep('cart')}>
            <span className="cart-icon">🛒</span>
            {getTotalItems() > 0 && <span className="cart-badge">{getTotalItems()}</span>}
          </div>
        </div>
      </header>
      <main>
        {currentStep === 'catalog' && renderCatalog()}
        {currentStep === 'cart' && renderCart()}
        {currentStep === 'order' && renderOrderForm()}
        {currentStep === 'success' && renderSuccess()}
      </main>
      {selectedProduct && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeImageModal}>×</button>
            <img
              src={selectedProduct.images && selectedProduct.images.length > 0 ? `/uploads/${selectedProduct.images[currentImageIndex].replace(/\.[^/.]+$/, '')}_view.jpg` : '/placeholder.jpg'}
              alt={selectedProduct.name}
              className="modal-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                // Try different formats if original fails
                const baseSrc = target.src.replace('_view.jpg', '')
                if (target.src.includes('_view.jpg')) {
                  target.src = `${baseSrc}_view.jpeg`
                } else if (target.src.includes('_view.jpeg')) {
                  target.src = `${baseSrc}_view.png`
                } else if (target.src.includes('_view.png')) {
                  target.src = `${baseSrc}_view.gif`
                } else if (target.src.includes('_view.gif')) {
                  target.src = '/placeholder.jpg'
                }
              }}
            />
            {selectedProduct.images && selectedProduct.images.length > 1 && (
              <>
                <button className="prev-btn" onClick={prevImage}>‹</button>
                <button className="next-btn" onClick={nextImage}>›</button>
                <div className="modal-indicators">
                  {selectedProduct.images.map((_, index) => (
                    <span
                      key={index}
                      className={`modal-indicator ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    ></span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
