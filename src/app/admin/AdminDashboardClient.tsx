"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package, ShoppingBag, Storefront, SignOut, MagnifyingGlass,
  Plus, PencilSimple, CheckCircle, Clock, Truck, XCircle, Trash, Tag, Ticket
} from "@phosphor-icons/react";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import {
  updateOrderStatus,
  updateStoreSettings,
  updateContentSettings,
  upsertProduct,
  deleteProduct,
  toggleProductStock,
  upsertPromoCode,
  deletePromoCode,
  sellerLogout,
  updateAdminCredentials
} from "./actions";

type AdminTab = "overview" | "orders" | "inventory" | "promotions" | "settings" | "content";

interface ContentSettings {
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
}

interface TenantData {
  id: string;
  shopName: string;
  domainPrefix: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
  logoUrl: string | null;
  contentSettings: ContentSettings | null;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: string;
  inStock: boolean;
  stockCount: number;
  imageUrl: string | null;
}

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  customNote: string | null;
  totalAmount: string;
  receiptUrl: string | null;
  paymentStatus: string;
  orderStatus: string;
  createdAt: Date;
}

interface PromoCodeData {
  id: string;
  code: string;
  discountAmount: string;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  createdAt: Date;
}

interface DashboardClientProps {
  initialData: {
    tenant: TenantData;
    products: ProductData[];
    orders: OrderData[];
    promoCodes: PromoCodeData[];
    stats: {
      totalOrders: string;
      pendingPayment: string;
      shipped: string;
      delivered: string;
    };
    adminEmail: string;
  };
}

