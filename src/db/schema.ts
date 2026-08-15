import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopName: varchar("shop_name", { length: 255 }).notNull(),
  domainPrefix: varchar("domain_prefix", { length: 100 }).notNull().unique(),
  bankDetails: jsonb("bank_details").$type<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  }>().notNull(),
  logoUrl: varchar("logo_url", { length: 2083 }),
  contentSettings: jsonb("content_settings").$type<{
    whatsapp: string;
    location: string;
    announcementText: string;
    heroBadge: string;
    heroHeading: string;
    heroSubtext: string;
    heroPrimaryBtn: string;
    heroSecondaryBtn: string;
    footerTagline: string;
    footerEmail: string;
    footerPhone: string;
    footerAddress: string;
    nextDayDeliveryText?: string;
    heroTagText?: string;
    heroImageUrl?: string;
    deliveryFee?: string;
    slides?: Array<{
      badge: string;
      heading: string;
      description: string;
      price?: string;
      buttonText: string;
      buttonLink?: string;
      imageUrl: string;
      tagText?: string;
    }>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sellers = pgTable("sellers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  inStock: boolean("in_stock").default(true).notNull(),
  stockCount: integer("stock_count").default(0).notNull(),
  imageUrl: varchar("image_url", { length: 2083 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id", { length: 100 }).primaryKey(), // Custom formatted like 'ORD-1234'
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  shippingAddress: text("shipping_address").notNull(),
  customNote: text("custom_note"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).default("FULL_PAYMENT").notNull(), // 'FULL_PAYMENT', 'COD'
  receiptUrl: varchar("receipt_url", { length: 2083 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("PENDING").notNull(), // 'PENDING', 'VERIFIED', 'REJECTED'
  orderStatus: varchar("order_status", { length: 20 }).default("PENDING").notNull(), // 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id", { length: 100 }).references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(), // snapshot of product name at purchase time
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // snapshot of price at purchase time
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships
export const tenantsRelations = relations(tenants, ({ many }) => ({
  products: many(products),
  orders: many(orders),
  sellers: many(sellers),
}));

export const sellersRelations = relations(sellers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sellers.tenantId],
    references: [tenants.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiryDate: timestamp("expiry_date"),
  usageLimit: integer("usage_limit").notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [promoCodes.tenantId],
    references: [tenants.id],
  }),
}));
