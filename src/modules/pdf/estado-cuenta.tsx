import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { obtenerCliente, obtenerMovimientosCliente } from "@/modules/clientes/service";
import { formatCLP } from "@/modules/shared/money";
import { formatDateCL } from "@/modules/shared/dates";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  saldoBox: { marginBottom: 16, padding: 12, backgroundColor: "#f4f4f4" },
  saldoLabel: { fontSize: 9, color: "#555" },
  saldoValor: { fontSize: 18, marginTop: 2 },
  table: { display: "flex", flexDirection: "column", width: "100%" },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 3,
  },
  colFecha: { width: "18%" },
  colTipo: { width: "18%" },
  colDetalle: { width: "44%" },
  colMonto: { width: "20%", textAlign: "right" },
  headerText: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, fontSize: 8, color: "#999" },
});

/** Genera el estado de cuenta de un cliente en vivo (sección 6: GET /clientes/:id/estado-cuenta). */
export async function generarEstadoCuentaPDF(clienteId: string): Promise<Buffer> {
  const [cliente, movimientos] = await Promise.all([
    obtenerCliente(clienteId),
    obtenerMovimientosCliente(clienteId),
  ]);

  const documento = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Estado de cuenta — {cliente.nombre}</Text>
        <Text style={styles.subtitle}>
          Generado el {formatDateCL(new Date())} · Agrícola San Rafael
        </Text>

        <View style={styles.saldoBox}>
          <Text style={styles.saldoLabel}>Saldo pendiente</Text>
          <Text style={styles.saldoValor}>{formatCLP(cliente.saldoPendiente)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.colFecha, styles.headerText]}>Fecha</Text>
            <Text style={[styles.colTipo, styles.headerText]}>Tipo</Text>
            <Text style={[styles.colDetalle, styles.headerText]}>Detalle</Text>
            <Text style={[styles.colMonto, styles.headerText]}>Monto</Text>
          </View>
          {movimientos.map((m) => (
            <View key={`${m.tipo}-${m.id}`} style={styles.row}>
              <Text style={styles.colFecha}>{formatDateCL(m.fecha)}</Text>
              <Text style={styles.colTipo}>{m.tipo}</Text>
              <Text style={styles.colDetalle}>{m.detalle}</Text>
              <Text style={styles.colMonto}>{formatCLP(m.monto)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Documento generado automáticamente desde el sistema de gestión — reemplaza los archivos
          EstadoCuenta_*.xlsx que se mantenían a mano.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(documento);
}
