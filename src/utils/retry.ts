export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === retryConfig.maxAttempts) {
                throw lastError;
            }

            const delay = Math.min(
                retryConfig.baseDelay * Math.pow(2, attempt - 1),
                retryConfig.maxDelay
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
