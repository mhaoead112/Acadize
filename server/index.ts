import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { registerRoutes as registerApiRoutes } from "./src/api/index";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { staffProfiles, users } from "@shared/schema";
import { eq, ilike, and, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Request user type is defined in src/middleware/auth.middleware.ts

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Environment variable validation for deployment
function validateEnvironment() {
  const requiredEnvVars = ['DATABASE_URL'];
  const optionalEnvVars = ['OPENAI_API_KEY'];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    log(`WARNING: Missing required environment variables: ${missing.join(', ')}`, "deployment");
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
  
  const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
  if (missingOptional.length > 0) {
    log(`INFO: Missing optional environment variables: ${missingOptional.join(', ')} - some features may not work`, "deployment");
  }
  
  log("Environment validation completed", "deployment");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Enable cookie parsing for secure authentication

function verifyToken(req: any, res: any, next: any) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- routes start below ---


app.get("/api/admin-only", verifyToken, (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ message: "Welcome, admin!" });
});

app.get("/api/staff", async (req, res) => {
  try {
    const { search = "", department = "" } = req.query;

    let whereClause: any = undefined;

    // Build search condition (case-insensitive)
    if (search) {
      const term = `%${search}%`;
      whereClause = or(
        ilike(staffProfiles.firstName, term),
        ilike(staffProfiles.lastName, term),
        ilike(staffProfiles.title, term),
        ilike(staffProfiles.department, term)
      );
    }

    // Add department filter if needed
    if (department) {
      const deptCondition = eq(staffProfiles.department, department as string);
      whereClause = whereClause ? and(whereClause, deptCondition) : deptCondition;
    }

    // Build the final query only once
    const results = await db.select().from(staffProfiles).where(whereClause);

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

//app.post("/api/seed-staff", async (_req, res) => {
//  try {
//    // Delete any old records (optional)
//    await db.delete(staff);
//
//    // Insert a few demo staff members
//    await db.insert(staff).values([
//      {
//        firstName: "John",
//        lastName: "Doe",
//        title: "Mathematics Teacher",
//        department: "Mathematics",
//        bio: "Passionate about numbers and teaching problem solving.",
//        email: "john.doe@eduverse.com",
//        phone: "555-123-4567",
//        officeLocation: "Room 201",
//        experience: "10 years",
//        profileImage: "",
//        expertise: ["Algebra", "Geometry", "Calculus"],
//        officeHours: { Monday: "10:00 - 12:00", Wednesday: "13:00 - 15:00" },
//      },
//      {
//        firstName: "Jane",
//        lastName: "Smith",
//        title: "Science Department Head",
//        department: "Science",
//        bio: "Dedicated to exploring the wonders of science and inspiring curiosity.",
//        email: "jane.smith@eduverse.com",
//        phone: "555-234-5678",
//        officeLocation: "Room 105",
//        experience: "12 years",
//        profileImage: "",
//        expertise: ["Physics", "Biology", "Chemistry"],
//        officeHours: { Tuesday: "09:00 - 11:00", Thursday: "14:00 - 16:00" },
//      },
//    ]);
//
//    res.json({ success: true, message: "✅ Staff table seeded successfully!" });
//  } catch (error) {
//    console.error(error);
//    res.status(500).json({ error: "Failed to seed staff table" });
//  }
//});

// REGISTER a new user
app.post("/api/register", async (req, res) => {
  try {
    console.log("✅ Register route hit!");
    console.log("Request body:", req.body);

    const { username, email, password, role = "student", fullName } = req.body;
    if (!username || !email || !password || !fullName) {
      console.log("⚠️ Missing fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("🔍 Checking for existing user...");
    const existing = await db.select().from(users).where(eq(users.email, email));
    console.log("Existing user:", existing);

    const passwordHash = await bcrypt.hash(password, 10);
    console.log("🔐 Password hashed");

    await db.insert(users).values({
      username,
      email,
      fullName,
      role,
      passwordHash,
    });

    console.log("✅ User inserted into DB");
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// LOGIN existing user
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // change to true in production (HTTPS)
    });

    res.json({ success: true, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

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

(async () => {
  // Validate environment variables before starting
  try {
    validateEnvironment();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`FATAL: Environment validation failed: ${errorMessage}`, "deployment");
    process.exit(1);
  }

  const server = await registerRoutes(app);
  
  // Register modular API routes (analytics, etc.)
  registerApiRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
