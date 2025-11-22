
const axios = require("axios");
const WebSocket = require("ws");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const WS_URL = process.env.WS_URL || "ws://localhost:3000";

async function createOrder(body) {
    const res = await axios.post(`${BASE_URL}/api/orders/execute`, body);
    return res.data.orderId;
}

function waitForStatuses(orderId, expectedStatuses, timeout = 12000) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}/api/orders/execute?orderId=${orderId}`);

        const received = [];

        const timer = setTimeout(() => {
            ws.close();
            reject(new Error(`Timeout waiting for statuses. Received: ${received.join(",")}`));
        }, timeout);

        ws.on("message", (msg) => {
            try {
                const event = JSON.parse(msg.toString());
                const status = event.status;
                received.push(status);

                // When all statuses received in correct order
                if (expectedStatuses.every((s, i) => received[i] === s)) {
                    clearTimeout(timer);
                    ws.close();
                    resolve(received);
                }
            } catch (err) {
                console.error("WS parse error:", err);
            }
        });

        ws.on("error", (e) => {
            clearTimeout(timer);
            reject(e);
        });
    });
}

module.exports = {
    createOrder,
    waitForStatuses,
    BASE_URL,
    WS_URL,
};
