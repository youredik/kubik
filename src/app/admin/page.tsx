'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { format, formatDistanceToNow, addHours } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Product {
  id: number
  name: string
  article: string
  images: string[]
  available: boolean
}

interface ImageUploadResponse {
  success: boolean
  uploaded?: string[]
  errors?: string[]
}

interface Size {
  id: string
  label: string
  price: number
}

interface Order {
  id: number
  orderNumber: string
  customerName: string
  phone: string
  deliveryType: string
  address?: string
  comment?: string
  totalAmount: number
  createdAt: string
  items: any[]
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'sizes' | 'orders'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [editingSize, setEditingSize] = useState<Size | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)

  useEffect(() => {
    if (activeTab === 'products') fetchProducts()
    else if (activeTab === 'sizes') fetchSizes()
    else if (activeTab === 'orders') fetchOrders()
  }, [activeTab, fetchProducts, fetchSizes, fetchOrders])

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
    } catch {
      console.error('Error fetching products')
      showNotification('Ошибка загрузки продуктов', 'error')
    }
  }

  const fetchSizes = async () => {
    try {
      const response = await fetch('/api/sizes-simple')
      const data = await response.json()
      setSizes(data)
    } catch (error) {
      console.error('Error fetching sizes:', error)
      showNotification('Ошибка загрузки размеров', 'error')
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders-simple')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      showNotification('Ошибка загрузки заказов', 'error')
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleProductSubmit = async (formData: FormData) => {
    setLoading(true)
    setUploadingImages(true)

    try {
      // Handle image uploads first
      const imageFiles = formData.getAll('images') as File[]
      let uploadedImages: string[] = []

      if (imageFiles.length > 0 && imageFiles[0].size > 0) {
        try {
          uploadedImages = await uploadImages(imageFiles as any)
        } catch (error) {
          showNotification('Ошибка загрузки изображений', 'error')
          return
        }
      }

      // Prepare product data
      // For editing, combine existing images with newly uploaded ones
      const existingImages = editingProduct ? editingProduct.images || [] : []
      const allImages = [...existingImages, ...uploadedImages]

      const productData = {
        name: formData.get('name'),
        article: formData.get('article'),
        available: formData.get('available'),
        images: allImages
      }

      const method = editingProduct ? 'PUT' : 'POST'
      const url = editingProduct ? `/api/products-simple/${editingProduct.id}` : '/api/products-simple'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      })

      if (response.ok) {
        showNotification(editingProduct ? 'Продукт обновлен' : 'Продукт добавлен', 'success')
        setShowProductModal(false)
        setEditingProduct(null)
        fetchProducts()
      } else {
        showNotification('Ошибка сохранения продукта', 'error')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      showNotification('Ошибка сохранения продукта', 'error')
    } finally {
      setLoading(false)
      setUploadingImages(false)
    }
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот продукт?')) return

    try {
      const response = await fetch(`/api/products-simple/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showNotification('Продукт удален', 'success')
        fetchProducts()
      } else {
        showNotification('Ошибка удаления продукта', 'error')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      showNotification('Ошибка удаления продукта', 'error')
    }
  }

  const uploadImages = async (files: FileList): Promise<string[]> => {
    const formData = new FormData()
    Array.from(files).forEach(file => {
      formData.append('images', file)
    })

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to upload images')
    }

    const result: ImageUploadResponse = await response.json()
    if (!result.success || !result.uploaded) {
      throw new Error(result.errors?.join(', ') || 'Upload failed')
    }

    return result.uploaded
  }

  const deleteImage = async (productId: number, imageName: string) => {
    console.log('Deleting image:', { productId, imageName, editingProductId: editingProduct?.id })
    try {
      const response = await fetch(`/api/products-simple/${productId}/images/${imageName}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showNotification('Изображение удалено', 'success')
        // Update the editing product state to reflect the change immediately
        if (editingProduct && editingProduct.id === productId) {
          const updatedImages = editingProduct.images.filter(img => img !== imageName)
          console.log('Updating editing product images:', {
            before: editingProduct.images,
            after: updatedImages
          })
          setEditingProduct({
            ...editingProduct,
            images: updatedImages
          })
        }
        fetchProducts()
      } else {
        showNotification('Ошибка удаления изображения', 'error')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      showNotification('Ошибка удаления изображения', 'error')
    }
  }

  const handleSizeSubmit = async (formData: FormData) => {
    if (!editingSize) return

    const price = parseFloat(formData.get('price') as string)

    if (isNaN(price) || price < 0) {
      showNotification('Некорректная цена', 'error')
      return
    }

    try {
      const response = await fetch('/api/sizes-simple', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingSize.id,
          price: price
        })
      })

      if (response.ok) {
        showNotification('Цена размера обновлена', 'success')
        setShowSizeModal(false)
        setEditingSize(null)
        fetchSizes()
      } else {
        showNotification('Ошибка обновления цены', 'error')
      }
    } catch (error) {
      console.error('Error updating size:', error)
      showNotification('Ошибка обновления цены', 'error')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{
        background: '#000',
        color: 'white',
        padding: '20px',
        marginBottom: '30px',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: 0 }}>Админ-панель - Управление багетами</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'products' ? '#000' : '#f0f0f0',
            color: activeTab === 'products' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Багеты
        </button>
        <button
          onClick={() => setActiveTab('sizes')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'sizes' ? '#000' : '#f0f0f0',
            color: activeTab === 'sizes' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Размеры
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'orders' ? '#000' : '#f0f0f0',
            color: activeTab === 'orders' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Заказы
        </button>
      </div>

      {notification && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px',
          background: notification.type === 'success' ? '#d4edda' : '#f8d7da',
          color: notification.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${notification.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {notification.message}
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Управление багетами</h2>
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowProductModal(true)
              }}
              style={{
                padding: '10px 20px',
                background: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Добавить багет
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {products.map(product => (
              <div key={product.id} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                background: '#fdd73c94'
              }}>
                <h3>{product.name}</h3>
                <p>Артикул: {product.article}</p>
                <p>Статус: {product.available ? 'Доступен' : 'Недоступен'}</p>

                {/* Отображение изображений товара */}
                {product.images && product.images.length > 0 && (
                  <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {product.images.slice(0, 3).map((image, index) => (
                        <Image
                          key={index}
                          src={`/uploads/${image.replace(/\.[^/.]+$/, '')}_catalog.jpg`}
                          alt={`${product.name} ${index + 1}`}
                          width={60}
                          height={60}
                          style={{
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = '/placeholder.jpg'
                          }}
                        />
                      ))}
                      {product.images.length > 3 && (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          background: '#f0f0f0',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          +{product.images.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      setEditingProduct(product)
                      setShowProductModal(true)
                    }}
                    style={{
                      padding: '5px 10px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    style={{
                      padding: '5px 10px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sizes' && (
        <div>
          <h2>Управление размерами</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {sizes.map(size => (
              <div key={size.id} style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#f9f9f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{size.label}</strong> - {size.price} ₽
                </div>
                <button
                  onClick={() => {
                    setEditingSize(size)
                    setShowSizeModal(true)
                  }}
                  style={{
                    padding: '5px 10px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Изменить цену
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <h2>Заказы</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {orders.map(order => (
              <div key={order.id} style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#f9f9f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Заказ #{order.order_number}</strong>
                  <span
                    title={format(addHours(new Date(order.created_at), 3), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    style={{ cursor: 'help' }}
                  >
                    {formatDistanceToNow(addHours(new Date(order.created_at), 3), {
                      addSuffix: true,
                      locale: ru,
                      includeSeconds: false
                    }).replace('около ', '').replace('часов', 'часа')}
                  </span>
                </div>
                <p><strong>Клиент:</strong> {order.customer_name}</p>
                <p><strong>Телефон:</strong> {order.phone}</p>
                <p><strong>Сумма:</strong> {order.total_amount} ₽</p>
                <p><strong>Способ получения:</strong> {order.delivery_type === 'pickup' ? 'Самовывоз' : 'Доставка'}</p>
                {order.address && <p><strong>Адрес:</strong> {order.address}</p>}
                {order.comment && <p><strong>Комментарий:</strong> {order.comment}</p>}

                {/* Отображение товаров в заказе */}
                {order.items && order.items.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <h4 style={{ marginBottom: '10px' }}>Товары в заказе:</h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {order.items.map((item: any, index: number) => (
                        <div key={index} style={{
                          padding: '10px',
                          background: '#fff',
                          border: '1px solid #eee',
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
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3>{editingProduct ? 'Редактировать багет' : 'Добавить багет'}</h3>

            {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4>Текущие изображения:</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {editingProduct.images.map((image, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <Image
                        src={`/uploads/${image.replace(/\.[^/.]+$/, '')}_catalog.jpg`}
                        alt={`Изображение ${index + 1}`}
                        width={100}
                        height={100}
                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteImage(editingProduct.id, image)}
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
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
                  ))}
                </div>
              </div>
            )}

             <form
               onSubmit={(e) => {
                 e.preventDefault()
                 const formData = new FormData(e.target as HTMLFormElement)
                 handleProductSubmit(formData)
               }}
             >
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Название:</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingProduct?.name}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Артикул:</label>
                <input
                  type="text"
                  name="article"
                  defaultValue={editingProduct?.article}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Доступен:</label>
                <select
                  name="available"
                  defaultValue={editingProduct?.available ? '1' : '0'}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="1">Да</option>
                  <option value="0">Нет</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Изображения (можно выбрать несколько):
                </label>
                <input
                  type="file"
                  name="images"
                  multiple
                  accept="image/*"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Поддерживаемые форматы: JPEG, PNG, GIF, WebP. Максимальный размер: 10MB на файл.
                </small>
              </div>

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false)
                    setEditingProduct(null)
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  style={{
                    padding: '10px 20px',
                    background: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: (loading || uploadingImages) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadingImages ? 'Загрузка изображений...' : loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSizeModal && editingSize && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3>Изменить цену размера</h3>
            <p><strong>Размер:</strong> {editingSize.label}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                handleSizeSubmit(formData)
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Цена (₽):</label>
                <input
                  type="number"
                  name="price"
                  defaultValue={editingSize.price}
                  min="0"
                  step="0.01"
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSizeModal(false)
                    setEditingSize(null)
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}