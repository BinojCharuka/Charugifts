"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  ArrowRight,
  CheckCircle,
  X,
  Sparkle,
  Plus,
  Minus,
  Trash,
  Gift,
  MagnifyingGlass,
  SlidersHorizontal,
  SquaresFour,
  GridFour,
  List,
  Star,
  Phone,
  EnvelopeSimple,
  ArrowsCounterClockwise,
  MapPin,
  Package
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  inStock: boolean;
  stockCount: number;
  imageUrl: string | null;
  isGiftBox?: boolean;
  boxItems?: Array<{ name: string; imageUrl: string | null }> | null;
}

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

interface Tenant {
  shopName: string;
  domainPrefix: string;
  logoUrl: string | null;
  contentSettings: ContentSettings | null;
}

interface StorefrontClientProps {
  tenant: Tenant;
  products: Product[];
}

export default function StorefrontClient({ tenant, products }: StorefrontClientProps) {
  // Merge admin-saved content with hardcoded defaults
  const c: ContentSettings = {
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
    ...( tenant.contentSettings ?? {} ),
  };

  // Cart state
  const [cart, setCart] = useState<{ product: Product; qty: number; note: string }[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [viewingBoxContents, setViewingBoxContents] = useState<Product | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("lumina_cart");
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
    setIsCartLoaded(true);
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!isCartLoaded) return;
    if (cart.length > 0) {
      localStorage.setItem("lumina_cart", JSON.stringify(cart));
    } else {
      localStorage.removeItem("lumina_cart");
    }
  }, [cart, isCartLoaded]);

  // Hero Slider states & logic
  const [currentSlide, setCurrentSlide] = useState(0);
  const slidesList = useMemo(() => {
    return c.slides && c.slides.length > 0 ? c.slides : [
      {
        badge: c.heroBadge,
        heading: c.heroHeading,
        description: c.heroSubtext,
        price: "",
        buttonText: c.heroPrimaryBtn,
        imageUrl: c.heroImageUrl || "https://picsum.photos/seed/gift-hero-premium/800/1000",
        tagText: c.heroTagText,
      }
    ];
  }, [c]);

  useEffect(() => {
    if (slidesList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesList.length);
    }, 10000); // 10 seconds auto-switch
    return () => clearInterval(interval);
  }, [slidesList.length]);

  const handleSlideOrder = (slideHeading: string) => {
    // Find a product that matches the slide heading (fuzzy name matching)
    const matchedProduct = products.find((p) =>
      p.name.toLowerCase().includes(slideHeading.toLowerCase()) ||
      slideHeading.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matchedProduct) {
      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === matchedProduct.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === matchedProduct.id ? { ...item, qty: item.qty + 1 } : item
          );
        }
        return [...prev, { product: matchedProduct, qty: 1, note: "" }];
      });
      setIsCartOpen(true);
    } else {
      // Scroll to catalog section if no direct match
      const el = document.getElementById("catalog-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Quiz state
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState({
    recipient: "",
    occasion: "",
    vibe: "",
  });
  const [quizResult, setQuizResult] = useState<Product | null>(null);

  // Shop filters & layout state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [layoutMode, setLayoutMode] = useState<"grid-3" | "grid-4" | "list">("grid-3");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Helper function to dynamically categorize products based on name & description
  const getProductCategory = (p: Product): string => {
    const name = p.name.toLowerCase();
    const desc = (p.description || "").toLowerCase();
    if (name.includes("box") || desc.includes("box")) return "gift-boxes";
    if (name.includes("bear") || desc.includes("bear")) return "teddy-bears";
    if (name.includes("blanket") || desc.includes("blanket") || name.includes("accessory") || desc.includes("accessory")) return "accessories";
    return "others";
  };

  // Get total count of cart items
  const totalCartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  // Category listing options with labels
  const categories = [
    { id: "all", label: "All Collections" },
    { id: "gift-boxes", label: "Luxury Gift Boxes" },
    { id: "teddy-bears", label: "Handcrafted Bears" },
    { id: "accessories", label: "Blankets & Extras" },
  ];

  // Dynamic products filtering & sorting logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((p) => getProductCategory(p) === selectedCategory);
    }

    // Search filter
    if (searchText.trim() !== "") {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    // Price filter
    result = result.filter((p) => parseFloat(p.price) <= maxPrice);

    // Stock filter
    if (inStockOnly) {
      result = result.filter((p) => p.inStock && p.stockCount > 0);
    }

    // Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, selectedCategory, searchText, maxPrice, inStockOnly, sortBy]);

  // Count items per category (for sidebar stats)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
      "gift-boxes": 0,
      "teddy-bears": 0,
      accessories: 0,
      others: 0,
    };
    products.forEach((p) => {
      const cat = getProductCategory(p);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.others++;
      }
    });
    return counts;
  }, [products]);

  // Is any filter customized?
  const isFiltersCustomized = useMemo(() => {
    return (
      selectedCategory !== "all" ||
      searchText !== "" ||
      maxPrice < 15000 ||
      inStockOnly
    );
  }, [selectedCategory, searchText, maxPrice, inStockOnly]);

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSearchText("");
    setMaxPrice(15000);
    setInStockOnly(false);
    setSortBy("featured");
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, note: "" }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const handleUpdateNote = (productId: string, text: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, note: text } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Gift Match Quiz logic
  const handleStartQuiz = () => {
    setQuizStep(1);
    setQuizAnswers({ recipient: "", occasion: "", vibe: "" });
    setQuizResult(null);
    setIsQuizOpen(true);
  };

  const handleQuizSelect = (key: string, value: string) => {
    const nextAnswers = { ...quizAnswers, [key]: value };
    setQuizAnswers(nextAnswers);

    if (quizStep < 3) {
      setQuizStep(quizStep + 1);
    } else {
      // Find matching product
      let matched = products[0] || null;
      let highestScore = -1;

      products.forEach((p) => {
        let score = 0;
        const name = p.name.toLowerCase();
        const desc = (p.description || "").toLowerCase();

        // Recipient matching
        if (nextAnswers.recipient === "kids" && (name.includes("bear") || desc.includes("baby") || desc.includes("kid"))) score += 3;
        if (nextAnswers.recipient === "partner" && (name.includes("rose") || desc.includes("luxury") || name.includes("celebration"))) score += 3;
        if (nextAnswers.recipient === "friends" && (name.includes("box") || desc.includes("gift") || desc.includes("sharing"))) score += 2;

        // Occasion matching
        if (nextAnswers.occasion === "birthday" && (name.includes("celebration") || desc.includes("party"))) score += 2;
        if (nextAnswers.occasion === "baby_shower" && (name.includes("bear") || desc.includes("baby") || desc.includes("infant"))) score += 3;

        // Vibe matching
        if (nextAnswers.vibe === "cute" && (name.includes("bear") || desc.includes("soft") || desc.includes("cuddly"))) score += 2;
        if (nextAnswers.vibe === "luxury" && (name.includes("box") || desc.includes("premium") || desc.includes("elegant"))) score += 2;

        if (score > highestScore) {
          highestScore = score;
          matched = p;
        }
      });

      setQuizResult(matched);
      setQuizStep(4);
    }
  };

  const checkoutUrl = () => {
    return "/checkout";
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* 1. UTILITY ANNOUNCEMENT BAR (Inspired by Petti.lk & Giftboxlanka.lk) */}
      <div className="w-full bg-[#1A1817] text-[#E7E5E4] py-2 px-6 border-b border-[#2C2927] text-xs font-sans tracking-wide z-50 relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <span className="flex items-center gap-1">
              <Phone size={12} weight="fill" className="text-amber-500" />
              WhatsApp Support: {c.whatsapp}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 border-l border-[#3F3B38] pl-4">
              <MapPin size={12} weight="fill" className="text-amber-500" />
              {c.location}
            </span>
          </div>
          <div className="flex items-center gap-5 text-center">
            <span className="text-amber-400 font-semibold uppercase tracking-wider text-[10px]">
              {c.announcementText}
            </span>
            <div className="flex items-center gap-3 border-l border-[#3F3B38] pl-4">
              <Link href="/track-order" className="hover:text-amber-400 transition-colors font-medium">
                Track Order
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DUAL NAVBAR HEADER */}
      <header className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        {/* Upper Row: Brand & Search bar */}
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="font-serif font-bold text-2xl tracking-tight text-foreground hover:opacity-85 transition-opacity flex-shrink-0 flex items-center gap-2">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.shopName} className="h-9 object-contain" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Gift size={20} weight="fill" />
              </span>
            )}
            {tenant.shopName}
          </Link>

          {/* Search bar (Center) */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
              <MagnifyingGlass size={18} />
            </span>
            <input
              type="text"
              placeholder="Search premium gift boxes, teddy bears..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* User actions */}
          <div className="flex items-center gap-4">


            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer bg-card border border-border px-4 py-2 rounded-full shadow-sm"
            >
              <div className="relative">
                <ShoppingBag size={20} weight="regular" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-card">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Bag</span>
            </button>
            <ThemeToggle />
          </div>
        </div>


      </header>

      {/* Background Ambient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -60, 50, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[5%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-amber-500/5 blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 40, 0],
            y: [0, 70, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[20%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[140px]"
        />
      </div>

      <main className="pb-24 relative z-10 font-sans">
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-24 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              {/* LHS - Dynamic text description & Price */}
              <div className="flex flex-col items-start animate-fadeIn">
                <span className="text-xs uppercase tracking-widest text-[#B45309] mb-6 font-bold flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3.5 py-1.5 rounded-full border border-amber-200/50">
                  <Sparkle size={12} weight="fill" />
                  {slidesList[currentSlide].badge}
                </span>
                
                <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.15] mb-4">
                  {slidesList[currentSlide].heading}
                </h1>

                {slidesList[currentSlide].price && (
                  <div className="text-2xl font-bold text-[#B45309] mb-4 font-serif">
                    LKR {Number(slidesList[currentSlide].price.replace(/,/g, "")).toLocaleString("en-LK")}
                  </div>
                )}

                <p className="text-lg text-muted-foreground max-w-[45ch] mb-8 leading-relaxed font-medium">
                  {slidesList[currentSlide].description}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Button 
                    onClick={() => handleSlideOrder(slidesList[currentSlide].heading)} 
                    size="lg" 
                    className="rounded-full px-8 h-12 text-sm shadow-md gap-2 bg-primary hover:bg-primary/95 text-white font-bold cursor-pointer transition-transform hover:scale-[1.02]"
                  >
                    <ShoppingBag size={18} />
                    {slidesList[currentSlide].buttonText}
                  </Button>

                </div>
              </div>

              {/* RHS - Dynamic image & gold tag overlay */}
              <div className="relative w-full h-[350px] sm:h-[480px] md:h-[550px] flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative max-w-full max-h-full flex items-center justify-center filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
                >
                  <img
                    src={slidesList[currentSlide].imageUrl}
                    alt={slidesList[currentSlide].heading}
                    className="max-w-full max-h-[350px] sm:max-h-[480px] md:max-h-[550px] w-auto h-auto rounded-3xl object-contain transition-transform duration-500 hover:scale-[1.03]"
                  />
                  {slidesList[currentSlide].tagText && (
                    <div className="absolute top-4 left-4 bg-[#1A1817]/95 border border-[#3F3B38] backdrop-blur-sm text-amber-400 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full shadow-lg z-20">
                      {slidesList[currentSlide].tagText}
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator Overlay */}
          {slidesList.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {slidesList.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === idx 
                      ? "bg-primary w-6" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* 3. CORE CATALOGUE SECTION (Sidebar + Products Grid) */}
        <section id="catalog-section" className="max-w-7xl mx-auto px-6 border-t border-border/80 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
            
            {/* LEFT COLUMN: FILTERS SIDEBAR (Inspired by Petti.lk layout) */}
            <aside className="lg:sticky lg:top-28 space-y-6 z-20">
              {/* Mobile Filter Toggle Header */}
              <div className="lg:hidden flex items-center justify-between border border-border bg-card p-4 rounded-xl shadow-sm">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-primary" />
                  Filter Collection
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  className="rounded-full text-xs font-semibold"
                >
                  {mobileFiltersOpen ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>

              {/* Sidebar Content Container (collapsible on mobile) */}
              <div className={`${mobileFiltersOpen ? "block" : "hidden"} lg:block space-y-6`}>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="font-serif font-bold text-xl text-foreground flex items-center gap-2">
                      <SlidersHorizontal size={18} className="text-primary" />
                      Filter Collection
                    </h3>
                    {isFiltersCustomized && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowsCounterClockwise size={12} />
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Search input widget (within sidebar) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search keywords</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                        <MagnifyingGlass size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search product..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full h-10 pl-9 pr-8 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                      />
                      {searchText && (
                        <button
                          onClick={() => setSearchText("")}
                          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Filter Widget */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shop categories</label>
                    <div className="space-y-1.5 flex flex-col">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            selectedCategory === cat.id
                              ? "bg-primary/5 text-primary border-l-2 border-primary"
                              : "hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className="text-[10px] bg-muted dark:bg-zinc-800 text-muted-foreground px-2 py-0.5 rounded-full font-bold">
                            {categoryCounts[cat.id] ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Widget */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Budget</label>
                      <span className="text-xs font-bold text-primary">Rs. {maxPrice.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0"
                        max="15000"
                        step="500"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                        <span>Rs. 0</span>
                        <span>Rs. 7,500</span>
                        <span>Rs. 15,000+</span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Toggle Widget */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Availability</label>
                    <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded border-border accent-primary cursor-pointer w-4 h-4"
                      />
                      Show In-Stock Only
                    </label>
                  </div>
                </div>

                {/* Secure Payment details note card */}
                <div className="bg-[#FAF8F5] dark:bg-amber-950/10 border border-amber-200/50 p-5 rounded-2xl space-y-3 text-xs text-amber-900 dark:text-amber-200/90 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                    <CheckCircle size={16} className="text-amber-600" weight="fill" />
                    How to Purchase?
                  </div>
                  <p className="leading-relaxed font-medium">
                    Select your box/bear, add a personalized custom note inside the bag drawer, fill in your delivery details, and transfer payment via Bank Deposit / Internet Banking. Upload the slip to submit.
                  </p>
                </div>
              </div>
            </aside>

            {/* RIGHT COLUMN: MAIN PRODUCTS AREA */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* CATALOG HEADER & TOOLBAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
                <div>
                  {/* Breadcrumb path */}
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span>Shop</span>
                    <span>/</span>
                    <span className="text-primary">
                      {categories.find((c) => c.id === selectedCategory)?.label || "Catalog"}
                    </span>
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-foreground">
                    {categories.find((c) => c.id === selectedCategory)?.label || "All Collections"}
                  </h2>
                </div>

                {/* Toolbar controls */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Sort By:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-9 border border-border bg-card text-foreground rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name-asc">Name: A to Z</option>
                    </select>
                  </div>

                  {/* Grid layout toggles */}
                  <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
                    <button
                      onClick={() => setLayoutMode("grid-3")}
                      title="3 Columns Grid"
                      className={`p-2 transition ${
                        layoutMode === "grid-3" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <SquaresFour size={16} weight="bold" />
                    </button>
                    <button
                      onClick={() => setLayoutMode("grid-4")}
                      title="4 Columns Grid"
                      className={`p-2 border-l border-r border-border transition ${
                        layoutMode === "grid-4" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <GridFour size={16} weight="bold" />
                    </button>
                    <button
                      onClick={() => setLayoutMode("list")}
                      title="List Layout"
                      className={`p-2 transition ${
                        layoutMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <List size={16} weight="bold" />
                    </button>
                  </div>
                  <span className="text-muted-foreground font-medium pl-1">{filteredProducts.length} items found</span>
                </div>
              </div>

              {/* ACTIVE FILTER BADGES BAR */}
              {isFiltersCustomized && (
                <div className="flex flex-wrap items-center gap-2.5 bg-muted/30 border border-border p-3.5 rounded-xl text-xs font-semibold">
                  <span className="text-muted-foreground font-medium">Active Filters:</span>
                  {selectedCategory !== "all" && (
                    <span className="inline-flex items-center gap-1 bg-card text-foreground border border-border px-2.5 py-1 rounded-full text-[10px] font-bold">
                      Category: {categories.find((c) => c.id === selectedCategory)?.label}
                      <button onClick={() => setSelectedCategory("all")} className="hover:text-primary"><X size={10} /></button>
                    </span>
                  )}
                  {searchText !== "" && (
                    <span className="inline-flex items-center gap-1 bg-card text-foreground border border-border px-2.5 py-1 rounded-full text-[10px] font-bold">
                      Query: "{searchText}"
                      <button onClick={() => setSearchText("")} className="hover:text-primary"><X size={10} /></button>
                    </span>
                  )}
                  {maxPrice < 15000 && (
                    <span className="inline-flex items-center gap-1 bg-card text-foreground border border-border px-2.5 py-1 rounded-full text-[10px] font-bold">
                      Under: Rs. {maxPrice.toLocaleString()}
                      <button onClick={() => setMaxPrice(15000)} className="hover:text-primary"><X size={10} /></button>
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="inline-flex items-center gap-1 bg-card text-foreground border border-border px-2.5 py-1 rounded-full text-[10px] font-bold">
                      In Stock Only
                      <button onClick={() => setInStockOnly(false)} className="hover:text-primary"><X size={10} /></button>
                    </span>
                  )}
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-amber-800 hover:text-amber-900 border-l border-border pl-3 ml-1 cursor-pointer font-bold flex items-center gap-1"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* EMPTY PRODUCTS FALLBACK */}
              {filteredProducts.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-3xl p-16 text-center space-y-4 bg-card/40">
                  <ShoppingBag size={48} className="mx-auto text-muted-foreground/60" />
                  <h4 className="text-lg font-serif font-bold text-foreground">No matches found</h4>
                  <p className="text-xs text-muted-foreground max-w-[32ch] mx-auto leading-relaxed">
                    Try clearing search inputs or resetting layout filters to explore our full collection of gifts.
                  </p>
                  <Button onClick={handleResetFilters} size="sm" className="rounded-full px-5 text-xs">
                    Reset Filter Controls
                  </Button>
                </div>
              ) : (
                /* PRODUCTS RENDER */
                <div
                  className={
                    layoutMode === "grid-4"
                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                      : layoutMode === "list"
                      ? "grid grid-cols-1 gap-6"
                      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                  }
                >
                  {filteredProducts.map((product, i) => {
                    const isBox = getProductCategory(product) === "gift-boxes";
                    const isAvailable = product.inStock && product.stockCount > 0;
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                        className={`group border border-border bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                          layoutMode === "list" ? "flex flex-col sm:flex-row gap-6 p-4" : ""
                        }`}
                      >
                        {/* Image area */}
                        <div
                          className={`relative bg-[#F9F9F9] border-b border-border overflow-hidden flex-shrink-0 ${
                            layoutMode === "list"
                              ? "w-full sm:w-44 aspect-[4/5] rounded-xl border"
                              : "aspect-[4/5] w-full"
                          }`}
                        >
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted font-bold">
                              No Product Image
                            </div>
                          )}

                          {/* Corner Badges */}
                          <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5">
                            {isAvailable ? (
                              <span className="bg-emerald-500/90 text-white font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                In Stock
                              </span>
                            ) : (
                              <span className="bg-red-500/95 text-white font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                Out of Stock
                              </span>
                            )}
                            {isBox && (
                              <span className="bg-amber-500/95 text-white font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                Gift Set
                              </span>
                            )}
                          </div>

                          {/* Hover action slide-up buttons */}
                          {layoutMode !== "list" && (
                            <div className="absolute inset-0 bg-[#1A1817]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                              <div className="w-full flex gap-2 translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                                <Button
                                  onClick={() => handleAddToCart(product)}
                                  disabled={!isAvailable}
                                  size="sm"
                                  className="flex-1 rounded-full shadow-lg h-9 font-bold bg-primary hover:bg-primary/95 text-white text-xs cursor-pointer"
                                >
                                  <Plus size={14} className="mr-1" />
                                  Add to Bag
                                </Button>
                                <Link href={`/checkout?product=${product.id}`} className="flex-1">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={!isAvailable}
                                    className="w-full rounded-full shadow-lg h-9 font-bold text-xs border border-border bg-card hover:bg-muted text-foreground cursor-pointer"
                                  >
                                    Buy Now
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Details area */}
                        <div className={`p-5 flex-1 flex flex-col justify-between ${layoutMode === "list" ? "pt-2 pb-2 pl-0 pr-2" : ""}`}>
                          <div className="space-y-2">
                            {/* SKU & Star ratings */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                              <span>SKU: LMG-{product.id.slice(0, 4).toUpperCase()}</span>
                              <div className="flex items-center text-amber-500 gap-0.5">
                                <Star size={10} weight="fill" />
                                <Star size={10} weight="fill" />
                                <Star size={10} weight="fill" />
                                <Star size={10} weight="fill" />
                                <Star size={10} weight="fill" />
                                <span className="text-[8px] text-muted-foreground font-bold ml-1">5.0</span>
                              </div>
                            </div>

                            {/* Product Title */}
                            <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-1">
                              {product.name}
                            </h3>

                            {/* Description */}
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                                {product.description}
                              </p>
                            )}
                            
                            {/* Gift Box Contents Button */}
                            {product.isGiftBox && product.boxItems && product.boxItems.length > 0 && (
                              <div className="pt-2">
                                <button
                                  onClick={() => setViewingBoxContents(product)}
                                  className="text-[11px] font-bold text-primary hover:text-primary-foreground border border-primary hover:bg-primary px-3 py-1 rounded-full transition cursor-pointer flex items-center gap-1 w-full justify-center"
                                >
                                  <Package size={12} />
                                  What&apos;s inside?
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Price & Action Button (persistent/list style) */}
                          <div className="pt-4 flex items-center justify-between border-t border-border/60 mt-4">
                            <span className="text-base font-bold text-primary">
                              Rs. {parseFloat(product.price).toLocaleString()}
                            </span>
                            
                            {(layoutMode === "list" || !isAvailable) ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAddToCart(product)}
                                  disabled={!isAvailable}
                                  size="sm"
                                  className="rounded-full font-bold bg-primary hover:bg-primary/95 text-white text-xs cursor-pointer h-8 px-4"
                                >
                                  Add to Bag
                                </Button>
                                <Link href={`/checkout?product=${product.id}`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!isAvailable}
                                    className="rounded-full font-bold text-xs cursor-pointer h-8 px-4"
                                  >
                                    Buy Now
                                  </Button>
                                </Link>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(product)}
                                className="text-xs font-bold text-primary hover:text-primary-foreground border border-primary hover:bg-primary px-3 py-1.5 rounded-full transition cursor-pointer flex items-center gap-1"
                              >
                                <Plus size={12} />
                                Quick Add
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="border-t border-border bg-[#1A1817] text-[#E7E5E4] pt-16 pb-12 font-sans relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 border-b border-[#2C2927] pb-12 mb-12">
          {/* Logo & Slogan */}
          <div className="space-y-4 md:col-span-2">
            <span className="font-serif font-bold text-3xl tracking-tight text-white block">
              {tenant.shopName}
            </span>
            <p className="text-xs text-[#A8A29E] max-w-[35ch] leading-relaxed font-medium">
              {c.footerTagline}
            </p>
            <div className="flex items-center gap-3 text-xs pt-2">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <CheckCircle size={14} weight="fill" />
                Trusted by 2,000+ Customers
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Client Portal</h4>
            <ul className="space-y-2 text-xs text-[#A8A29E] font-semibold">
              <li>
                <Link href="/track-order" className="hover:text-amber-400 transition-colors">
                  Track Your Delivery
                </Link>
              </li>
              <li>
                <button onClick={handleStartQuiz} className="hover:text-amber-400 transition-colors text-left cursor-pointer bg-transparent border-0 p-0 font-semibold">
                  Interactive Gift Quiz
                </button>
              </li>
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">
                  Product Catalog
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Get in touch</h4>
            <ul className="space-y-2.5 text-xs text-[#A8A29E] font-medium">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-amber-500" />
                <span>{c.footerPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <EnvelopeSimple size={14} className="text-amber-500" />
                <span>{c.footerEmail}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-amber-500" />
                <span>{c.footerAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[#78716C] font-semibold">
          <span>&copy; 2026 {tenant.shopName} Lanka. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="text-[#3F3B38]">
              Designed by <a href="https://charudesignstudio.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Charu Design studio</a>
            </span>
          </div>
        </div>
      </footer>

      {/* 5. SLIDING CART DRAWER (Enhanced with gift messaging) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-border flex items-center justify-between text-foreground">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={22} className="text-primary" />
                  <h2 className="font-serif font-bold text-xl">Your Gift Bag</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <ShoppingBag size={48} className="text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground font-medium">Your gift bag is empty</p>
                    <Button onClick={() => setIsCartOpen(false)} className="rounded-full px-6 text-xs h-9 font-bold">
                      Browse Collection
                    </Button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 border-b border-border pb-6 last:border-b-0">
                      <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                        {item.product.imageUrl ? (
                          <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-bold">No image</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif font-bold text-base text-foreground truncate">{item.product.name}</h4>
                          <span className="text-sm font-semibold text-primary">Rs. {(parseFloat(item.product.price) * item.qty).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQty(item.product.id, -1)}
                              className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-foreground cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold w-4 text-center text-foreground">{item.qty}</span>
                            <button
                              onClick={() => handleUpdateQty(item.product.id, 1)}
                              className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-foreground cursor-pointer"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <textarea
                          placeholder="Add custom gift ribbon message or handwritten card note here..."
                          value={item.note}
                          onChange={(e) => handleUpdateNote(item.product.id, e.target.value)}
                          rows={2.5}
                          className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary transition"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-border space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm font-bold text-muted-foreground">Total (excluding delivery)</span>
                    <span className="text-xl font-bold text-primary">
                      Rs. {cart.reduce((acc, item) => acc + parseFloat(item.product.price) * item.qty, 0).toLocaleString()}
                    </span>
                  </div>
                  <Link href={checkoutUrl()}>
                    <Button className="w-full rounded-full h-12 font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-md">
                      <ShoppingBag size={18} />
                      Checkout (Bank Deposit)
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. GIFT FINDER QUIZ DIALOG */}
      <AnimatePresence>
        {isQuizOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card text-foreground rounded-3xl border border-border w-full max-w-lg overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2 text-primary">
                  <Gift size={20} weight="fill" />
                  <h3 className="font-serif font-bold text-lg">Interactive Gift Finder</h3>
                </div>
                <button
                  onClick={() => setIsQuizOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress */}
              {quizStep <= 3 && (
                <div className="h-1 bg-muted w-full">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(quizStep / 3) * 100}%` }}
                  />
                </div>
              )}

              {/* Step Contents */}
              <div className="p-6">
                {quizStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-xl text-center">Who is this gift for?</h4>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { key: "kids", label: "Kids & Newborns", emoji: "🧸" },
                        { key: "partner", label: "Partner / Lover", emoji: "💖" },
                        { key: "friends", label: "Friends & Coworkers", emoji: "🤝" },
                        { key: "family", label: "Family Members", emoji: "🏡" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleQuizSelect("recipient", item.key)}
                          className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center gap-2 font-bold text-xs cursor-pointer bg-card"
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizStep === 2 && (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-xl text-center">What is the occasion?</h4>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { key: "birthday", label: "Birthday Party", emoji: "🎂" },
                        { key: "anniversary", label: "Anniversary", emoji: "💍" },
                        { key: "baby_shower", label: "Baby Shower", emoji: "🍼" },
                        { key: "thanks", label: "Just to Say Thanks", emoji: "✨" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleQuizSelect("occasion", item.key)}
                          className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center gap-2 font-bold text-xs cursor-pointer bg-card"
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizStep === 3 && (
                  <div className="space-y-4">
                    <h4 className="font-serif font-bold text-xl text-center">Select their style / vibe</h4>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {[
                        { key: "cute", label: "Cute & Cosy", emoji: "🧸" },
                        { key: "luxury", label: "Luxury & Elegant", emoji: "🎁" },
                        { key: "natural", label: "Minimalist & Natural", emoji: "🍃" },
                        { key: "simple", label: "Simple & Classic", emoji: "✨" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => handleQuizSelect("vibe", item.key)}
                          className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center gap-2 font-bold text-xs cursor-pointer bg-card"
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizStep === 4 && quizResult && (
                  <div className="space-y-5 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold mb-2">
                      <Sparkle size={12} weight="fill" />
                      98% MATCH FOUND
                    </div>
                    <h4 className="font-serif font-bold text-2xl">We recommend the:</h4>
                    
                    <div className="relative w-36 h-44 mx-auto rounded-xl overflow-hidden bg-muted border border-border shadow-md">
                      {quizResult.imageUrl ? (
                        <Image src={quizResult.imageUrl} alt={quizResult.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">No image</div>
                      )}
                    </div>
                    <div>
                      <h5 className="font-serif font-bold text-xl">{quizResult.name}</h5>
                      <p className="text-sm font-bold text-primary mt-1">Rs. {parseFloat(quizResult.price).toLocaleString()}</p>
                      {quizResult.description && (
                        <p className="text-xs text-muted-foreground max-w-[32ch] mx-auto mt-2 leading-relaxed italic font-medium">
                          "{quizResult.description}"
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartQuiz}
                        className="rounded-full h-11 px-5 text-xs font-bold cursor-pointer"
                      >
                        Retake Quiz
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          handleAddToCart(quizResult);
                          setIsQuizOpen(false);
                        }}
                        className="rounded-full h-11 px-6 font-bold bg-primary hover:bg-primary/95 text-white text-xs cursor-pointer"
                      >
                        Add to Bag & View Cart
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gift Box Contents Modal */}
      <AnimatePresence>
        {viewingBoxContents && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingBoxContents(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-card rounded-3xl border border-border shadow-2xl z-[60] flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border flex items-center justify-between text-foreground bg-card/80 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h3 className="font-serif font-bold text-xl">
                    Inside {viewingBoxContents.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    A collection of {viewingBoxContents.boxItems?.length} curated items
                  </p>
                </div>
                <button
                  onClick={() => setViewingBoxContents(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {viewingBoxContents.boxItems?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl border border-border bg-muted/20 hover:border-primary/40 transition-colors group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted relative flex-shrink-0 border border-border shadow-sm">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground text-sm">{item.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-border bg-muted/30">
                <Button
                  onClick={() => {
                    handleAddToCart(viewingBoxContents);
                    setViewingBoxContents(null);
                  }}
                  disabled={!viewingBoxContents.inStock || viewingBoxContents.stockCount <= 0}
                  className="w-full rounded-full font-bold h-12 text-sm shadow-md bg-primary hover:bg-primary/95 text-white"
                >
                  Add Box to Cart - Rs. {parseFloat(viewingBoxContents.price).toLocaleString()}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