export default function AdminDashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [data, setData] = useState(initialData);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  // Inventory product search
  const [inventorySearch, setInventorySearch] = useState("");

  // Toast notification system
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3500);
  };

  // Synchronize state with incoming initialData from server component
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    inStock: true,
    stockCount: "0",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Promo modal state
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeData | null>(null);
  const [deletePromoConfirmId, setDeletePromoConfirmId] = useState<string | null>(null);
  const [promoCodeForm, setPromoCodeForm] = useState({
    code: "",
    discountAmount: "0",
    usageLimit: "100",
    isActive: true,
  });

  const [adminCredentialsForm, setAdminCredentialsForm] = useState({
    email: initialData.adminEmail || "",
    currentPassword: "",
    newPassword: "",
  });

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProductForm((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        alert(data.error || "Failed to upload product image.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while uploading product image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    shopName: data.tenant.shopName,
    domainPrefix: data.tenant.domainPrefix,
    bankName: data.tenant.bankDetails.bankName,
    branch: data.tenant.bankDetails.branch,
    accountName: data.tenant.bankDetails.accountName,
    accountNumber: data.tenant.bankDetails.accountNumber,
    logoUrl: data.tenant.logoUrl || "",
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setSettingsForm((prev) => ({ ...prev, logoUrl: data.url }));
        showToast("Logo uploaded successfully!");
      } else {
        showToast(data.error || "Failed to upload logo.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred while uploading logo.", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  const defaultSlides = [
    {
      badge: "Handmade Teddy",
      heading: "Stitch Pink Teddy Bear",
      description: "Super soft and snuggly pink stitch bear made with premium organic materials.",
      price: "4500",
      buttonText: "Order Now",
      buttonLink: "",
      imageUrl: "https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80",
      tagText: "✨ Best Seller Colombo",
    },
    {
      badge: "Luxury Gift Box",
      heading: "The Signature Grand Bear Box",
      description: "Our ultimate signature gift box containing a teddy bear, a scented candle and treats.",
      price: "12000",
      buttonText: "Order Now",
      buttonLink: "",
      imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80",
      tagText: "✨ Premium Collection",
    },
    {
      badge: "Blankets & Extras",
      heading: "Custom Embroidered Name Blanket",
      description: "Soft customized name baby blanket, perfect for welcoming new babies.",
      price: "6500",
      buttonText: "Order Now",
      buttonLink: "",
      imageUrl: "https://images.unsplash.com/photo-1584080897424-241b919427b3?w=600&auto=format&fit=crop&q=80",
      tagText: "✨ Customer Favorite",
    },
  ];

  // Content settings form state (with defaults)
  const defaultContent: ContentSettings = {
    whatsapp: "+94 77 123 4567",
    location: "Colombo, Sri Lanka",
    announcementText: "🚚 Safe Island-wide Courier Delivery",
    heroBadge: "Artisan Sri Lankan Gift Boxes",
    heroHeading: "Handcrafted with absolute love.",
    heroSubtext: "Curated luxury rigid gift boxes and hand-knitted traditional teddy bears, prepared with care and delivered island-wide.",
    heroPrimaryBtn: "Try Interactive Quiz",
    heroSecondaryBtn: "Track Delivery",
    footerTagline: "Curated luxury gift packaging, custom wooden boxes, and organic cotton teddy bears hand-crafted locally in Sri Lanka.",
    footerEmail: "support@luminagifts.lk",
    footerPhone: "+94 77 123 4567",
    footerAddress: "Colombo 03, Sri Lanka",
    nextDayDeliveryText: "Next-day Delivery Available",
    heroTagText: "✨ Best Seller Colombo",
    heroImageUrl: "https://picsum.photos/seed/gift-hero-premium/800/1000",
    slides: defaultSlides,
  };

  const [contentForm, setContentForm] = useState<ContentSettings>(() => {
    const raw = data.tenant.contentSettings ?? defaultContent;
    if (!raw.slides || raw.slides.length === 0) {
      raw.slides = defaultSlides;
    }
    return raw;
  });

  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSlideIdx(index);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setContentForm((prev) => {
          const updatedSlides = [...(prev.slides || [])];
          if (updatedSlides[index]) {
            updatedSlides[index] = { ...updatedSlides[index], imageUrl: data.url };
          }
          return { ...prev, slides: updatedSlides };
        });
        showToast(`Slide ${index + 1} image uploaded successfully!`);
      } else {
        showToast(data.error || "Failed to upload image.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred while uploading image.", "error");
    } finally {
      setUploadingSlideIdx(null);
    }
  };

  const [activeSlideTab, setActiveSlideTab] = useState<number>(0);

  const handleSaveContentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateContentSettings(contentForm);
    if (res.success) {
      showToast("Content settings saved! Storefront text updated.");
    } else {
      showToast(res.error || "Failed to save content settings", "error");
    }
  };

  // Order status edit state
  const [tempPaymentStatus, setTempPaymentStatus] = useState<string>("");
  const [tempOrderStatus, setTempOrderStatus] = useState<string>("");

  const handleSignOut = async () => {
    await sellerLogout();
    router.push("/admin/login");
  };

  const selectOrder = (order: OrderData) => {
    setSelectedOrder(order);
    setTempPaymentStatus(order.paymentStatus);
    setTempOrderStatus(order.orderStatus);
    setActiveTab("orders");
  };

  const handleSaveOrderStatus = async () => {
    if (!selectedOrder) return;
    const res = await updateOrderStatus(
      selectedOrder.id,
      tempPaymentStatus as any,
      tempOrderStatus as any
    );
    if (res.success) {
      const updatedOrders = data.orders.map((o) =>
        o.id === selectedOrder.id
          ? { ...o, paymentStatus: tempPaymentStatus, orderStatus: tempOrderStatus }
          : o
      );
      const pendingCount = updatedOrders.filter((o) => o.paymentStatus === "PENDING").length;
      const shippedCount = updatedOrders.filter((o) => o.orderStatus === "SHIPPED").length;
      const deliveredCount = updatedOrders.filter((o) => o.orderStatus === "DELIVERED").length;
      setData({
        ...data,
        orders: updatedOrders,
        stats: {
          ...data.stats,
          pendingPayment: pendingCount.toString(),
          shipped: shippedCount.toString(),
          delivered: deliveredCount.toString(),
        }
      });
      setSelectedOrder({
        ...selectedOrder,
        paymentStatus: tempPaymentStatus,
        orderStatus: tempOrderStatus,
      });
      showToast("Order status updated successfully!");
    } else {
      showToast(res.error || "Failed to update order status", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateStoreSettings({
      shopName: settingsForm.shopName,
      domainPrefix: settingsForm.domainPrefix,
      bankDetails: {
        bankName: settingsForm.bankName,
        branch: settingsForm.branch,
        accountName: settingsForm.accountName,
        accountNumber: settingsForm.accountNumber,
      },
      logoUrl: settingsForm.logoUrl,
    });

    if (res.success) {
      setData({
        ...data,
        tenant: {
          ...data.tenant,
          shopName: settingsForm.shopName,
          domainPrefix: settingsForm.domainPrefix,
          logoUrl: settingsForm.logoUrl,
          bankDetails: {
            bankName: settingsForm.bankName,
            branch: settingsForm.branch,
            accountName: settingsForm.accountName,
            accountNumber: settingsForm.accountNumber,
          },
        },
      });
      showToast("Store settings updated successfully!");
    } else {
      showToast(res.error || "Failed to update settings", "error");
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentialsForm.newPassword && !adminCredentialsForm.currentPassword) {
      showToast("Current password is required to set a new password", "error");
      return;
    }
    const res = await updateAdminCredentials({
      email: adminCredentialsForm.email,
      currentPassword: adminCredentialsForm.currentPassword || undefined,
      newPassword: adminCredentialsForm.newPassword || undefined,
    });
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Admin credentials updated successfully!");
      setAdminCredentialsForm(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
      setData({
        ...data,
        adminEmail: adminCredentialsForm.email,
      });
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      price: "",
      description: "",
      imageUrl: "",
      inStock: true,
      stockCount: "0",
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: ProductData) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      price: p.price,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      inStock: p.inStock,
      stockCount: String(p.stockCount || 0),
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) {
      showToast("Name and Price are required.", "error");
      return;
    }

    const res = await upsertProduct(editingProduct?.id || null, {
      name: productForm.name,
      price: productForm.price,
      description: productForm.description,
      imageUrl: productForm.imageUrl,
      inStock: productForm.inStock,
      stockCount: parseInt(productForm.stockCount) || 0,
    });
    if (res.success) {
      setIsProductModalOpen(false);
      router.refresh();
      showToast(editingProduct ? "Product updated!" : "Product created!");
    } else {
      showToast(res.error || "Failed to save product", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await deleteProduct(id);
    if (res.success) {
      setData({
        ...data,
        products: data.products.filter((p) => p.id !== id),
      });
      showToast("Product deleted.");
    } else {
      showToast(res.error || "Failed to delete product", "error");
    }
  };

  const handleToggleStock = async (p: ProductData) => {
    const res = await toggleProductStock(p.id, p.inStock);
    if (res.success) {
      setData({
        ...data,
        products: data.products.map((item) =>
          item.id === p.id ? { ...item, inStock: !item.inStock } : item
        ),
      });
      showToast(`${p.name} marked ${p.inStock ? "out of stock" : "in stock"}.`);
    } else {
      showToast(res.error || "Failed to toggle stock status", "error");
    }
  };

  const handleOpenAddPromo = () => {
    setEditingPromo(null);
    setPromoCodeForm({
      code: "",
      discountAmount: "0",
      usageLimit: "100",
      isActive: true,
    });
    setIsPromoModalOpen(true);
  };

  const handleOpenEditPromo = (p: PromoCodeData) => {
    setEditingPromo(p);
    setPromoCodeForm({
      code: p.code,
      discountAmount: p.discountAmount,
      usageLimit: p.usageLimit.toString(),
      isActive: p.isActive,
    });
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeForm.code || !promoCodeForm.discountAmount) {
      showToast("Code and Discount Amount are required.", "error");
      return;
    }

    const res = await upsertPromoCode(editingPromo?.id || null, {
      code: promoCodeForm.code,
      discountAmount: promoCodeForm.discountAmount,
      usageLimit: parseInt(promoCodeForm.usageLimit) || 0,
      isActive: promoCodeForm.isActive,
    });

    if (res.success) {
      setIsPromoModalOpen(false);
      router.refresh();
      showToast(editingPromo ? "Promo code updated!" : "Promo code created!");
    } else {
      showToast(res.error || "Failed to save promo code", "error");
    }
  };

  const handleDeletePromo = async (id: string) => {
    const res = await deletePromoCode(id);
    if (res.success) {
      setData({
        ...data,
        promoCodes: data.promoCodes.filter((p) => p.id !== id),
      });
      showToast("Promo code deleted.");
    } else {
      showToast(res.error || "Failed to delete promo code", "error");
    }
  };

  // Filtered inventory products
  const filteredProducts = data.products.filter((p) =>
    p.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // Low Stock products alert (less than 5 units left)
  const lowStockProducts = data.products.filter((p) => p.stockCount < 5);

  // Filtered orders
  const filteredOrders = data.orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery)
  );

  const paymentBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      VERIFIED: { bg: "bg-green-50 text-green-700 border-green-200", text: "VERIFIED" },
      PENDING:  { bg: "bg-yellow-50 text-yellow-700 border-yellow-200", text: "PENDING" },
      REJECTED: { bg: "bg-red-50 text-red-700 border-red-200", text: "REJECTED" },
    };
    const style = map[status] ?? map.PENDING;
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${style.bg}`}>
        {style.text}
      </span>
    );
  };

  const formatDate = (dateInput: any) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const navItems: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: "overview",   label: "Overview",   icon: Storefront },
    { key: "orders",     label: "Orders",     icon: ShoppingBag },
    { key: "inventory",  label: "Inventory",  icon: Package },
    { key: "promotions", label: "Promotions", icon: Tag },
    { key: "settings",   label: "Settings",   icon: PencilSimple },
    { key: "content",    label: "Content",    icon: PencilSimple },
  ];

  const statsList = [
    { label: "Total Orders",     value: data.stats.totalOrders,    icon: ShoppingBag, color: "text-primary" },
    { label: "Pending Payment",  value: data.stats.pendingPayment, icon: Clock,       color: "text-yellow-600" },
    { label: "Shipped",          value: data.stats.shipped,        icon: Truck,       color: "text-blue-600" },
    { label: "Delivered",        value: data.stats.delivered,      icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {toast.type === "success" ? <CheckCircle size={18} weight="fill" className="text-green-600" /> : <XCircle size={18} weight="fill" className="text-red-500" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-40 hidden md:flex">
        <div className="px-6 h-16 flex items-center border-b border-border">
          <span className="font-bold text-base tracking-tight truncate max-w-[120px]">
            {data.tenant.shopName}
          </span>
          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                if (key !== "orders") setSelectedOrder(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/" target="_blank" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Storefront size={18} />
            View Storefront
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
            <SignOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 pb-16 md:pb-0">

        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 sticky top-0 z-30">
          <h1 className="text-base font-semibold capitalize">
            {activeTab === "overview" ? "Dashboard" : activeTab}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 w-56 text-sm border-border bg-background text-foreground"
              />
            </div>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* Low Stock Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-amber-800 dark:text-amber-200 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
                <Package size={22} weight="bold" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-base">Low Stock Alert</h4>
                <p className="text-sm opacity-90">
                  The following products have less than 5 units left and need to be refilled:
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {lowStockProducts.map((p) => (
                    <span
                      key={p.id}
                      onClick={() => {
                        setActiveTab("inventory");
                        handleOpenEditProduct(p);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      {p.name} ({p.stockCount} left)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {statsList.map((s, i) => (
                  <Card key={i} className="border-border bg-card">
                    <CardContent className="p-5">
                      <div className={`mb-3 ${s.color}`}><s.icon size={22} /></div>
                      <p className="text-3xl font-bold text-foreground">{s.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <h2 className="font-semibold mb-4 text-foreground">Recent Orders</h2>
                <Card className="border-border bg-card">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Order</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Customer</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Total</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Payment</th>
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.orders.slice(0, 5).map((o) => (
                          <tr
                            key={o.id}
                            className="hover:bg-muted/40 transition-colors cursor-pointer text-foreground"
                            onClick={() => selectOrder(o)}
                          >
                            <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">{o.id}</td>
                            <td className="px-5 py-3.5">{o.customerName}</td>
                            <td className="px-5 py-3.5 font-semibold">Rs. {parseFloat(o.totalAmount).toLocaleString()}</td>
                            <td className="px-5 py-3.5">{paymentBadge(o.paymentStatus)}</td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground font-semibold uppercase">{o.orderStatus}</td>
                          </tr>
                        ))}
                        {data.orders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-muted-foreground">
                              No orders found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {selectedOrder ? (
                <div className="space-y-6">
                  <button onClick={() => setSelectedOrder(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                    &larr; Back to orders
                  </button>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-border bg-card text-foreground">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="font-bold text-lg font-mono text-primary">{selectedOrder.id}</h2>
                          {paymentBadge(selectedOrder.paymentStatus)}
                        </div>
                        <div className="pt-2">
                          <OrderStatusTracker status={selectedOrder.orderStatus as any} />
                        </div>
                        <div className="pt-4 space-y-2 text-sm border-t border-border">
                          <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{selectedOrder.customerName}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{selectedOrder.customerPhone}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold text-primary">Rs. {parseFloat(selectedOrder.totalAmount).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(selectedOrder.createdAt)}</span></div>
                        </div>
                        {selectedOrder.customNote && (
                          <div className="bg-muted/50 rounded-lg p-4 text-sm italic text-muted-foreground border border-border">
                            "{selectedOrder.customNote}"
                          </div>
                        )}
                        {selectedOrder.shippingAddress && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping Address</span>
                            <p className="text-sm leading-relaxed p-3 bg-muted/30 border border-border rounded-lg">
                              {selectedOrder.shippingAddress}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card text-foreground">
                      <CardContent className="p-6 space-y-4">
                        <h2 className="font-semibold">Update Order</h2>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Status</label>
                          <div className="flex gap-2 flex-wrap">
                            {["PENDING", "VERIFIED", "REJECTED"].map((s) => (
                              <button
                                key={s}
                                onClick={() => setTempPaymentStatus(s)}
                                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${tempPaymentStatus === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Status</label>
                          <div className="flex gap-2 flex-wrap">
                            {["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"].map((s) => (
                              <button
                                key={s}
                                onClick={() => setTempOrderStatus(s)}
                                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${tempOrderStatus === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        {selectedOrder.receiptUrl && (
                          <div className="space-y-2 pt-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Receipt</label>
                            <div className="border border-border rounded-lg p-3 flex items-center gap-3 bg-muted/30">
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                <Image src={selectedOrder.receiptUrl} alt="receipt" fill className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">Bank Slip Receipt</p>
                                <p className="text-xs text-muted-foreground">Uploaded by customer</p>
                              </div>
                              <a
                                href={selectedOrder.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center h-8 rounded-full border border-border px-3 text-xs bg-background hover:bg-muted text-foreground font-semibold"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        )}
                        <Button onClick={handleSaveOrderStatus} className="w-full rounded-full mt-4 h-11">
                          Save Changes
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">All Orders</h2>
                    <span className="text-sm text-muted-foreground">{filteredOrders.length} orders</span>
                  </div>
                  <Card className="border-border bg-card">
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border">
                          <tr className="text-left text-muted-foreground">
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Order</th>
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Customer</th>
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Date</th>
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Total</th>
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Payment</th>
                            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">Delivery</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredOrders.map((o) => (
                            <tr
                              key={o.id}
                              className="hover:bg-muted/40 transition-colors cursor-pointer text-foreground"
                              onClick={() => selectOrder(o)}
                            >
                              <td className="px-5 py-3.5 font-mono text-xs font-semibold text-primary">{o.id}</td>
                              <td className="px-5 py-3.5">
                                <p className="font-medium">{o.customerName}</p>
                                <p className="text-xs text-muted-foreground">{o.customerPhone}</p>
                              </td>
                              <td className="px-5 py-3.5 text-muted-foreground">{formatDate(o.createdAt)}</td>
                              <td className="px-5 py-3.5 font-semibold">Rs. {parseFloat(o.totalAmount).toLocaleString()}</td>
                              <td className="px-5 py-3.5">{paymentBadge(o.paymentStatus)}</td>
                              <td className="px-5 py-3.5 text-xs font-semibold uppercase text-muted-foreground">{o.orderStatus}</td>
                            </tr>
                          ))}
                          {filteredOrders.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                No orders match search criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {/* INVENTORY */}
          {activeTab === "inventory" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-foreground">Products</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-8 h-8 w-44 text-xs border-border bg-background text-foreground"
                    />
                  </div>
                  <Button onClick={handleOpenAddProduct} size="sm" className="rounded-full gap-2 h-10 px-4">
                    <Plus size={14} />
                    Add Product
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((p) => (
                  <Card key={p.id} className="border-border bg-card overflow-hidden group">
                    <div className="relative aspect-[4/3] bg-muted">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                          (!p.inStock || p.stockCount === 0)
                            ? "bg-red-50 text-red-700 border-red-200"
                            : p.stockCount < 5
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {(!p.inStock || p.stockCount === 0)
                            ? "Out of Stock"
                            : p.stockCount < 5
                            ? `Low Stock: ${p.stockCount} left`
                            : `${p.stockCount} in Stock`
                          }
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4 text-foreground">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                          <p className="text-muted-foreground text-sm">Rs. {parseFloat(p.price).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground bg-background"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-destructive bg-background"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className={`flex-1 h-1.5 rounded-full ${(p.inStock && p.stockCount > 0) ? "bg-green-100" : "bg-neutral-100"}`}>
                          <div className={`h-full rounded-full ${(p.inStock && p.stockCount > 0) ? "bg-green-500 w-full" : "w-0"}`} />
                        </div>
                        <button
                          onClick={() => handleToggleStock(p)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors font-semibold"
                        >
                          Toggle Stock
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add new product card */}
                <Card
                  onClick={handleOpenAddProduct}
                  className="border-border border-dashed cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-center min-h-[220px] bg-card"
                >
                  <CardContent className="p-6 flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus size={18} />
                    </div>
                    <p className="text-sm font-medium">Add New Product</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* PROMOTIONS */}
          {activeTab === "promotions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex sm:flex-row flex-col sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                  <h2 className="font-semibold text-foreground">Promo Codes</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage discount codes and promotions for your store.</p>
                </div>
                <Button onClick={handleOpenAddPromo} size="sm" className="rounded-full gap-2 h-10 px-4">
                  <Plus size={14} />
                  Add Promo Code
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.promoCodes.map((p) => (
                  <Card key={p.id} className="border-border bg-card">
                    <CardContent className="p-5 flex flex-col gap-4 text-foreground">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-mono font-bold text-lg text-primary bg-primary/10 px-3 py-1 rounded-md tracking-wider inline-block">
                            {p.code}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2 font-medium">Discount: Rs. {parseFloat(p.discountAmount).toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${p.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border">
                        <span>Used: {p.usedCount} / {p.usageLimit}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEditPromo(p)}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-foreground"
                          >
                            <PencilSimple size={14} />
                          </button>
                          <button
                            onClick={() => setDeletePromoConfirmId(p.id)}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-destructive"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {data.promoCodes.length === 0 && (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <Ticket size={48} className="mb-4 opacity-20" />
                    <p>No promo codes found.</p>
                    <button onClick={handleOpenAddPromo} className="text-primary font-semibold mt-2 hover:underline">
                      Create your first promo code
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CONTENT SETTINGS */}
          {activeTab === "content" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-8">
              <div>
                <h2 className="font-semibold text-foreground">Content & Text Settings</h2>
                <p className="text-sm text-muted-foreground mt-1">Edit all visible text on your storefront — header, hero section, and footer.</p>
              </div>
              <form onSubmit={handleSaveContentSettings} className="space-y-6">

                {/* Announcement Bar */}
                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-3">📢 Announcement Bar</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">WhatsApp Number</label>
                        <Input value={contentForm.whatsapp} onChange={(e) => setContentForm({ ...contentForm, whatsapp: e.target.value })} className="h-10 border-border bg-background" placeholder="+94 77 123 4567" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Location Text</label>
                        <Input value={contentForm.location} onChange={(e) => setContentForm({ ...contentForm, location: e.target.value })} className="h-10 border-border bg-background" placeholder="Colombo, Sri Lanka" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Announcement Message</label>
                        <Input value={contentForm.announcementText} onChange={(e) => setContentForm({ ...contentForm, announcementText: e.target.value })} className="h-10 border-border bg-background" placeholder="🚚 Safe Island-wide Courier Delivery" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Sub-Header Delivery Info Text</label>
                        <Input value={contentForm.nextDayDeliveryText || ""} onChange={(e) => setContentForm({ ...contentForm, nextDayDeliveryText: e.target.value })} className="h-10 border-border bg-background" placeholder="Next-day Delivery Available" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Delivery Fee (Rs.)</label>
                        <Input type="number" value={contentForm.deliveryFee || ""} onChange={(e) => setContentForm({ ...contentForm, deliveryFee: e.target.value })} className="h-10 border-border bg-background" placeholder="400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hero Section */}
                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-6">
                    <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">🦸 Hero Section (3-Slide Carousel)</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Configure 3 hero slides that transition automatically every 10 seconds.</p>
                      </div>
                      {/* Tabs */}
                      <div className="flex bg-muted p-1 rounded-lg border border-border">
                        {[0, 1, 2].map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSlideTab(idx)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                              activeSlideTab === idx
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Slide {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {contentForm.slides && contentForm.slides[activeSlideTab] && (
                      <div className="space-y-4 animate-fadeIn">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Badge Text <span className="text-muted-foreground font-normal">(small tag above heading)</span></label>
                            <Input
                              value={contentForm.slides[activeSlideTab].badge}
                              onChange={(e) => {
                                const slides = [...(contentForm.slides || [])];
                                slides[activeSlideTab] = { ...slides[activeSlideTab], badge: e.target.value };
                                setContentForm({ ...contentForm, slides });
                              }}
                              className="h-10 border-border bg-background"
                              placeholder="Handmade Teddy"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Gold Tag Overlay <span className="text-muted-foreground font-normal">(on image tag)</span></label>
                            <Input
                              value={contentForm.slides[activeSlideTab].tagText || ""}
                              onChange={(e) => {
                                const slides = [...(contentForm.slides || [])];
                                slides[activeSlideTab] = { ...slides[activeSlideTab], tagText: e.target.value };
                                setContentForm({ ...contentForm, slides });
                              }}
                              className="h-10 border-border bg-background"
                              placeholder="✨ Best Seller Colombo"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-sm font-medium">Main Heading</label>
                            <Input
                              value={contentForm.slides[activeSlideTab].heading}
                              onChange={(e) => {
                                const slides = [...(contentForm.slides || [])];
                                slides[activeSlideTab] = { ...slides[activeSlideTab], heading: e.target.value };
                                setContentForm({ ...contentForm, slides });
                              }}
                              className="h-10 border-border bg-background"
                              placeholder="Stitch Pink Teddy Bear"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Price (Rs.) <span className="text-muted-foreground font-normal">(optional display)</span></label>
                            <Input
                              value={contentForm.slides[activeSlideTab].price || ""}
                              onChange={(e) => {
                                const slides = [...(contentForm.slides || [])];
                                slides[activeSlideTab] = { ...slides[activeSlideTab], price: e.target.value };
                                setContentForm({ ...contentForm, slides });
                              }}
                              className="h-10 border-border bg-background"
                              placeholder="4,500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Subtext / Description</label>
                          <textarea
                            value={contentForm.slides[activeSlideTab].description}
                            onChange={(e) => {
                              const slides = [...(contentForm.slides || [])];
                              slides[activeSlideTab] = { ...slides[activeSlideTab], description: e.target.value };
                              setContentForm({ ...contentForm, slides });
                            }}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary transition"
                            placeholder="Super soft and snuggly..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Order / Action Button Label</label>
                          <Input
                            value={contentForm.slides[activeSlideTab].buttonText}
                            onChange={(e) => {
                              const slides = [...(contentForm.slides || [])];
                              slides[activeSlideTab] = { ...slides[activeSlideTab], buttonText: e.target.value };
                              setContentForm({ ...contentForm, slides });
                            }}
                            className="h-10 border-border bg-background"
                            placeholder="Order Now"
                          />
                        </div>

                        <div className="space-y-3 pt-2">
                          <label className="text-sm font-medium block">Slide Image</label>
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            {contentForm.slides[activeSlideTab].imageUrl ? (
                              <div className="w-24 h-24 rounded-xl border border-border relative overflow-hidden bg-muted flex-shrink-0">
                                <Image
                                  src={contentForm.slides[activeSlideTab].imageUrl}
                                  alt={`Slide ${activeSlideTab + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                                No image
                              </div>
                            )}

                            <div className="flex-1 space-y-2 w-full">
                              <div className="flex gap-2">
                                <Input
                                  value={contentForm.slides[activeSlideTab].imageUrl}
                                  onChange={(e) => {
                                    const slides = [...(contentForm.slides || [])];
                                    slides[activeSlideTab] = { ...slides[activeSlideTab], imageUrl: e.target.value };
                                    setContentForm({ ...contentForm, slides });
                                  }}
                                  className="h-10 border-border bg-background flex-1 text-xs"
                                  placeholder="Or paste image URL directly..."
                                />
                                <label className="cursor-pointer h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold flex items-center justify-center transition-colors">
                                  {uploadingSlideIdx === activeSlideTab ? "Uploading..." : "Upload File"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingSlideIdx !== null}
                                    onChange={(e) => handleSlideImageUpload(e, activeSlideTab)}
                                  />
                                </label>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Recommend size: 800x1000px (4:5 ratio) for beautiful alignment.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Footer */}
                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b border-border pb-3">🦶 Footer Details</h3>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Tagline / About Text</label>
                      <textarea
                        value={contentForm.footerTagline}
                        onChange={(e) => setContentForm({ ...contentForm, footerTagline: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={contentForm.footerPhone} onChange={(e) => setContentForm({ ...contentForm, footerPhone: e.target.value })} className="h-10 border-border bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Email</label>
                        <Input value={contentForm.footerEmail} onChange={(e) => setContentForm({ ...contentForm, footerEmail: e.target.value })} className="h-10 border-border bg-background" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Address</label>
                        <Input value={contentForm.footerAddress} onChange={(e) => setContentForm({ ...contentForm, footerAddress: e.target.value })} className="h-10 border-border bg-background" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="rounded-full px-8 h-11 text-sm font-semibold">
                  Save Content Settings
                </Button>
              </form>
            </motion.div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl space-y-8">
              <h2 className="font-semibold text-foreground">Store Settings</h2>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-5">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Store Identity</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Store Logo</label>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                            {settingsForm.logoUrl ? (
                              <img src={settingsForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              <Storefront size={24} className="text-muted-foreground opacity-50" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={logoInputRef}
                              onChange={handleLogoUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? "Uploading..." : "Change Logo"}
                            </Button>
                            <p className="text-[10px] text-muted-foreground">Recommended: Square PNG/JPG, transparent background.</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Shop Name</label>
                        <Input
                          value={settingsForm.shopName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                          required
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Shop URL Prefix</label>
                        <div className="flex items-center gap-0">
                          <span className="h-11 px-3 flex items-center text-sm text-muted-foreground bg-muted border border-r-0 border-border rounded-l-lg">
                            luminagifts.com/
                          </span>
                          <Input
                            value={settingsForm.domainPrefix}
                            onChange={(e) => setSettingsForm({ ...settingsForm, domainPrefix: e.target.value })}
                            required
                            className="h-11 rounded-l-none border-border bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-5">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Bank Account Details</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bank Name</label>
                        <Input
                          value={settingsForm.bankName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                          required
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Branch</label>
                        <Input
                          value={settingsForm.branch}
                          onChange={(e) => setSettingsForm({ ...settingsForm, branch: e.target.value })}
                          required
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account Name</label>
                        <Input
                          value={settingsForm.accountName}
                          onChange={(e) => setSettingsForm({ ...settingsForm, accountName: e.target.value })}
                          required
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account Number</label>
                        <Input
                          value={settingsForm.accountNumber}
                          onChange={(e) => setSettingsForm({ ...settingsForm, accountNumber: e.target.value })}
                          required
                          className="h-11 border-border bg-background font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="rounded-full px-8 h-11 text-sm font-semibold">
                  Save All Changes
                </Button>
              </form>

              <hr className="border-border" />
              
              <h2 className="font-semibold text-foreground">Admin Credentials</h2>
              <form onSubmit={handleSaveAdminCredentials} className="space-y-6 pb-20">
                <Card className="border-border bg-card text-foreground">
                  <CardContent className="p-6 space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Email (Username)</label>
                        <Input
                          type="email"
                          value={adminCredentialsForm.email}
                          onChange={(e) => setAdminCredentialsForm({ ...adminCredentialsForm, email: e.target.value })}
                          required
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current Password</label>
                        <Input
                          type="password"
                          value={adminCredentialsForm.currentPassword}
                          onChange={(e) => setAdminCredentialsForm({ ...adminCredentialsForm, currentPassword: e.target.value })}
                          placeholder="Required to change password"
                          className="h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <Input
                          type="password"
                          value={adminCredentialsForm.newPassword}
                          onChange={(e) => setAdminCredentialsForm({ ...adminCredentialsForm, newPassword: e.target.value })}
                          placeholder="Leave blank to keep current"
                          className="h-11 border-border bg-background"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="rounded-full px-8 h-11 text-sm font-semibold">
                  Update Credentials
                </Button>
              </form>
            </motion.div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border flex md:hidden">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); if (key !== "orders") setSelectedOrder(null); }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-semibold gap-1 transition-colors ${
              activeTab === key ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>

      {/* Product Add/Edit Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-2xl border border-border w-full max-w-lg overflow-hidden shadow-xl"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle size={22} />
                </button>
              </div>
              <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Product Name</label>
                  <Input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    placeholder="Classic Linen Bear"
                    className="h-11 border-border bg-background"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Price (Rs.)</label>
                    <Input
                      type="number"
                      step="1"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                      placeholder="4500"
                      className="h-11 border-border bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Stock Count</label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={productForm.stockCount}
                      onChange={(e) => setProductForm({ ...productForm, stockCount: e.target.value })}
                      required
                      placeholder="10"
                      className="h-11 border-border bg-background"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="inStock"
                        checked={productForm.inStock}
                        onChange={(e) => setProductForm({ ...productForm, inStock: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary accent-primary"
                      />
                      <label htmlFor="inStock" className="text-sm font-medium cursor-pointer">
                        In Stock
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Describe the product details..."
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Image</label>
                  <input
                    type="file"
                    ref={productImageInputRef}
                    onChange={handleProductImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-20 rounded-lg border border-border bg-muted flex items-center justify-center relative overflow-hidden flex-shrink-0">
                      {productForm.imageUrl ? (
                        <Image src={productForm.imageUrl} alt="preview" fill className="object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground text-center">No image</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => productImageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="h-10 text-xs font-semibold rounded-full border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                      >
                        {uploadingImage ? "Uploading..." : "Upload Image to Cloudinary"}
                      </Button>
                      <Input
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                        placeholder="Or enter image URL manually..."
                        className="h-9 text-xs border-border bg-background focus-visible:ring-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductModalOpen(false)}
                    className="rounded-full h-11 px-5"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-full h-11 px-6 font-semibold">
                    {editingProduct ? "Save Changes" : "Create Product"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-2xl border border-border w-full max-w-sm overflow-hidden shadow-xl"
            >
              <div className="p-6 space-y-4">
                <h3 className="font-serif font-bold text-xl text-foreground">Delete Product</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you sure you want to delete this product? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirmId(null)}
                    className="rounded-full h-11 px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (deleteConfirmId) {
                        handleDeleteProduct(deleteConfirmId);
                        setDeleteConfirmId(null);
                      }
                    }}
                    className="rounded-full h-11 px-6 font-semibold bg-red-600 hover:bg-red-700 text-white border-none"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promo Form Modal */}
      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-2xl border border-border w-full max-w-lg overflow-hidden shadow-xl my-8"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  {editingPromo ? "Edit Promo Code" : "Add New Promo Code"}
                </h3>
                <button
                  onClick={() => setIsPromoModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle size={22} />
                </button>
              </div>
              <form onSubmit={handleSavePromo} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Promo Code</label>
                    <Input
                      value={promoCodeForm.code}
                      onChange={(e) => setPromoCodeForm({ ...promoCodeForm, code: e.target.value.toUpperCase() })}
                      required
                      placeholder="LUMINA20"
                      className="h-11 border-border bg-background uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Discount Amount (Rs.)</label>
                    <Input
                      type="number"
                      step="1"
                      value={promoCodeForm.discountAmount}
                      onChange={(e) => setPromoCodeForm({ ...promoCodeForm, discountAmount: e.target.value })}
                      required
                      placeholder="500"
                      className="h-11 border-border bg-background"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Usage Limit</label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={promoCodeForm.usageLimit}
                      onChange={(e) => setPromoCodeForm({ ...promoCodeForm, usageLimit: e.target.value })}
                      required
                      placeholder="100"
                      className="h-11 border-border bg-background"
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={promoCodeForm.isActive}
                        onChange={(e) => setPromoCodeForm({ ...promoCodeForm, isActive: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary accent-primary"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                        Active
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-border mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsPromoModalOpen(false)} className="rounded-full px-6 h-11">
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-full px-8 h-11 font-semibold text-white">
                    Save Promo Code
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Promo Confirmation Modal */}
      <AnimatePresence>
        {deletePromoConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-2xl border border-border w-full max-w-sm overflow-hidden shadow-xl"
            >
              <div className="p-6 space-y-4">
                <h3 className="font-serif font-bold text-xl text-foreground">Delete Promo Code</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you sure you want to delete this promo code? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeletePromoConfirmId(null)}
                    className="rounded-full h-11 px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (deletePromoConfirmId) {
                        handleDeletePromo(deletePromoConfirmId);
                        setDeletePromoConfirmId(null);
                      }
                    }}
                    className="rounded-full h-11 px-6 font-semibold bg-red-600 hover:bg-red-700 text-white border-none"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
