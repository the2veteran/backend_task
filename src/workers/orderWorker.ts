// src/workers/orderWorker.ts

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { MockDexRouter } from "../services/mockDexRouter";
import { pool } from "../DB";
import { sleep } from "../utils/sleep";

dotenv.config();

/* ----------------------------- REDIS OPTIONS ----------------------------- */

const redisOptions = {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

/* ------------------------ PUBLISHER FOR ORDER EVENTS ---------------------- */

const publisher = new IORedis(redisOptions);

/* ----------------------------- MOCK DEX SETUP ----------------------------- */

const dex = new MockDexRouter();

/* --------------------------- WORKER CONCURRENCY --------------------------- */

const MAX_CONC = Number(process.env.MAX_CONCURRENCY || 10);

/* -------------------------- EVENT PUBLISH HELPER -------------------------- */

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

    // emit to Redis pub/sub
    await publisher.publish("order_updates", JSON.stringify(payload));

    // persist to order_events table
    await pool.query(
        `INSERT INTO order_events(order_id, status, details)
     VALUES($1, $2, $3)`,
        [orderId, status, details]
    );
}

/* -------------------------------- WORKER --------------------------------- */

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

        /* --------------------------- 1) PENDING --------------------------- */
        await publishEvent(orderId, "pending", {
            message: "Worker picked up job",
        });

        /* --------------------------- 2) ROUTING --------------------------- */
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

        await pool.query(
            `UPDATE orders SET status=$1, chosen_dex=$2 WHERE id=$3`,
            ["routing", chosen.dex, orderId]
        );

        await publishEvent(orderId, "routing", {
            raydium: rayQuote,
            meteora: meteQuote,
            decision: chosen.dex,
        });

        /* --------------------------- 3) BUILDING -------------------------- */
        await publishEvent(orderId, "building", {
            message: "Building transaction",
            dex: chosen.dex,
        });

        await sleep(200); // mock tx build

        /* -------------------------- 4) SUBMITTED -------------------------- */
        await publishEvent(orderId, "submitted", {
            message: "Submitting transaction",
            dex: chosen.dex,
        });

        /* --------------------------- 5) EXECUTE --------------------------- */
        try {
            const result = await dex.executeSwap(
                chosen.dex as any,
                { orderId, amountIn },
                slippageTolerance
            );

            /* --------------------------- SUCCESS --------------------------- */

            await pool.query(
                `UPDATE orders SET status=$1, executed_price=$2, tx_hash=$3 WHERE id=$4`,
                ["confirmed", result.executedPrice, result.txHash, orderId]
            );

            await publishEvent(orderId, "confirmed", {
                txHash: result.txHash,
                executedPrice: result.executedPrice,
            });

            return;
        } catch (err: any) {
            /* --------------------------- FAILURE --------------------------- */

            const errorMsg = err?.message || "Unknown error";

            await pool.query(
                `UPDATE orders
         SET attempts = attempts + 1
         WHERE id = $1`,
                [orderId]
            );

            const attempt = job.attemptsMade + 1;

            await pool.query(
                `INSERT INTO order_failures(order_id, attempt, error)
         VALUES($1, $2, $3)`,
                [orderId, attempt, errorMsg]
            );

            await publishEvent(orderId, "failed", {
                error: errorMsg,
                attempt,
            });

            console.error(
                `Order ${orderId} failed attempt ${attempt} :`,
                errorMsg
            );

            // rethrow so BullMQ retries (since attempts: 3 configured)
            throw err;
        }
    },
    {
        connection: redisOptions,
        concurrency: MAX_CONC,
    }
);

/* --------------------------- LOGGING EVENTS --------------------------- */

worker.on("completed", (job) => {
    console.log(`Job completed:`, job.id);
});

worker.on("failed", (job, err) => {
    console.error(
        `Worker job failed: ${job?.id} ->`,
        err?.message
    );
});

export default worker;
