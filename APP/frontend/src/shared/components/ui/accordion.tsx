import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Define the accordion variants using cva
const accordionVariants = cva(
  "w-full rounded-md border border-border bg-background shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border bg-background",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "bg-transparent text-primary-foreground hover:bg-accent",
      },
      size: {
        default: "p-4",
        sm: "p-2",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Define the item variants using cva
const accordionItemVariants = cva("w-full flex flex-col gap-2", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-white",
      outline: "border bg-background",
      secondary: "bg-secondary text-secondary-foreground",
      ghost: "bg-transparent text-primary-foreground hover:bg-accent",
    },
    size: {
      default: "p-4",
      sm: "p-2",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// Accordion component that takes size and variant props
const Accordion = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof accordionVariants> & {
    asChild?: boolean;
  }) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="accordion"
      className={cn(accordionVariants({ variant, size, className }))}
      {...props}
    />
  );
};

// Accordion Item component with size and variant props
const AccordionItem = ({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof accordionItemVariants>) => {
  return (
    <div
      className={cn(accordionItemVariants({ variant, size, className }))}
      {...props}
    />
  );
};

// Accordion Trigger component, no size, only variant
const AccordionTrigger = ({
  className,
  ...props
}: React.ComponentProps<"button">) => {
  return (
    <button
      className={cn(
        "w-full text-left bg-transparent text-primary-foreground hover:bg-accent",
        className
      )}
      {...props}
    />
  );
};

// Accordion Content component, no size, only variant
const AccordionContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("w-full text-sm bg-background text-gray-600", className)}
      {...props}
    />
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
