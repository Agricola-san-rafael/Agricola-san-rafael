import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  id?: string;
}

/**
 * Wrapper sobre el Select de shadcn/Base UI: Select.Value por defecto muestra
 * el value crudo (ej. "credito"), no el label del item seleccionado — este
 * componente resuelve el label a partir de `options` para evitar repetir esa
 * lógica en cada formulario del sistema.
 */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder = "Selecciona una opción",
  id,
}: SelectFieldProps) {
  const labelsByValue = Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onValueChange(v == null || v === "" ? undefined : String(v))}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder}>
          {(v: string | null) => (v ? (labelsByValue[v] ?? v) : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
