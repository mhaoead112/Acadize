import "dotenv/config";
import jwt from "jsonwebtoken";

const payload = {
  id: "teacher-uuid-123",
  username: "teacher1",
  role: "teacher"
};

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("❌ Missing JWT_SECRET in .env");
  process.exit(1);
}

const token = jwt.sign(payload, secret, { expiresIn: "1h" });
console.log("✅ JWT Token (valid for 1 hour):\n");
console.log(token);
