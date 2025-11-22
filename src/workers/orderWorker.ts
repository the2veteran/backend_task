// src/workers/orderWorker.ts

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { MockDexRouter } from "../services/mockDexRouter";
import { query } from "../db";
import { sleep } from "../utils/sleep";

dotenv.config();

/* ----------------------- REDIS CONNECTION OPTIONS ------------------------ */

const redisOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

/* ----------------------------- REDIS PUBLISHER --------------------------- */

const publisher = new IORedis(redisOptions);

/* ----------------------------- DEX ROUTER SETUP -------------------------- */

const dex = new MockDexRouter();

/* ------------------------------ CONCURRENCY ------------------------------ */

const MAX_CONC = Number(process.env.MAX_CONCURRENCY || 10);

/* --------------------------- PUBLISHER HELPER ---------------------------- */

async function publishEvent(
    orderId: string,
    status: string,
    details: any = {}
) {
    const payload = {
        orderId,
        status,
        timestamp: new Date().toISOString(),
        details,
    };

    console.log(`[ORDER ${orderId}] => ${status}`, details);

    try {
        await publisher.publish(`order:status:${orderId}`, JSON.stringify(payload));
    } catch (err) {
        console.error("Redis publish failed:", (err as any)?.message);
    }

    try {
        await query(
            `INSERT INTO order_events(order_id, status, details)
       VALUES ($1, $2, $3)`,
            [orderId, status, details]
        );
    } catch (err) {
        console.error("DB order_events insert failed:", (err as any)?.message);
    }

    try {
        await query(
            `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`,
            [status, orderId]
        );
    } catch (err) {
        console.error("DB status update failed:", (err as any)?.message);
    }
}

/* -------------------------------- WORKER -------------------------------- */

const worker = new Worker(
    "orders",
    async (job: Job) => {
        const {
            orderId,
            tokenIn,
            tokenOut,
            amountIn,
            slippageTolerance = Number(
                process.env.SLIPPAGE_TOLERANCE || 0.01
            ),
        } = job.data;

        console.log(
            `[ORDER ${orderId}] Worker started | ${tokenIn}→${tokenOut} | amount=${amountIn}`
        );

        /* ------------------------------ PENDING ------------------------------ */

        await publishEvent(orderId, "pending", {
            message: "Worker picked up job",
        });

        /* ------------------------------ ROUTING ------------------------------ */

        await publishEvent(orderId, "routing", {
            message: "Fetching DEX quotes",
        });

        const [rayQuote, meteQuote] = await Promise.all([
            dex.getRaydiumQuote(tokenIn, tokenOut, amountIn),
            dex.getMeteoraQuote(tokenIn, tokenOut, amountIn),
        ]);

        const rayOut = amountIn * rayQuote.price * (1 - rayQuote.fee);
        const meteOut = amountIn * meteQuote.price * (1 - meteQuote.fee);

        const chosen =
            rayOut >= meteOut
                ? { dex: "raydium", quote: rayQuote, amountOut: rayOut }
                : { dex: "meteora", quote: meteQuote, amountOut: meteOut };

        console.log(
            `[ORDER ${orderId}] ROUTING -> Raydium=${rayOut} | Meteora=${meteOut} | chosen=${chosen.dex}`
        );

        await publishEvent(orderId, "routing", {
            raydium: rayQuote,
            meteora: meteQuote,
            decision: chosen.dex,
        });

        try {
            await query(
                `UPDATE orders SET chosen_dex=$1 WHERE id=$2`,
                [chosen.dex, orderId]
            );
        } catch (err) {
            console.error("DB chosen_dex update failed:", (err as any)?.message);
        }

        /* ------------------------------ BUILDING ----------------------------- */

        await publishEvent(orderId, "building", {
            message: "Building transaction",
            dex: chosen.dex,
        });

        await sleep(150);

        /* ------------------------------ SUBMITTED ---------------------------- */

        await publishEvent(orderId, "submitted", {
            message: "Submitting transaction",
            dex: chosen.dex,
        });

        /* ------------------------------ EXECUTION ---------------------------- */

        try {
            const result = await dex.executeSwap(
                chosen.dex as any,
                { orderId, amountIn },
                slippageTolerance
            );

            await query(
                `UPDATE orders 
           SET status='confirmed', executed_price=$1, tx_hash=$2, updated_at=NOW()
         WHERE id=$3`,
                [result.executedPrice, result.txHash, orderId]
            );

            await publishEvent(orderId, "confirmed", {
                txHash: result.txHash,
                executedPrice: result.executedPrice,
            });

            console.log(
                `[ORDER ${orderId}] CONFIRMED | tx=${result.txHash} | price=${result.executedPrice}`
            );
        } catch (err: any) {
            /* ------------------------------ FAILURE ----------------------------- */

            const errorMsg = String(err?.message || "Execution failed");

            const attempt = job.attemptsMade + 1;

            await query(
                `UPDATE orders SET attempts = attempts + 1 WHERE id=$1`,
                [orderId]
            );

            await query(
                `INSERT INTO order_failures(order_id, attempt, error)
         VALUES ($1, $2, $3)`,
                [orderId, attempt, errorMsg]
            );

            await publishEvent(orderId, "failed", {
                error: errorMsg,
                attempt,
            });

            console.error(`[ORDER ${orderId}] FAILED | ${errorMsg}`);

            throw err; // BullMQ retry
        }
    },
    {
        connection: redisOptions,
        concurrency: MAX_CONC,
    }
);

/* ----------------------------- WORKER LOGGING ----------------------------- */

worker.on("completed", (job) => {
    console.log(`[WORKER] Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(
        `[WORKER] Job failed: ${job?.id} |`,
        (err as any)?.message
    );
});

/* ----------------------------- GRACEFUL SHUTDOWN ----------------------------- */

const shutdown = async () => {
    console.log("[WORKER] Shutting down...");
    try {
        await worker.close();
    } catch {}
    try {
        await publisher.quit();
    } catch {}
    process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

export default worker;
