export class RateLimiter {
    private readonly maxRequests: number;
    private readonly timeWindow: number;
    private readonly requests: number[] = [];

    constructor(maxRequests: number, timeWindow: number) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
    }

    private sleep(ms: number) {
        return new Promise(res => setTimeout(res, ms));
    }

    async wait() {
        const now = Date.now();
        while (this.requests.length > 0 && now - this.requests[0]! > this.timeWindow) {
            this.requests.shift();
        }
        if (this.requests.length >= this.maxRequests) {
            const waitMs = this.timeWindow - (now - this.requests[0]!);
            await this.sleep(Math.max(0, waitMs));
        }

        this.requests.push(Date.now());
    }
}
