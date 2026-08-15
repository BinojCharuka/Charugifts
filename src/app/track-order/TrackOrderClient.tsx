"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MagnifyingGlass, Package, Sparkle } from "@phosphor-icons/react";
import Navbar from "@/components/Navbar";
import OrderStatusTracker from "@/components/OrderStatusTracker";
import { lookupOrder } from "./actions";

interface TrackOrderClientProps {
  tenant: {
    shopName: string;
  };
}

interface OrderResult {
  id: string;
  date: string;
  items: string;
  total: string;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED";
  customerName: string;
  shippingAddress: string;
  paymentStatus: "PENDING" | "VERIFIED" | "REJECTED";
}

export default function TrackOrderClient({ tenant }: TrackOrderClientProps) {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setError("");
    setResult(null);
    if (!orderId.trim() || !phone.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    setIsLoading(true);
    const res = await lookupOrder(orderId, phone);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.order) {
      setResult(res.order);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background Animated Ambient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 40, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -40, 30, 0],
            y: [0, 50, -30, 0],
            scale: [1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/5 blur-[120px]"
        />
      </div>

      <Navbar shopName={tenant.shopName} logoUrl={tenant.logoUrl} />

      <main className="max-w-2xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <Package size={24} className="text-primary" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 text-foreground">
            Track Your Order
          </h1>
          <p className="text-muted-foreground text-sm max-w-[40ch] mx-auto leading-relaxed">
            Enter your order reference ID and registered phone number to verify your shipment status.
          </p>
        </div>

        <Card className="border-border bg-card/60 backdrop-blur-md text-foreground mb-10 shadow-lg">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</label>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-XXXX"
                className="h-12 font-mono border-border bg-background/50 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="h-12 border-border bg-background/50 focus-visible:ring-1"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                <Sparkle size={12} weight="fill" />
                {error}
              </p>
            )}
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full rounded-full h-12 mt-2 font-bold text-sm bg-primary hover:bg-primary/95 text-white cursor-pointer shadow-md"
            >
              <MagnifyingGlass size={16} className="mr-2" />
              {isLoading ? "Finding Order..." : "Find Order"}
            </Button>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Status Tracker */}
              <Card className="border-border bg-card/60 backdrop-blur-md text-foreground shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">REFERENCE</p>
                      <p className="font-bold text-lg font-mono text-primary">{result.id}</p>
                    </div>
                    <span className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
                      result.paymentStatus === "VERIFIED"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : result.paymentStatus === "PENDING"
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      Payment {result.paymentStatus}
                    </span>
                  </div>
                  <OrderStatusTracker status={result.status} />
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card className="border-border bg-card/60 backdrop-blur-md text-foreground shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-serif font-bold text-xl border-b border-border pb-3">Delivery Information</h2>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Order Date</span>
                      <span className="font-semibold text-foreground">{result.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Items</span>
                      <span className="font-semibold text-foreground text-right max-w-[60%] truncate">{result.items}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">Total Amount</span>
                      <span className="font-bold text-primary text-base">Rs. {parseFloat(result.total).toLocaleString()}</span>
                    </div>
                    <div className="border-t border-border pt-4 flex justify-between items-start">
                      <span className="text-muted-foreground font-medium">Shipping Address</span>
                      <span className="font-medium text-foreground text-right max-w-[60%] leading-relaxed">{result.shippingAddress}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
