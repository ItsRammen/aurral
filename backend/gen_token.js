import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Using real admin ID from db.json
const token = jwt.sign(
    {
        id: "42be687a-d4c6-4783-b276-32f707337219",
        username: "admin",
        permissions: ["admin"]
    },
    JWT_SECRET,
    { expiresIn: "1d" }
);

fs.writeFileSync("token.txt", token);
console.log("Valid token written to token.txt for admin user.");
