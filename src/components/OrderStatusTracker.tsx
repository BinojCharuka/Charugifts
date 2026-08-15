import { CheckCircle, Truck, Package, Clock } from "@phosphor-icons/react/dist/ssr";

const statusSteps = [
  { key: "PENDING",     label: "Order Placed",      icon: Clock },
  { key: "PROCESSING",  label: "Processing",        icon: Package },
  { key: "SHIPPED",     label: "Shipped",           icon: Truck },
  { key: "DELIVERED",   label: "Delivered",         icon: CheckCircle },
];

type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export default function OrderStatusTracker({ status }: OrderStatusBadgeProps) {
  const currentIndex = statusSteps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-start justify-between w-full">
      {statusSteps.map((step, i) => {
        const Icon = step.icon;
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex flex-col items-center flex-1 relative">
            {i !== 0 && (
              <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2
                ${isPast || isCurrent ? "bg-primary" : "bg-border"}`}
              />
            )}
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
              ${isCurrent ? "border-primary bg-primary text-primary-foreground"
              : isPast ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"}`}
            >
              <Icon size={16} weight={isPast || isCurrent ? "bold" : "regular"} />
            </div>
            <span className={`mt-2 text-xs font-medium text-center
              ${isCurrent ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
