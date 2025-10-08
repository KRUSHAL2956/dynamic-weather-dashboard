// Enhanced Error Handling System
class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        // Catch unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
    }

    logError(errorData) {
        console.error('🚨 Error logged:', errorData);
        this.errorQueue.push(errorData);
        
        // Keep only last 50 errors
        if (this.errorQueue.length > 50) {
            this.errorQueue.shift();
        }
    }

    async handleApiError(error, context, retryFn = null) {
        const errorInfo = {
            type: 'api',
            context,
            message: error.message,
            timestamp: Date.now()
        };

        this.logError(errorInfo);

        // Determine error type and response
        if (error.message.includes('401')) {
            return this.handleAuthError();
        } else if (error.message.includes('404')) {
            return this.handleNotFoundError(context);
        } else if (error.message.includes('429')) {
            return this.handleRateLimitError(retryFn);
        } else if (error.message.includes('timeout')) {
            return this.handleTimeoutError(retryFn);
        } else {
            return this.handleGenericError(error, context);
        }
    }

    handleAuthError() {
        return {
            success: false,
            error: 'Authentication failed. Please check API configuration.',
            userMessage: 'Unable to access weather data. Please try again later.',
            retry: false
        };
    }

    handleNotFoundError(context) {
        return {
            success: false,
            error: `Resource not found: ${context}`,
            userMessage: 'Location not found. Please check the city name.',
            retry: false
        };
    }

    async handleRateLimitError(retryFn) {
        if (retryFn) {
            await this.delay(5000); // Wait 5 seconds
            return await retryFn();
        }
        
        return {
            success: false,
            error: 'Rate limit exceeded',
            userMessage: 'Too many requests. Please wait a moment and try again.',
            retry: true
        };
    }

    async handleTimeoutError(retryFn) {
        if (retryFn) {
            await this.delay(2000); // Wait 2 seconds
            return await retryFn();
        }
        
        return {
            success: false,
            error: 'Request timeout',
            userMessage: 'Request timed out. Please check your connection.',
            retry: true
        };
    }

    handleGenericError(error, context) {
        return {
            success: false,
            error: `${context}: ${error.message}`,
            userMessage: 'Something went wrong. Please try again.',
            retry: true
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getErrorStats() {
        const stats = {
            total: this.errorQueue.length,
            byType: {},
            recent: this.errorQueue.slice(-10)
        };

        this.errorQueue.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }
}

// Global error handler instance
window.ErrorHandler = new ErrorHandler();