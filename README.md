# LuminaGifts SaaS: Single-Vendor E-Commerce Platform

A streamlined, multi-tenant SaaS platform allowing independent sellers to easily create and manage their own isolated storefronts for personalized gifts (teddy bears, gift boxes, etc.). 

Authored by: Binoj Charuka

## 🎨 UI/UX Design Guidelines: Minimalist Approach

The UI is designed using Figma with a focus on a basic, minimal color palette. This allows the seller's colorful products (like teddy bears and gift boxes) to stand out without competing with the interface.

### Color Palette
*   **Primary Background:** `#FAFAFA` (Off-white) - Clean, distraction-free canvas.
*   **Surface Background:** `#FFFFFF` (Pure White) - For cards, checkout panels, and forms.
*   **Primary Text:** `#1A1A1A` (Charcoal Black) - High contrast for readability.
*   **Secondary Text:** `#737373` (Muted Gray) - For subtitles, placeholders, and subtle info.
*   **Accent Color:** `#2563EB` (Soft Royal Blue) - Used sparingly for primary actions (e.g., "Add to Cart", "Accept Payment").
*   **Borders & Dividers:** `#E5E5E5` (Light Gray) - To separate sections subtly.
*   **Status Indicators:**
    *   *Success/Verified:* `#10B981` (Muted Green)
    *   *Pending/Warning:* `#F59E0B` (Muted Yellow)
    *   *Error/Rejected:* `#EF4444` (Muted Red)

### Typography
*   **Font Family:** Inter or Roboto (Clean, sans-serif).
*   **Styling:** Bold for headings, regular for body. Lots of whitespace between elements.

---

## 🚀 Tech Stack

*   **Frontend:** React.js / Next.js (Storefront & Seller Dashboard)
*   **Backend:** Node.js with Express.js
*   **Database:** Neon (Serverless PostgreSQL)
*   **Storage:** Cloudinary (For product images and bank slip uploads)
*   **Design & Prototyping:** Figma

---

## ✨ Key Features

### 🛒 Customer Storefront (Isolated per Seller)
*   **Exclusive Browsing:** Customers only see products belonging to the specific seller (`shop_id`). No cross-selling with other vendors.
*   **Customization Options:** Ability to select variations (size, color) and add a custom personalized note before adding to the cart.
*   **Manual Checkout (Bank Deposit):** 
    *   Customer inputs shipping details.
    *   System displays the specific seller's bank account details.
    *   Customer uploads the bank transfer receipt/slip (saved to Cloudinary).
*   **Guest Order Tracking:** Customers can track their order status using their **Order ID** and **Phone Number** without needing to register for an account.

### 💼 Seller Admin Panel (Dashboard)
*   **Store Customization:** Sellers can upload their logo, update shop name, and set their bank account details.
*   **Inventory Management:** 
    *   Add, edit, and remove products.
    *   Simple Stock Management: Toggle items as "In Stock" or "Out of Stock".
*   **Order & Payment Management:**
    *   View new orders with the attached custom note.
    *   View uploaded bank receipts to verify payments.
    *   Update order statuses manually (`Pending` -> `Payment Verified` -> `Processing` -> `Shipped`).

---

## 🗄️ Database Schema (Neon Postgres)

### 1. `Tenant` (Shops)
*   `id` (PK, UUID)
*   `shop_name` (String)
*   `domain_prefix` (String, Unique)
*   `bank_details` (JSON)
*   `logo_url` (String)

### 2. `Product`
*   `id` (PK, UUID)
*   `tenant_id` (FK -> Tenant.id)
*   `name` (String)
*   `description` (Text)
*   `price` (Decimal)
*   `in_stock` (Boolean)
*   `image_url` (String)

### 3. `Order`
*   `id` (PK, UUID) - Custom formatted like `#ORD-1234`
*   `tenant_id` (FK -> Tenant.id)
*   `customer_name` (String)
*   `customer_phone` (String)
*   `shipping_address` (Text)
*   `custom_note` (Text)
*   `total_amount` (Decimal)
*   `receipt_url` (String) - Cloudinary URL of the uploaded slip
*   `payment_status` (Enum: PENDING, VERIFIED, REJECTED)
*   `order_status` (Enum: PENDING, PROCESSING, SHIPPED, DELIVERED)

---

## 🛠️ Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd lumina-gifts
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add the following:
    ```env
    DATABASE_URL="postgres://<user>:<password>@<host>/<dbname>?sslmode=require" # Neon DB URL
    CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
    PORT=5000
    ```

4.  **Run Migrations:**
    ```bash
    npx prisma db push
    ```

5.  **Start the Development Server:**
    ```bash
    npm run dev
    ```
