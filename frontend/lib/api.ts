const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

export interface UploadResponse {
  success: boolean;
  filename?: string;
  message?: string;
  error?: string;
}

export interface ChatProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
  timestamp: Date;
}

export interface ChatResponse {
  answer?: string;
  context?: string;
  products?: ChatProduct[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve({ success: true, filename: file.name });
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.send(formData);
  });
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question : message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Chat request failed' }));
    throw new Error(error.error || 'Chat request failed');
  }
  return response.json();
}

// Product API functions
export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/api/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function createProduct(name: string, description: string, image: string, price: string): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, image, price }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create product' }));
    throw new Error(error.error || 'Failed to create product');
  }
  return response.json();
}

export async function updateProduct(id: string, name: string, description: string, image: string, price: string): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, image, price }),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete product');
}
