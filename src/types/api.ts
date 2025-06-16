export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
    meta?: {
        pagination?: PaginationInfo;
        timestamp: string;
        requestId?: string;
    };
}

export interface PaginationInfo {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface PaginationQuery {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ListResponse<T> {
    items: T[];
    pagination: PaginationInfo;
}

export interface AuditLog {
    action: string;
    userId?: string;
    ip: string;
    userAgent?: string;
    resource?: string;
    resourceId?: string;
    timestamp: Date;
    details?: Record<string, any>;
} 