import { Request } from 'express';

export interface PaginationParams {
    limit: number;
    offset: number;
    page: number;
}

export function getPaginationParams(req: Request, defaultLimit = 50, maxLimit = 100): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    let limit = parseInt(req.query.limit as string) || defaultLimit;
    
    if (limit > maxLimit) {
        limit = maxLimit;
    }
    
    const offset = (page - 1) * limit;
    
    return { limit, offset, page };
}

export function buildPaginatedResponse<T>(data: T[], totalCount: number, page: number, limit: number) {
    const totalPages = Math.ceil(totalCount / limit);
    return {
        data,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}
