
import { randomUUID } from 'crypto';
import { sleep } from '../utils/sleep';

export type Quote = { price: number; fee: number; liquidity: number };

export class MockDexRouter {
    basePrice(pair: string) {
        // deterministic seed per pair (simple)
        const seed = pair.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        return 1 + (seed % 100) / 1000; // base ~1.0 - 1.099
    }

    async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        await sleep(150 + Math.random() * 200);
        const base = this.basePrice(`${tokenIn}_${tokenOut}`);
        const price = base * (0.98 + Math.random() * 0.04);
        const fee = 0.003;
        const liquidity = Math.round(50000 + Math.random() * 200000);
        return { price, fee, liquidity };
    }

    async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        await sleep(150 + Math.random() * 250);
        const base = this.basePrice(`${tokenIn}_${tokenOut}`);
        const price = base * (0.97 + Math.random() * 0.05);
        const fee = 0.002;
        const liquidity = Math.round(20000 + Math.random() * 300000);
        return { price, fee, liquidity };
    }

    async executeSwap(dex: 'raydium' | 'meteora', order: { orderId: string; amountIn: number }, slippageTolerance = 0.01) {
        // simulate execution delay
        await sleep(2000 + Math.random() * 1000);
        // random transient failure ~3%
        if (Math.random() < 0.03) throw new Error('Simulated network failure');

        // compute executed price + apply small slippage
        const price = 1 + Math.random() * 0.01; // mock executed price
        const executedPrice = price * (1 - Math.random() * slippageTolerance);
        const txHash = `mock_tx_${randomUUID()}`;
        return { txHash, executedPrice };
    }
}
