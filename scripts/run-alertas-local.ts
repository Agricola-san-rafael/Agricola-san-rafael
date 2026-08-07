import "dotenv/config";
import { generarAlertas } from "../src/modules/alertas/generar-alertas";

generarAlertas()
  .then((resultado) => {
    console.log(`Alertas generadas: ${resultado.creadas}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
