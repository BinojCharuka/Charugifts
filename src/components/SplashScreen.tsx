"use client";

import { motion } from "motion/react";
import { Gift } from "@phosphor-icons/react";

interface SplashScreenProps {
  shopName: string;
  logoUrl: string | null;
}

export function SplashScreen({ shopName, logoUrl }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo and Name */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={shopName} className="h-16 object-contain" />
          ) : (
            <span className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Gift size={32} weight="fill" />
            </span>
          )}
          <h1 className="font-serif font-bold text-3xl tracking-tight">
            {shopName}
          </h1>
        </motion.div>

        {/* Fluid Loading Animation */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2.5 h-2.5 rounded-full bg-primary"
              />
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold"
          >
            Loading experience
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
