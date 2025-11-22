// src/services/mockDexRouter.ts

import { randomUUID } from "crypto";
import { sleep } from "../utils/sleep";

export type Quote = {
    price: number;
    fee: number;
    liquidity: number;
};

export class MockDexRouter {
    private basePrice(pair: string) {
        const seed = pair.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
        return 1 + (seed % 100) / 1000; // deterministic base price
    }

    async getRaydiumQuote(
        tokenIn: string,
        tokenOut: string,
        amount: number
    ): Promise<Quote> {
        await sleep(200 + Math.random() * 200);

        const base = this.basePrice(`${tokenIn}_${tokenOut}`);
        const variance = Number(process.env.RAYDIUM_PRICE_VARIANCE || 0.04);

        const price = base * (1 - variance + Math.random() * variance);
        const fee = 0.003;
        const liquidity = 50000 + Math.random() * 200000;

        return { price, fee, liquidity };
    }

    async getMeteoraQuote(
        tokenIn: string,
        tokenOut: string,
        amount: number
    ): Promise<Quote> {
        await sleep(200 + Math.random() * 250);

        const base = this.basePrice(`${tokenIn}_${tokenOut}`);
        const variance = Number(process.env.METEORA_PRICE_VARIANCE || 0.05);

        const price = base * (1 - variance + Math.random() * variance);
        const fee = 0.002;
        const liquidity = 20000 + Math.random() * 300000;

        return { price, fee, liquidity };
    }

    async executeSwap(
        dex: "raydium" | "meteora",
        order: { orderId: string; amountIn: number },
        slippageTolerance = 0.01
    ) {
        await sleep(2000 + Math.random() * 1000);

        // Simulate random network failure (~3%)
        if (Math.random() < 0.03) {
            throw new Error("Simulated network failure");
        }

        const basePrice = 1 + Math.random() * 0.02;
        const executedPrice =
            basePrice * (1 - Math.random() * slippageTolerance);

        const txHash = `mock_tx_${randomUUID()}`;

        return { txHash, executedPrice };
    }
}
