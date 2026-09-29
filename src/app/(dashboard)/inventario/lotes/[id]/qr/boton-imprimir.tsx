"use client";

import { Button } from "@/components/ui/button";

export function BotonImprimir() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}
