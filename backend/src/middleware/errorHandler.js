
export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.code = err.code || 'INTERNAL_ERROR';

    // Log the error (can be enhanced with a logger like winston)
    if (err.statusCode === 500) {
        // Sanitize error object to remove secrets from Axios logs
        const sanitizedErr = { ...err };
        if (sanitizedErr.config?.headers) {
            const sensitiveHeaders = ['Authorization', 'X-Plex-Token', 'X-Emby-Token'];
            const sanitizedHeaders = { ...sanitizedErr.config.headers };
            sensitiveHeaders.forEach(h => {
                if (sanitizedHeaders[h]) sanitizedHeaders[h] = '***REDACTED***';
            });
            sanitizedErr.config = { ...sanitizedErr.config, headers: sanitizedHeaders };
        }

        console.error('🔥 ERROR 💥', sanitizedErr.message, sanitizedErr.config ? { url: sanitizedErr.config.url, headers: sanitizedErr.config.headers } : sanitizedErr);
    }

    // Send response
    res.status(err.statusCode).json({
        error: err.message, // Backward compatibility for AuthContext
        message: err.message, // Standard field
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
