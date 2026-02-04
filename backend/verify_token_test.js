import jwt from "jsonwebtoken";
import fs from "fs";

const secret = process.env.JWT_SECRET || "your-secret-key-change-this";
try {
    const token = fs.readFileSync("token.txt", "utf8").trim();
    console.log("Reading token:", token);
    const decoded = jwt.verify(token, secret);
    console.log("Token verified successfully!");
    console.log("User ID:", decoded.id);
    console.log("Exp:", decoded.exp);
} catch (e) {
    console.error("Verification failed:", e.message);
    if (e.message === "invalid signature") {
        console.log("Secret used:", secret);
    }
}
