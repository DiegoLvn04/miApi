
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const sequelize = require("./config/db");

require("dotenv").config();

// =======================================
// IMPORTAR MODELOS
// =======================================

const Producto = require("./models/producto");
const Usuario = require("./models/usuario");

// =======================================
// IMPORTAR RUTAS Y MIDDLEWARE
// =======================================

const authRoutes = require("./routes/authRoutes");
const autenticar = require("./middleware/authMiddleware");

const app = express();

// =======================================
// CONFIGURACIÓN DE SEGURIDAD
// =======================================

app.use(helmet());

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Limitar peticiones para evitar abusos
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas peticiones. Intente más tarde."
});

app.use("/api/", limitador);

// Permitir recibir JSON
app.use(express.json());

// =======================================
// RUTAS DE AUTENTICACIÓN
// =======================================

app.use("/api/auth", authRoutes);

// =======================================
// RUTA PRINCIPAL
// =======================================

app.get("/", (req, res) => {
  res.send("¡API Backend funcionando exitosamente!");
});

// =======================================
// RUTAS CRUD DE PRODUCTOS
// =======================================

const rolesProductos = ["Administrador", "Almacenero"];

// REGISTRAR PRODUCTO
app.post(
  "/api/productos",
  autenticar(rolesProductos),
  async (req, res) => {
    try {
      const nuevoProducto = await Producto.create(req.body);
      res.status(201).json(nuevoProducto);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// LISTAR PRODUCTOS
app.get(
  "/api/productos",
  autenticar(rolesProductos),
  async (req, res) => {
    try {
      const productos = await Producto.findAll();
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ACTUALIZAR PRODUCTO
app.put(
  "/api/productos/:id",
  autenticar(rolesProductos),
  async (req, res) => {
    try {
      const [actualizados] = await Producto.update(req.body, {
        where: { id: req.params.id }
      });

      if (actualizados === 0) {
        return res.status(404).json({
          error: "Producto no encontrado"
        });
      }

      res.json({ message: "Producto actualizado" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ELIMINAR PRODUCTO
app.delete(
  "/api/productos/:id",
  autenticar(rolesProductos),
  async (req, res) => {
    try {
      const eliminados = await Producto.destroy({
        where: { id: req.params.id }
      });

      if (eliminados === 0) {
        return res.status(404).json({
          error: "Producto no encontrado"
        });
      }

      res.json({ message: "Producto eliminado" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// =======================================
// SINCRONIZACIÓN Y ARRANQUE
// =======================================

const PORT = process.env.PORT || 3006;

const iniciarServidor = async () => {
  try {
    await sequelize.authenticate();

    console.log("Conexión MySQL establecida.");

    // Verificar la base de datos realmente utilizada
    const [baseDatos] = await sequelize.query(`
      SELECT
        DATABASE() AS base,
        @@port AS puerto
    `);

    console.log("BASE DE DATOS REAL:", baseDatos);

    // Verificar modelos registrados
    console.log(
      "MODELOS REGISTRADOS:",
      Object.keys(sequelize.models)
    );

    // Sincronizar modelos sin eliminar tablas
    await sequelize.sync({ force: false });

    console.log("Base de datos sincronizada.");

    // Consultar tablas existentes
    const [tablas] = await sequelize.query("SHOW TABLES");

    console.log("TABLAS DISPONIBLES:", tablas);

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(
        `Servidor corriendo en http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Error al iniciar el servidor:",
      error.message
    );
    process.exitCode = 1;
  }
};

iniciarServidor();
