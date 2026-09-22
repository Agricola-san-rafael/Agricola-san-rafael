import { ListaClientes } from "../../clientes/lista-clientes";

export default function ClientesTransportePage() {
  return <ListaClientes empresa="transporte" basePath="/fletes/clientes" />;
}
