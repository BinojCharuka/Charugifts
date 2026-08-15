"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash, CheckCircle, Spinner, XCircle } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { submitOrder } from "./actions";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
}

interface Tenant {
  id: string;
  shopName: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
  logoUrl?: string | null;
}

interface CartItem {
  product: Product;
  qty: number;
  note: string;
}

interface PromoCodeData {
  id: string;
  code: string;
  discountAmount: string;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
}

interface CheckoutClientProps {
  tenant: Tenant & { contentSettings?: any };
  product: Product | null;
  promoCodes?: PromoCodeData[];
  initialQty?: number;
  initialNote?: string;
}

export default function CheckoutClient({ tenant, product, promoCodes = [], initialQty = 1, initialNote = "" }: CheckoutClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<"cart" | "details" | "payment">("cart");
  
  // Delivery Fee & Promo state
  const deliveryFee = tenant.contentSettings?.deliveryFee ? parseFloat(tenant.contentSettings.deliveryFee) : 0;
  const [paymentMethod, setPaymentMethod] = useState<"FULL_PAYMENT" | "COD">("FULL_PAYMENT");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeData | null>(null);
  const [promoError, setPromoError] = useState("");
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string>("");

  useEffect(() => {
    if (!referenceCode) {
      setReferenceCode(`LGM-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    const stored = localStorage.getItem("lumina_cart");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CartItem[];
        if (parsed.length > 0) {
          setCartItems(parsed);
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
    // Fallback: use product from props
    if (product) {
      setCartItems([
        {
          product,
          qty: initialQty,
          note: initialNote,
        }
      ]);
    }
    setIsLoaded(true);
  }, [product, initialQty, initialNote]);

  const updateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...cartItems];
    updated[index].qty = newQty;
    setCartItems(updated);
    localStorage.setItem("lumina_cart", JSON.stringify(updated));
  };

  const updateNote = (index: number, newNote: string) => {
    const updated = [...cartItems];
    updated[index].note = newNote;
    setCartItems(updated);
    localStorage.setItem("lumina_cart", JSON.stringify(updated));
  };

  const removeItem = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    if (updated.length > 0) {
      localStorage.setItem("lumina_cart", JSON.stringify(updated));
    } else {
      localStorage.removeItem("lumina_cart");
    }
  };

  const cartEmpty = cartItems.length === 0;

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  // Upload receipt state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form validation errors
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  // Order success state
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

  // Submit loading state
  const [submitting, setSubmitting] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("referenceCode", referenceCode);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setUploadedFile(file.name);
        setReceiptUrl(data.url);
      } else {
        alert(data.error || "Failed to upload receipt.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while uploading the file.");
    } finally {
      setUploading(false);
    }
  };

  // Order success screen (early return)
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 px-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-green-600" weight="fill" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Order Placed!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your order has been submitted successfully. Your Order ID is:
          </p>
          <div className="bg-card border border-border rounded-xl px-6 py-4 font-mono text-primary font-bold text-lg tracking-wider">
            {orderSuccess.orderId}
          </div>
          <p className="text-xs text-muted-foreground">Screenshot this ID to track your delivery status later.</p>
          <div className="flex gap-3 pt-2">
            <Link href="/track-order" className="flex-1">
              <Button variant="outline" className="w-full rounded-full h-12 font-semibold">Track Order</Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full rounded-full h-12 font-semibold bg-primary text-white">Shop More</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (cartEmpty) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar shopName={tenant.shopName} logoUrl={tenant.logoUrl} />
        <main className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
          <ShoppingBag size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
          <p className="text-muted-foreground text-sm">Add some items from the storefront first.</p>
          <Link href="/">
            <Button className="rounded-full px-8 h-12 mt-2">Go to Shop</Button>
          </Link>
        </main>
      </div>
    );
  }

  const subtotal = cartItems.reduce((acc, item) => {
    const priceNum = parseFloat(item.product.price);
    return acc + priceNum * item.qty;
  }, 0);

  const discountValue = appliedPromo ? parseFloat(appliedPromo.discountAmount) : 0;
  const finalTotal = Math.max(0, subtotal - discountValue) + deliveryFee;
  const bankDepositAmount = paymentMethod === "COD" ? deliveryFee : finalTotal;

  const handleApplyPromo = () => {
    setPromoError("");
    const found = promoCodes.find((p) => p.code === promoInput.toUpperCase().trim());
    if (!found) {
      setPromoError("Invalid promo code.");
      return;
    }
    if (!found.isActive || found.usedCount >= found.usageLimit) {
      setPromoError("Promo code expired or usage limit reached.");
      return;
    }
    setAppliedPromo(found);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const handleContinueToPayment = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!customerName.trim()) errors.name = "Full name is required.";
    if (!customerPhone.trim()) errors.phone = "Phone number is required.";
    if (!shippingAddress.trim()) errors.address = "Delivery address is required.";
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setStep("payment");
  };

  const handleSubmit = async () => {
    if (!customerName || !customerPhone || !shippingAddress) {
      setStep("details");
      return;
    }
    if (!receiptUrl) {
      alert("Please upload your bank deposit receipt first.");
      return;
    }

    setSubmitting(true);

    const combinedNotes = cartItems
      .filter((item) => item.note.trim())
      .map((item) => `${item.product.name}: "${item.note.trim()}"`)
      .join("\n\n");

    const res = await submitOrder({
      tenantId: tenant.id,
      customerName,
      customerPhone,
      shippingAddress,
      customNote: combinedNotes,
      totalAmount: finalTotal.toString(),
      deliveryFee: deliveryFee.toString(),
      discountAmount: discountValue.toString(),
      paymentMethod: paymentMethod,
      promoCodeId: appliedPromo?.id,
      receiptUrl,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.qty,
      })),
    });
    setSubmitting(false);

    if (res.success) {
      localStorage.removeItem("lumina_cart");
      setOrderSuccess({ orderId: res.orderId || "" });
    } else {
      alert(res.error || "Failed to submit order.");
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background Animated Ambient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 40, -20, 0],
            scale: [1, 0.96, 1.04, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-5%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-500/5 blur-[120px]"
        />
      </div>

      <Navbar shopName={tenant.shopName} logoUrl={tenant.logoUrl} />

      <main className="max-w-5xl mx-auto px-6 py-16 relative z-10">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 font-semibold">
          <ArrowLeft size={16} />
          Back to shop
        </Link>

        {/* Step Indicators */}
        <div className="flex items-center gap-4 mb-12">
          {(["cart", "details", "payment"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <div className={`flex items-center gap-2 text-sm font-semibold ${step === s ? "text-primary" : i < ["cart","details","payment"].indexOf(step) ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === s ? "border-primary bg-primary text-white" : i < ["cart","details","payment"].indexOf(step) ? "border-foreground bg-foreground text-background" : "border-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className="capitalize hidden sm:inline">{s === "cart" ? "Cart" : s === "details" ? "Shipping" : "Payment"}</span>
              </div>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-[1fr_380px] gap-10 items-start">
          {/* Left: Form Area */}
          <motion.div key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-foreground">
            {step === "cart" && (
              <div className="space-y-4">
                <h1 className="text-3xl font-serif font-bold mb-8">Your Cart</h1>
                <div className="divide-y divide-border bg-card/40 backdrop-blur-md rounded-2xl border border-border p-6 space-y-6">
                  {cartItems.map((item, idx) => {
                    const priceNum = parseFloat(item.product.price);
                    return (
                      <div key={idx} className="pt-6 first:pt-0 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                            {item.product.imageUrl ? (
                              <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                            ) : (
                              <div className="absolute inset-0 bg-muted flex items-center justify-center text-[10px]">No image</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-bold text-base text-foreground truncate">{item.product.name}</h3>
                            <p className="text-sm font-semibold text-primary">Rs. {priceNum.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateQty(idx, item.qty - 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors text-foreground cursor-pointer"><Minus size={12} /></button>
                            <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(idx, item.qty + 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors text-foreground cursor-pointer"><Plus size={12} /></button>
                          </div>
                          <button onClick={() => removeItem(idx)} className="ml-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash size={16} /></button>
                        </div>
                        <div className="pl-0 sm:pl-20">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Gift Message / Note for this item</label>
                          <textarea
                            value={item.note}
                            onChange={(e) => updateNote(idx, e.target.value)}
                            placeholder="Add custom gift ribbon message or handwritten card note here..."
                            rows={2}
                            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={() => setStep("details")} className="w-full rounded-full h-12 mt-4 font-semibold bg-primary hover:bg-primary/95 text-white cursor-pointer shadow-md">
                  Continue to Shipping
                </Button>
              </div>
            )}

            {step === "details" && (
              <div className="space-y-5">
                <h1 className="text-3xl font-serif font-bold mb-8">Shipping Details</h1>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      placeholder="Nimesha Perera"
                      value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                      className={`h-12 border-border bg-background focus-visible:ring-1 ${fieldErrors.name ? "border-red-500" : ""}`}
                    />
                    {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      placeholder="+94 77 123 4567"
                      value={customerPhone}
                      onChange={(e) => { setCustomerPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: undefined })); }}
                      className={`h-12 border-border bg-background focus-visible:ring-1 ${fieldErrors.phone ? "border-red-500" : ""}`}
                    />
                    {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Address</label>
                  <textarea
                    placeholder="No. 12, Flower Road, Colombo 03"
                    value={shippingAddress}
                    onChange={(e) => { setShippingAddress(e.target.value); setFieldErrors((p) => ({ ...p, address: undefined })); }}
                    rows={3}
                    className={`w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring transition ${fieldErrors.address ? "border-red-500" : "border-border"}`}
                  />
                  {fieldErrors.address && <p className="text-xs text-red-500">{fieldErrors.address}</p>}
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="text-sm font-medium block mb-2">Promo Code (Optional)</label>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between bg-green-50/50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
                      <span className="font-semibold flex items-center gap-2"><CheckCircle size={16} /> {appliedPromo.code} Applied (Rs. {parseFloat(appliedPromo.discountAmount).toLocaleString()} off)</span>
                      <button onClick={handleRemovePromo} className="text-muted-foreground hover:text-red-500"><XCircle size={18} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        className="h-12 border-border bg-background uppercase"
                      />
                      <Button onClick={handleApplyPromo} variant="outline" className="h-12 px-6 rounded-lg font-semibold">Apply</Button>
                    </div>
                  )}
                  {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep("cart")} className="flex-1 rounded-full h-12 font-semibold cursor-pointer">Back</Button>
                  <Button onClick={handleContinueToPayment} className="flex-1 rounded-full h-12 font-semibold bg-primary hover:bg-primary/95 text-white cursor-pointer shadow-md">Continue to Payment</Button>
                </div>
              </div>
            )}

            {step === "payment" && (
              <div className="space-y-6">
                <h1 className="text-3xl font-serif font-bold mb-8">Payment & Order Summary</h1>
                
                <div className="space-y-3 px-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">Rs. {subtotal.toLocaleString()}</span></div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm text-green-600"><span className="font-semibold">Discount ({appliedPromo?.code})</span><span className="font-bold">- Rs. {discountValue.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span className="font-semibold">Rs. {deliveryFee.toLocaleString()}</span></div>
                  <div className="flex justify-between text-base pt-3 border-t border-border"><span className="font-bold text-foreground">Total</span><span className="font-bold text-primary">Rs. {finalTotal.toLocaleString()}</span></div>
                </div>

                <div className="space-y-3 pt-6 border-t border-border">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("FULL_PAYMENT")}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-colors flex flex-col items-center justify-center gap-2 ${paymentMethod === "FULL_PAYMENT" ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                    >
                      <CheckCircle size={20} weight={paymentMethod === "FULL_PAYMENT" ? "fill" : "regular"} />
                      Full Bank Deposit
                    </button>
                    <button
                      onClick={() => setPaymentMethod("COD")}
                      className={`p-4 rounded-xl border text-sm font-semibold transition-colors flex flex-col items-center justify-center gap-2 ${paymentMethod === "COD" ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                    >
                      <CheckCircle size={20} weight={paymentMethod === "COD" ? "fill" : "regular"} />
                      Cash on Delivery
                    </button>
                  </div>
                  {paymentMethod === "COD" && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg leading-relaxed">
                      For Cash on Delivery, please deposit <strong>only the delivery fee (Rs. {deliveryFee.toLocaleString()})</strong> to confirm your order. You can pay the product total (Rs. {(finalTotal - deliveryFee).toLocaleString()}) in cash when the item is delivered.
                    </p>
                  )}
                </div>

                <Card className="border-border bg-card/60 backdrop-blur-md text-foreground shadow-lg">
                  <CardContent className="p-6 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transfer to this account</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-semibold">{tenant.bankDetails.bankName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span className="font-semibold">{tenant.bankDetails.accountName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><span className="font-mono font-semibold tracking-wider">{tenant.bankDetails.accountNumber}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="font-semibold">{tenant.bankDetails.branch}</span></div>
                    </div>
                    <div className="pt-3 border-t border-border flex justify-between items-center">
                      <span className="font-semibold text-foreground">Amount to deposit now</span>
                      <span className="text-xl font-bold text-primary">Rs. {bankDepositAmount.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 bg-yellow-50/50 p-4 rounded-xl border border-yellow-200 shadow-sm space-y-2">
                      <p className="text-xs text-yellow-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle size={16} weight="fill" />
                        Required for verification
                      </p>
                      <p className="text-sm font-medium text-yellow-900 leading-relaxed">
                        Please include this unique code in your bank transfer <strong>Remark / Reference</strong> field:
                      </p>
                      <div className="font-mono text-xl font-bold text-center bg-white border border-yellow-300 py-2 rounded-lg text-yellow-900 tracking-[0.2em] select-all shadow-inner">
                        {referenceCode}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Bank Receipt</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-card/40 transition-colors cursor-pointer bg-card/60 backdrop-blur-md"
                  >
                    {uploading ? (
                      <div className="space-y-2">
                        <Spinner size={28} className="mx-auto text-primary animate-spin" />
                        <p className="text-sm font-medium">Uploading slip receipt...</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="space-y-2">
                        <CheckCircle size={28} className="mx-auto text-green-600" weight="fill" />
                        <p className="text-sm font-semibold text-green-700">{uploadedFile}</p>
                        <p className="text-xs text-muted-foreground">Receipt uploaded successfully!</p>
                      </div>
                    ) : (
                      <>
                        <ShoppingBag size={28} className="mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Click to upload receipt</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep("details")} className="flex-1 rounded-full h-12 font-semibold cursor-pointer">Back</Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-full h-12 font-semibold bg-primary hover:bg-primary/95 text-white cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Spinner size={18} className="animate-spin" /> Submitting...
                      </span>
                    ) : "Place Order via Bank Deposit"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Order Summary */}
          <div className="sticky top-24">
            <Card className="border-border bg-card/60 backdrop-blur-md text-foreground shadow-lg">
              <CardContent className="p-6 space-y-5">
                <h2 className="font-serif font-bold text-xl border-b border-border pb-3">Order Summary</h2>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {cartItems.map((item, idx) => {
                    const itemSubtotal = parseFloat(item.product.price) * item.qty;
                    return (
                      <div key={idx} className="flex justify-between text-sm items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-muted-foreground font-medium block truncate">{item.product.name}</span>
                          <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
                        </div>
                        <span className="font-semibold text-foreground flex-shrink-0">Rs. {itemSubtotal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border pt-4 space-y-2.5">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-medium">Subtotal</span>
                    <span className="font-semibold text-foreground">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground font-medium">Discount ({appliedPromo?.code})</span>
                      <span className="text-green-600 font-bold text-sm tracking-wider">- Rs. {discountValue.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-medium">Shipping</span>
                    {deliveryFee > 0 ? (
                      <span className="font-semibold text-foreground">Rs. {deliveryFee.toLocaleString()}</span>
                    ) : (
                      <span className="text-green-600 font-bold uppercase text-xs tracking-wider">Free</span>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-4 flex justify-between font-bold text-base items-center">
                  <span>Total</span>
                  <span className="text-primary text-lg">Rs. {finalTotal.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
