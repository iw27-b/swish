/**
 * Email Templates
 * Generates HTML email content for various transactional emails
 */

export interface OrderConfirmationData {
    orderId: string;
    orderDate: string;
    customerName: string;
    customerEmail: string;
    items: {
        cardName: string;
        player: string;
        team: string;
        year: number;
        condition: string;
        price: number;
        imageUrl?: string;
    }[];
    subtotal: number;
    shipping: number;
    total: number;
    shippingAddress: {
        name: string;
        streetAddress: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        phone?: string;
    };
}

/**
 * Generate order confirmation email HTML
 * @param data OrderConfirmationData - Order details
 * @returns HTML string for email
 */
export function generateOrderConfirmationEmail(data: OrderConfirmationData): string {
    const itemsHtml = data.items.map((item, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 20px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                        <td style="width: 80px; vertical-align: top;">
                            ${item.imageUrl ? `
                                <img src="${item.imageUrl}" alt="${item.cardName}" 
                                     style="width: 60px; height: 84px; border-radius: 4px; object-fit: cover; border: 1px solid #e5e7eb;" />
                            ` : `
                                <div style="width: 60px; height: 84px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;"></div>
                            `}
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                            <div style="font-weight: 600; font-size: 14px; color: #111827; margin-bottom: 4px;">${item.cardName}</div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 2px;">${item.player} • ${item.team}</div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 2px;">${item.year} • ${item.condition}</div>
                            <div style="font-size: 14px; color: #111827; margin-top: 8px; font-weight: 500;">US $${item.price.toFixed(2)}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>注文確認 - SWISH</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 32px 40px; background-color: #000000; text-align: center;">
                            <div style="font-size: 32px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">SWISH</div>
                            <div style="font-size: 16px; color: #9ca3af;">Basketball Trading Cards</div>
                        </td>
                    </tr>

                    <!-- Success Icon -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px; text-align: center;">
                            <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto; display: inline-flex; align-items: center; justify-content: center;">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </td>
                    </tr>

                    <!-- Title -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 8px;">注文しました</h1>
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">注文番号: ${data.orderId}</p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">${data.orderDate}</p>
                        </td>
                    </tr>

                    <!-- Order Summary -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                                <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111827;">注文詳細</h2>
                                
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    ${itemsHtml}
                                    
                                    <!-- Totals -->
                                    <tr>
                                        <td style="padding-top: 20px;">
                                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">小計</td>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #111827; text-align: right;">US $${data.subtotal.toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">配送</td>
                                                    <td style="padding: 8px 0; font-size: 14px; color: #111827; text-align: right;">US $${data.shipping.toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td colspan="2" style="padding: 12px 0 8px 0;">
                                                        <div style="border-top: 2px dashed #e5e7eb;"></div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #111827;">合計</td>
                                                    <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">
                                                        <div>US $${data.total.toFixed(2)}</div>
                                                        <div style="font-size: 14px; font-weight: 400; color: #6b7280; margin-top: 4px;">JPY ¥${Math.round(data.total * 150).toLocaleString('ja-JP')}</div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Shipping Address -->
                    <tr>
                        <td style="padding: 0 40px 32px 40px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">配送先住所</h2>
                                <div style="font-size: 14px; color: #111827; line-height: 1.6;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">${data.shippingAddress.name}</div>
                                    ${data.shippingAddress.phone ? `<div style="color: #6b7280; margin-bottom: 8px;">${data.shippingAddress.phone}</div>` : ''}
                                    <div style="color: #6b7280;">
                                        ${data.shippingAddress.streetAddress}<br/>
                                        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br/>
                                        ${data.shippingAddress.country}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Customer Info -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">お客様情報</h2>
                                <div style="font-size: 14px; color: #111827; line-height: 1.6;">
                                    <div style="font-weight: 600; margin-bottom: 4px;">${data.customerName}</div>
                                    <div style="color: #6b7280;">${data.customerEmail}</div>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                                ご注文ありがとうございます。商品の発送準備が整い次第、追跡番号をお送りします。
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                © ${new Date().getFullYear()} Swish. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

/**
 * Generate plain text version of order confirmation email
 * @param data OrderConfirmationData - Order details
 * @returns Plain text string for email
 */
export function generateOrderConfirmationText(data: OrderConfirmationData): string {
    const itemsList = data.items.map((item, index) => 
        `${index + 1}. ${item.cardName}\n   ${item.player} • ${item.team} • ${item.year}\n   状態: ${item.condition}\n   価格: US $${item.price.toFixed(2)}`
    ).join('\n\n');

    return `
SWISH - Basketball Trading Cards

注文確認

注文番号: ${data.orderId}
日付: ${data.orderDate}

────────────────────────────────

注文詳細

${itemsList}

────────────────────────────────

小計: US $${data.subtotal.toFixed(2)}
配送: US $${data.shipping.toFixed(2)}
合計: US $${data.total.toFixed(2)} (JPY ¥${Math.round(data.total * 150).toLocaleString('ja-JP')})

────────────────────────────────

配送先住所

${data.shippingAddress.name}
${data.shippingAddress.phone ? data.shippingAddress.phone + '\n' : ''}${data.shippingAddress.streetAddress}
${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}
${data.shippingAddress.country}

────────────────────────────────

お客様情報

${data.customerName}
${data.customerEmail}

────────────────────────────────

ご注文ありがとうございます。
商品の発送準備が整い次第、追跡番号をお送りします。

© ${new Date().getFullYear()} Swish. All rights reserved.
    `.trim();
}

