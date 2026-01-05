import jwt from "jsonwebtoken";

const JWT_SECRET = "supersecretkey123"; // Must match .env JWT_SECRET

const token = jwt.sign(
  { id: "teacher_1", role: "teacher" }, // payload
  JWT_SECRET,
  { expiresIn: "1h" } // valid for 1 hour
);

console.log("Generated JWT Token:\n");
console.log(token);
