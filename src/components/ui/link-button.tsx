import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface LinkButtonProps extends VariantProps<typeof buttonVariants> {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/** Button que navega como Link — Base UI Button renderiza <button> por defecto, así que se le indica explícitamente que no lo es (evita el warning "expected a native <button>"). */
export function LinkButton({ href, variant, size, className, children }: LinkButtonProps) {
  return (
    <Button
      nativeButton={false}
      variant={variant}
      size={size}
      className={className}
      render={<Link href={href} />}
    >
      {children}
    </Button>
  );
}
