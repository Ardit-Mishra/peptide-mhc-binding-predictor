import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handlers for graceful shutdown
let httpServer: any = null;

function gracefulShutdown(signal: string) {
  log(`Received ${signal}. Shutting down gracefully...`);
  
  if (httpServer) {
    httpServer.close(() => {
      log("HTTP server closed.");
      process.exit(0);
    });

    // Force close server after 30 seconds
    setTimeout(() => {
      log("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(error.stack || '');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  gracefulShutdown('UNHANDLED_REJECTION');
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error ${status}: ${message}`);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    httpServer = server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      log(`Server host: 0.0.0.0 (external access enabled)`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Enhanced deployment readiness logging
      if (process.env.NODE_ENV === 'production') {
        log("DEPLOYMENT_STATUS: Server started successfully");
        log("DEPLOYMENT_STATUS: Listening on 0.0.0.0:5000 for external access");
        log("DEPLOYMENT_STATUS: Health check available at /api/health");
        log("DEPLOYMENT_STATUS: Models loading in background - check /api/health for readiness");
        log("Production server ready - deployment health checks can begin");
      }
      
      // Log key endpoints for deployment verification
      log("Available endpoints:");
      log("  - Health check: GET /api/health");
      log("  - System status: GET /api/system-status");
      log("  - Model performance: GET /api/models/performance");
    });

    // Handle server errors with enhanced logging
    httpServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`DEPLOYMENT_ERROR: Port ${port} is already in use`);
        log(`DEPLOYMENT_ERROR: Another process may be using port ${port}`);
      } else if (error.code === 'EACCES') {
        log(`DEPLOYMENT_ERROR: Permission denied for port ${port}`);
      } else {
        log(`DEPLOYMENT_ERROR: Server error - ${error.message}`);
      }
      
      if (process.env.NODE_ENV === 'production') {
        log("DEPLOYMENT_STATUS: FAILED - Server could not start");
      }
      
      process.exit(1);
    });

    // Add timeout handler for deployment scenarios
    httpServer.timeout = 30000; // 30 second timeout
    httpServer.keepAliveTimeout = 5000; // 5 second keep-alive

  } catch (error: any) {
    log(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();
