import * as React from "react";
import { Input } from "@/components/ui/input";

/** Input numérico con teclado decimal en móvil (sección 9: captura con una mano). */
export const NumericInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, "type">
>(function NumericInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...props}
    />
  );
});
