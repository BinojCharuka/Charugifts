# LuminaGifts REST API Documentation

This document describes the available API endpoints for LuminaGifts. All endpoints are prefixed with `/api`.

---

## Table of Contents
1. [Base Information & Multi-Tenancy](#base-information--multi-tenancy)
2. [Authentication API](#1-authentication-api)
3. [Tenant Settings API](#2-tenant-settings-api)
4. [Products API](#3-products-api)
5. [Orders API](#4-orders-api)

---

## Base Information & Multi-Tenancy

The API supports multi-tenancy. You can specify which tenant/store you are interacting with using one of the following methods (in order of priority):
1. **Query Parameter:** Append `?tenant=your-store-prefix` to the URL.
2. **HTTP Header:** Include `X-Tenant-Prefix: your-store-prefix` in request headers.
3. **Subdomain Resolution:** Resolves automatically based on the request Host header (e.g. `your-store-prefix.localhost:3000`).
4. **Fallback:** Defaults to `cuddle-co` or the first tenant in the database.

---

## 1. Authentication API

### `POST /api/auth/login`
Authenticates a seller and sets a secure `lumina_session` cookie.

**Request Body:**
```json
{
  "email": "seller@example.com",
  "password": "yourpassword"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "sellerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "email": "seller@example.com"
  }
}
```

---

### `POST /api/auth/logout`
Clears the active session.

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

---

### `GET /api/auth/me`
Checks the session status and returns authenticated seller details.

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "sellerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "email": "seller@example.com"
  }
}
```

---

## 2. Tenant Settings API

### `GET /api/tenant`
Gets details of the resolved tenant/store.

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "shopName": "Cuddle & Co.",
    "domainPrefix": "cuddle-co",
    "bankDetails": {
      "bankName": "Lumina Central Bank",
      "accountName": "Cuddle & Co. LLC",
      "accountNumber": "123456789",
      "branch": "Headquarters"
    },
    "logoUrl": "https://picsum.photos/seed/logo/200",
    "createdAt": "2026-08-12T07:40:51.000Z",
    "updatedAt": "2026-08-14T18:27:00.000Z"
  }
}
```

---

### `PUT /api/tenant`
Updates settings for the tenant associated with the logged-in seller.

*Requires active seller authentication session.*

**Request Body:**
```json
{
  "shopName": "New Shop Name",
  "domainPrefix": "new-prefix",
  "bankDetails": {
    "bankName": "Updated Bank",
    "accountName": "Updated Name",
    "accountNumber": "987654321",
    "branch": "Downtown Branch"
  },
  "logoUrl": "https://picsum.photos/seed/logo/200"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Tenant settings updated successfully",
    "tenant": {
      "id": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "shopName": "New Shop Name",
      ...
    }
  }
}
```

---

## 3. Products API

### `GET /api/products`
Lists products for the resolved tenant.

**Query Parameters:**
- `q`: Search query matching product name or description (case-insensitive).
- `inStock`: Filter by stock availability (`true` or `false`).
- `limit`: Number of products to return (default: `50`).
- `offset`: Offset for pagination (default: `0`).

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "shopName": "Cuddle & Co.",
    "count": 1,
    "products": [
      {
        "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
        "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "name": "Luxury Gift Box",
        "description": "Elegant premium gift box containing fine custom items.",
        "price": "49.99",
        "inStock": true,
        "imageUrl": "https://picsum.photos/seed/product/400/300",
        "createdAt": "2026-08-12T07:40:51.000Z",
        "updatedAt": "2026-08-12T07:40:51.000Z"
      }
    ]
  }
}
```

---

### `POST /api/products`
Creates a new product for the authenticated seller's tenant.

*Requires active seller authentication session.*

**Request Body:**
```json
{
  "name": "Silk Ribbon Gift Set",
  "description": "Handcrafted silk ribbon packaging set.",
  "price": 24.50,
  "inStock": true,
  "imageUrl": "https://picsum.photos/seed/ribbon/400/300"
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "data": {
    "message": "Product created successfully",
    "product": {
      "id": "2a3b4c5d-6e7f-8g9h-0i1j-2k3l4m5n6o7p",
      "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Silk Ribbon Gift Set",
      "price": "24.50",
      "inStock": true,
      ...
    }
  }
}
```

---

### `GET /api/products/[id]`
Gets details of a specific product.

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    "name": "Luxury Gift Box",
    ...
  }
}
```

---

### `PUT /api/products/[id]`
Updates product details.

*Requires active seller authentication session.*

**Request Body (All fields optional):**
```json
{
  "name": "Updated Gift Box Name",
  "price": 54.99,
  "inStock": false
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Product updated successfully",
    "product": {
      "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      "name": "Updated Gift Box Name",
      "price": "54.99",
      "inStock": false,
      ...
    }
  }
}
```

---

### `DELETE /api/products/[id]`
Deletes a product.

*Requires active seller authentication session.*

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Product deleted successfully",
    "id": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p"
  }
}
```

---

## 4. Orders API

### `GET /api/orders`
Lists orders for the authenticated seller's tenant.

*Requires active seller authentication session.*

**Query Parameters:**
- `paymentStatus`: Filter by payment status (`PENDING`, `VERIFIED`, `REJECTED`).
- `orderStatus`: Filter by order status (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`).
- `q`: Search query matching customer name, customer phone, or order ID (case-insensitive).
- `limit`: Number of orders to return (default: `50`).
- `offset`: Offset for pagination (default: `0`).

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 1,
    "orders": [
      {
        "id": "ORD-7482",
        "tenantId": "e0b1deb4-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "customerName": "Alice Smith",
        "customerPhone": "+1234567890",
        "shippingAddress": "123 Main St, Springfield",
        "customNote": "Happy Birthday!",
        "totalAmount": "49.99",
        "receiptUrl": "https://picsum.photos/seed/receipt/400/500",
        "paymentStatus": "VERIFIED",
        "orderStatus": "PROCESSING",
        "createdAt": "2026-08-14T10:00:00.000Z",
        "updatedAt": "2026-08-14T10:05:00.000Z",
        "items": [
          {
            "id": "7a8b9c0d-1e2f-3g4h-5i6j-7k8l9m0n1o2p",
            "orderId": "ORD-7482",
            "productId": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
            "name": "Luxury Gift Box",
            "price": "49.99",
            "quantity": 1
          }
        ]
      }
    ]
  }
}
```

---

### `POST /api/orders`
Submits a new order (public checkout flow).

**Request Body:**
```json
{
  "customerName": "Alice Smith",
  "customerPhone": "+1234567890",
  "shippingAddress": "123 Main St, Springfield",
  "customNote": "Happy Birthday!",
  "totalAmount": "49.99", // optional, will be auto-calculated from items if not provided
  "receiptUrl": "https://example.com/receipts/slip.jpg", // optional
  "items": [
    {
      "productId": "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      "name": "Luxury Gift Box",
      "price": "49.99",
      "quantity": 1
    }
  ]
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "data": {
    "message": "Order placed successfully.",
    "orderId": "#ORD-7482",
    "id": "ORD-7482",
    "customerPhone": "+1234567890",
    "totalAmount": "49.99"
  }
}
```

---

### `GET /api/orders/[id]`
Gets details of a specific order.

#### Case A: Authenticated Seller
If logged in as a seller, returns the full order object and details.

#### Case B: Customer Tracking (Public lookup)
If not logged in, you must provide the customer's phone number as a query parameter (`?phone=...`). Returns a sanitized dataset suitable for order tracking.

**Request (Public tracking lookup):**
`GET /api/orders/ORD-7482?phone=%2B1234567890`

**Response (Public tracking - 200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "#ORD-7482",
    "date": "2026-08-14T10:00:00.000Z",
    "status": "PROCESSING",
    "paymentStatus": "VERIFIED",
    "customerName": "Alice Smith",
    "shippingAddress": "123 Main St, Springfield",
    "totalAmount": "49.99",
    "items": [
      {
        "name": "Luxury Gift Box",
        "quantity": 1,
        "price": "49.99"
      }
    ]
  }
}
```

---

### `PUT /api/orders/[id]`
Updates order status or payment status.

*Requires active seller authentication session.*

**Request Body (All fields optional):**
```json
{
  "paymentStatus": "VERIFIED", // 'PENDING', 'VERIFIED', 'REJECTED'
  "orderStatus": "SHIPPED", // 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'
  "customerName": "Alice Smith Updated",
  "shippingAddress": "New Address St"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Order updated successfully",
    "order": {
      "id": "ORD-7482",
      "paymentStatus": "VERIFIED",
      "orderStatus": "SHIPPED",
      ...
    }
  }
}
```
