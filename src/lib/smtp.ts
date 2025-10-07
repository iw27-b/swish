/**
 * SMTP Email Service
 * Handles sending transactional emails via SMTP
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

let transporter: Transporter | null = null;
let isSmtpConfigured = false;

/**
 * Initialize SMTP transporter with environment variables
 * @returns boolean - Whether SMTP is configured
 */
function initializeSmtp(): boolean {
    if (transporter) {
        return isSmtpConfigured;
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        console.log('[SMTP] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env file.');
        isSmtpConfigured = false;
        return false;
    }

    try {
        const config: SmtpConfig = {
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: smtpSecure === 'true',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        };

        transporter = nodemailer.createTransport(config);
        isSmtpConfigured = true;
        console.log(`[SMTP] Configured successfully: ${smtpHost}:${smtpPort}`);
        return true;
    } catch (error) {
        console.error('[SMTP] Failed to initialize SMTP transporter:', error);
        isSmtpConfigured = false;
        return false;
    }
}

/**
 * Send email via SMTP
 * @param options EmailOptions - Email configuration
 * @returns Promise<boolean> - Whether email was sent successfully
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    if (!initializeSmtp()) {
        console.log('[SMTP] Skipping email send - SMTP not configured');
        return false;
    }

    if (!transporter) {
        console.error('[SMTP] Transporter not initialized');
        return false;
    }

    try {
        const fromAddress = options.from || process.env.SMTP_FROM || process.env.SMTP_USER;
        
        const mailOptions = {
            from: fromAddress,
            to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
            replyTo: options.replyTo,
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log(`[SMTP] Email sent successfully to ${mailOptions.to}`);
        console.log(`[SMTP] Message ID: ${info.messageId}`);
        console.log(`[SMTP] Response: ${info.response}`);
        
        return true;
    } catch (error: any) {
        console.error('[SMTP] Failed to send email:', error);
        console.error(`[SMTP] Error details: ${error.message}`);
        if (error.code) {
            console.error(`[SMTP] Error code: ${error.code}`);
        }
        if (error.response) {
            console.error(`[SMTP] SMTP server response: ${error.response}`);
        }
        return false;
    }
}

/**
 * Verify SMTP connection
 * @returns Promise<boolean> - Whether connection is valid
 */
export async function verifySmtpConnection(): Promise<boolean> {
    if (!initializeSmtp()) {
        return false;
    }

    if (!transporter) {
        return false;
    }

    try {
        await transporter.verify();
        console.log('[SMTP] Connection verified successfully');
        return true;
    } catch (error: any) {
        console.error('[SMTP] Connection verification failed:', error.message);
        return false;
    }
}

/**
 * Check if SMTP is configured
 * @returns boolean - Whether SMTP is configured
 */
export function isSmtpEnabled(): boolean {
    initializeSmtp();
    return isSmtpConfigured;
}

