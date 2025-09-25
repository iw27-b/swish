'use client';

import { AlertCircle } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <span className="h-5 w-5 text-red-400">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                            </span>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">エラーが発生しました。</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>このコンポーネントでエラーが発生しました。</p>
                                <button
                                    onClick={() => this.setState({ hasError: false, error: undefined })}
                                    className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                                >
                                    再読み込み
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
