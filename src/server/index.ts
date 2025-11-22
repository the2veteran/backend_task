import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import dotenv from "dotenv";
import { pool } from "../DB";
import { redis } from "../services/redis";
import * as buffer from "node:buffer";

dotenv.config();

const fastify = Fastify({
    logger: true,
});

// Register WebSocket support (correct plugin)
fastify.register(websocketPlugin);

// Basic health check
fastify.get("/health", async () => {
    return { status: "ok" };
});

// Root route
fastify.get("/", async () => {
    return { message: "Order Execution Engine Running" };
});

// WebSocket test endpoint (optional)
fastify.get("/ws", { websocket: true }, (connection, req) => {
    connection.socket.send("WebSocket Connected Successfully!");

    connection.socket.on("message", (msg: Buffer) => {
        console.log("Received:", msg.toString());
    });
});

const startServer = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: "0.0.0.0" });
        fastify.log.info(`Server running on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};


fastify.get("/db-test", async () => {
    const res = await pool.query("SELECT NOW()");
    return { db_time: res.rows[0] };
});


fastify.get("/redis-test", async () => {
    await redis.set("test-key", "Hello Redis");
    const val = await redis.get("test-key");
    return { redis_value: val };
});

startServer();
