import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.1.0",
      description: "A full-featured Airbnb-like REST API with listings, bookings, reviews, and authentication",
    },
    servers: [
      {
        url: process.env["API_URL"] || "http://localhost:3000", // ✅ dynamic URL
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [
    "./src/routes/v1/*.ts",   // ✅ dev: TypeScript files
    "./dist/routes/v1/*.js",  // ✅ prod: compiled JS files
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  console.log(`📚 Swagger docs available at ${process.env["API_URL"] || "http://localhost:3000"}/api-docs`);
};