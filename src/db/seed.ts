import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "./index";
import { tenants, sellers, products } from "./schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seed() {
  console.log("🌱 Starting seed...");

  // 1. Clean database
  console.log("Cleaning existing data...");
  await db.delete(products);
  await db.delete(sellers);
  await db.delete(tenants);

  // 2. Insert Cuddle & Co. Tenant
  console.log("Inserting tenant...");
  const [tenant] = await db
    .insert(tenants)
    .values({
      shopName: "Cuddle & Co.",
      domainPrefix: "cuddle-co",
      bankDetails: {
        bankName: "Commercial Bank",
        accountName: "Cuddle & Co. Pvt Ltd",
        accountNumber: "8001 2345 6789",
        branch: "Colombo 03",
      },
      logoUrl: "",
    })
    .returning();

  console.log(`Tenant created: ${tenant.shopName} (${tenant.id})`);

  // 3. Insert Seller account
  console.log("Inserting seller user...");
  const sellerPassword = "password123";
  const passwordHash = hashPassword(sellerPassword);
  const [seller] = await db
    .insert(sellers)
    .values({
      tenantId: tenant.id,
      email: "seller@cuddle.co",
      passwordHash: passwordHash,
    })
    .returning();

  console.log(`Seller created: ${seller.email} (Password: ${sellerPassword})`);

  // 4. Insert Products
  console.log("Inserting products...");
  const seedProducts = [
    {
      tenantId: tenant.id,
      name: "Classic Linen Bear",
      description: "A beautifully handcrafted traditional teddy bear made from premium organic linen. Elegant and timeless.",
      price: "4500.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/teddy-bear-classic/600/750",
    },
    {
      tenantId: tenant.id,
      name: "The Celebration Box",
      description: "Our signature gift box containing a medium linen bear, a scented soy candle, and gourmet chocolates.",
      price: "8500.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/gift-box-celebration/600/750",
    },
    {
      tenantId: tenant.id,
      name: "Velvet Ribbon Bear",
      description: "Ultra-soft plush bear adorned with a rich royal blue velvet ribbon. Perfect for special milestones.",
      price: "5000.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/teddy-velvet-ribbon/600/750",
    },
    {
      tenantId: tenant.id,
      name: "Mini Comfort Box",
      description: "A smaller curation featuring a mini pocket bear, organic tea bag selection, and a handwritten card.",
      price: "3500.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/gift-box-mini-comfort/600/750",
    },
    {
      tenantId: tenant.id,
      name: "Signature Grand Bear",
      description: "Our largest handcrafted heirloom bear, constructed with wool-blend fabric and hand-embroidered details.",
      price: "12000.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/teddy-grand-signature/600/750",
    },
    {
      tenantId: tenant.id,
      name: "Custom Name Blanket",
      description: "A soft cotton knit blanket customized with your loved one's name, knitted in a classic cream color.",
      price: "6500.00",
      inStock: true,
      imageUrl: "https://picsum.photos/seed/blanket-custom-name/600/750",
    },
  ];

  for (const item of seedProducts) {
    const [prod] = await db.insert(products).values(item).returning();
    console.log(`- Created product: ${prod.name}`);
  }

  console.log("✨ Seeding finished successfully!");
}

seed()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
