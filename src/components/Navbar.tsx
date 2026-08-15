"use client";

import Link from "next/link";
import { ShoppingBag, Phone, MapPin, Gift, List } from "@phosphor-icons/react";

interface NavbarProps {
  shopName?: string;
  cartCount?: number;
  logoUrl?: string | null;
  onCartClick?: () => void;
}

export default function Navbar({ shopName = "LuminaGifts", cartCount = 0, logoUrl = null, onCartClick }: NavbarProps) {
  const handleCartClick = (e: React.MouseEvent) => {
    if (onCartClick) {
      e.preventDefault();
      onCartClick();
    }
  };

  return (
    <header className="z-50 relative">
      {/* Utility Top Bar */}
      <div className="w-full bg-[#1A1817] text-[#E7E5E4] py-2 px-6 border-b border-[#2C2927] text-xs font-sans tracking-wide">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone size={12} weight="fill" className="text-amber-500" />
              WhatsApp Support: +94 77 123 4567
            </span>
            <span className="hidden md:inline-flex items-center gap-1 border-l border-[#3F3B38] pl-4">
              <MapPin size={12} weight="fill" className="text-amber-500" />
              Colombo, Sri Lanka
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            🚚 Safe Island-wide Courier Delivery
          </div>
        </div>
      </div>

      {/* Main Glassmorphic Header */}
      <nav className="border-b border-border bg-card/85 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-serif font-bold text-xl tracking-tight text-foreground hover:opacity-85 transition-opacity flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={shopName} className="h-8 object-contain" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Gift size={16} weight="fill" />
              </span>
            )}
            {shopName}
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">
              Shop Catalog
            </Link>
            <Link href="/track-order" className="hover:text-primary transition-colors">
              Track Order
            </Link>
            <Link href="/admin/login" className="hover:text-primary transition-colors">
              Seller Admin
            </Link>
          </div>

          {/* Cart Bag */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCartClick}
              className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer bg-card border border-border px-3.5 py-1.5 rounded-full shadow-sm"
            >
              <ShoppingBag size={18} weight="regular" />
              <span className="font-semibold">({cartCount})</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
