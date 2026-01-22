import { verifyToken } from "../config/jwt.config";


const verifyTokenMiddleware = (req, res, next) => {
    // 1. Get token from header (Format: Bearer <token>)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const customer = verifyToken(token);
        req.customer = customer;
        next();
    } catch (error) {
        // If token is expired or fake
        res.status(403).json({ message: "Invalid or expired token" });
    }
}


export default verifyTokenMiddleware;