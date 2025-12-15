import '@testing-library/jest-dom'

// Mock File for testing
global.File = class MockFile {
  constructor(parts, filename, options = {}) {
    this.name = filename
    this.type = options.type || ''
    this.size = parts[0]?.length || 0
    this.lastModified = Date.now()
  }

  async arrayBuffer() {
    return new ArrayBuffer(this.size)
  }
}

// Mock FormData for testing
global.FormData = class MockFormData {
  constructor() {
    this._entries = new Map()
  }

  append(key, value) {
    if (!this._entries.has(key)) {
      this._entries.set(key, [])
    }
    this._entries.get(key).push(value)
  }

  get(key) {
    const values = this._entries.get(key)
    return values ? values[0] : null
  }

  getAll(key) {
    return this._entries.get(key) || []
  }

  has(key) {
    return this._entries.has(key)
  }

  delete(key) {
    this._entries.delete(key)
  }

  *entries() {
    for (const [key, values] of this._entries) {
      for (const value of values) {
        yield [key, value]
      }
    }
  }

  forEach(callback) {
    for (const [key, value] of this.entries()) {
      callback(value, key, this)
    }
  }
}

// Mock Next.js server components for API route testing
const MockNextRequest = class {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
    this._formData = options.formData || new FormData()
  }

  async json() {
    return JSON.parse(this.body)
  }

  async formData() {
    return this._formData
  }
}

jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: {
    json: (data, options = {}) => ({
      status: options.status || 200,
      json: async () => data,
    }),
  },
}))