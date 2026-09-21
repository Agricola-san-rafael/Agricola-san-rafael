import { describe, expect, it } from "vitest";
import { copiasAEliminar, ejecutarRespaldoNeon, nombreDeCopia, type RamaNeon } from "./neon";

const rama = (name: string, extra: Partial<RamaNeon> = {}): RamaNeon => ({ id: `br-${name}`, name, ...extra });

describe("nombreDeCopia", () => {
  it("usa la fecha en el nombre", () => {
    expect(nombreDeCopia(new Date("2026-09-22T06:00:00Z"))).toBe("respaldo-2026-09-22");
  });
});

describe("copiasAEliminar", () => {
  const principal = rama("production", { default: true });
  it("no borra nada mientras haya pocas copias", () => {
    expect(copiasAEliminar([principal, rama("respaldo-2026-09-20")], 7)).toEqual([]);
  });
  it("borra las más antiguas cuando pasa el máximo y nunca la principal ni ramas ajenas", () => {
    const ramas = [
      principal,
      rama("desarrollo"),
      ...["01", "02", "03", "04"].map((d) => rama(`respaldo-2026-09-${d}`)),
    ];
    expect(copiasAEliminar(ramas, 2).map((r) => r.name)).toEqual(["respaldo-2026-09-01", "respaldo-2026-09-02"]);
  });
});

describe("ejecutarRespaldoNeon", () => {
  function fetchSimulado(inicial: RamaNeon[]) {
    const ramas = [...inicial];
    const llamadas: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      llamadas.push(`${metodo} ${url.replace("https://console.neon.tech/api/v2", "")}`);
      if (metodo === "POST") {
        const { branch } = JSON.parse(String(init?.body));
        ramas.push({ id: `br-${branch.name}`, name: branch.name });
        return new Response(JSON.stringify({ branch }), { status: 201 });
      }
      if (metodo === "DELETE") {
        const id = url.split("/").pop()!;
        ramas.splice(ramas.findIndex((r) => r.id === id), 1);
        return new Response("{}", { status: 200 });
      }
      return new Response(JSON.stringify({ branches: ramas }), { status: 200 });
    }) as unknown as typeof fetch;
    return { fetchFn, llamadas, ramas };
  }

  it("crea la copia del día y borra las que sobran", async () => {
    const s = fetchSimulado([
      rama("production", { default: true }),
      rama("respaldo-2026-09-01"), rama("respaldo-2026-09-02"), rama("respaldo-2026-09-03"),
    ]);
    const r = await ejecutarRespaldoNeon({ apiKey: "k", projectId: "p", maxCopias: 3, hoy: new Date("2026-09-22T06:00:00Z"), fetchFn: s.fetchFn });
    expect(r.creada).toBe("respaldo-2026-09-22");
    expect(r.eliminadas).toEqual(["respaldo-2026-09-01"]);
    expect(r.copiasActuales).toBe(3);
    expect(s.ramas.map((x) => x.name)).toContain("respaldo-2026-09-22");
    expect(s.ramas.map((x) => x.name)).not.toContain("respaldo-2026-09-01");
  });

  it("no duplica la copia si ya existe la de hoy", async () => {
    const s = fetchSimulado([rama("production", { default: true }), rama("respaldo-2026-09-22")]);
    await ejecutarRespaldoNeon({ apiKey: "k", projectId: "p", hoy: new Date("2026-09-22T06:00:00Z"), fetchFn: s.fetchFn });
    expect(s.llamadas.filter((l) => l.startsWith("POST"))).toHaveLength(0);
  });

  it("si Neon falla al crear, no borra ninguna copia", async () => {
    const llamadas: string[] = [];
    const fetchFn = (async (url: string, init?: RequestInit) => {
      llamadas.push(init?.method ?? "GET");
      if (init?.method === "POST") return new Response("limite", { status: 422 });
      return new Response(JSON.stringify({ branches: [rama("production", { default: true }), rama("respaldo-2026-09-01"), rama("respaldo-2026-09-02")] }), { status: 200 });
    }) as unknown as typeof fetch;
    await expect(ejecutarRespaldoNeon({ apiKey: "k", projectId: "p", maxCopias: 1, hoy: new Date("2026-09-22T06:00:00Z"), fetchFn })).rejects.toThrow(/422/);
    expect(llamadas).not.toContain("DELETE");
  });
});
