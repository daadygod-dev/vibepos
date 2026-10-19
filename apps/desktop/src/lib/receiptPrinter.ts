// ============================================================
// vibe-pos — ESC/POS Thermal Receipt Engine & Cash Drawer Bridge
// Generates standard ESC/POS binary buffers for thermal printers
// (Epson, Star, Citizen, Munbyn) and controls cash drawers.
// ============================================================

import type { PosConfig } from '@vibe-pos/config-schema';

export interface ReceiptData {
  orderId: string;
  tableName?: string | null;
  roomNumber?: string | null;
  cashierName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currencySymbol: string;
  createdAt: string;
  branding?: PosConfig['branding'];
  paperSize?: '58mm' | '80mm' | 'A4';
}

// ESC/POS Command Byte Constants
const ESC = 0x1b;
const GS = 0x1d;

export const ESC_POS_COMMANDS = {
  INIT: [ESC, 0x40], // ESC @
  ALIGN_LEFT: [ESC, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [ESC, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [ESC, 0x61, 0x02], // ESC a 2
  EMPHASIZE_ON: [ESC, 0x45, 0x01], // ESC E 1
  EMPHASIZE_OFF: [ESC, 0x45, 0x00], // ESC E 0
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10], // ESC ! 16
  DOUBLE_WIDTH: [ESC, 0x21, 0x20], // ESC ! 32
  DOUBLE_ALL: [ESC, 0x21, 0x30], // ESC ! 48
  NORMAL_TEXT: [ESC, 0x21, 0x00], // ESC ! 0
  PAPER_FEED: [ESC, 0x64, 0x03], // Feed 3 lines
  PAPER_CUT_FULL: [GS, 0x56, 0x00], // GS V 0
  PAPER_CUT_PARTIAL: [GS, 0x56, 0x01], // GS V 1
  CASH_DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (Pin 2, 50ms pulse)
};

/** Convert text string to raw Uint8Array buffer */
function textToBytes(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

/** Format a two-column line (left aligned label, right aligned value) */
function formatTwoColumns(left: string, right: string, width = 42): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right + '\n';
}

/** Generate raw binary ESC/POS byte array for an order */
export function generateEscPosBuffer(data: ReceiptData, kickDrawer = true): Uint8Array {
  const bytes: number[] = [];
  const colWidth = data.paperSize === '58mm' ? 32 : 42;
  const divider = '-'.repeat(colWidth) + '\n';

  // 1. Initialize printer
  bytes.push(...ESC_POS_COMMANDS.INIT);

  // 2. Pulse cash drawer if enabled
  if (kickDrawer) {
    bytes.push(...ESC_POS_COMMANDS.CASH_DRAWER_KICK);
  }

  // 3. Header (Center Aligned)
  bytes.push(...ESC_POS_COMMANDS.ALIGN_CENTER);
  bytes.push(...ESC_POS_COMMANDS.DOUBLE_ALL);
  bytes.push(...textToBytes((data.branding?.receiptHeader || 'vibe-pos Store') + '\n'));

  bytes.push(...ESC_POS_COMMANDS.NORMAL_TEXT);
  bytes.push(...textToBytes(new Date(data.createdAt).toLocaleString() + '\n'));
  bytes.push(...textToBytes(`Order Ref: #${data.orderId}\n`));

  if (data.tableName) {
    bytes.push(...textToBytes(`Table: ${data.tableName}\n`));
  }
  if (data.roomNumber) {
    bytes.push(...textToBytes(`Room: #${data.roomNumber}\n`));
  }
  bytes.push(...textToBytes(`Cashier: ${data.cashierName}\n`));

  // 4. Item List (Left Aligned)
  bytes.push(...ESC_POS_COMMANDS.ALIGN_LEFT);
  bytes.push(...textToBytes(divider));
  bytes.push(
    ...textToBytes(
      formatTwoColumns('ITEM / QTY', `PRICE (${data.currencySymbol})`, colWidth)
    )
  );
  bytes.push(...textToBytes(divider));

  for (const item of data.items) {
    const itemLeft = `${item.name} x${item.qty}`;
    const itemRight = (item.price * item.qty).toFixed(2);
    bytes.push(...textToBytes(formatTwoColumns(itemLeft, itemRight, colWidth)));
  }

  bytes.push(...textToBytes(divider));

  // 5. Totals
  bytes.push(
    ...textToBytes(
      formatTwoColumns('Subtotal', `${data.currencySymbol}${data.subtotal.toFixed(2)}`, colWidth)
    )
  );

  if (data.discount > 0) {
    bytes.push(
      ...textToBytes(
        formatTwoColumns(
          'Discount',
          `-${data.currencySymbol}${data.discount.toFixed(2)}`,
          colWidth
        )
      )
    );
  }

  bytes.push(
    ...textToBytes(
      formatTwoColumns('Tax', `${data.currencySymbol}${data.tax.toFixed(2)}`, colWidth)
    )
  );

  bytes.push(...ESC_POS_COMMANDS.EMPHASIZE_ON);
  bytes.push(...ESC_POS_COMMANDS.DOUBLE_HEIGHT);
  bytes.push(
    ...textToBytes(
      formatTwoColumns(
        'TOTAL',
        `${data.currencySymbol}${data.total.toFixed(2)}`,
        Math.floor(colWidth / 1.5)
      )
    )
  );
  bytes.push(...ESC_POS_COMMANDS.NORMAL_TEXT);
  bytes.push(...ESC_POS_COMMANDS.EMPHASIZE_OFF);

  // 6. Footer
  bytes.push(...ESC_POS_COMMANDS.ALIGN_CENTER);
  bytes.push(...textToBytes('\n' + (data.branding?.receiptFooter || 'Thank you for your visit!') + '\n\n'));

  // 7. Cut Paper
  bytes.push(...ESC_POS_COMMANDS.PAPER_FEED);
  bytes.push(...ESC_POS_COMMANDS.PAPER_CUT_PARTIAL);

  return new Uint8Array(bytes);
}

/** Kick cash drawer independently */
export function generateCashDrawerKickBuffer(): Uint8Array {
  return new Uint8Array(ESC_POS_COMMANDS.CASH_DRAWER_KICK);
}

/** Print thermal receipt using Browser Window Print API with exact thermal dimensions */
export function printReceiptViaBrowser(data: ReceiptData): void {
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    alert('Please allow popups to print receipt');
    return;
  }

  const is58mm = data.paperSize === '58mm';
  const widthPx = is58mm ? '200px' : '280px';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt #${data.orderId}</title>
        <style>
          @page {
            size: ${is58mm ? '58mm' : '80mm'} auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.3;
            width: ${widthPx};
            margin: 0 auto;
            padding: 10px 5px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .title { font-size: 15px; font-weight: bold; margin-bottom: 4px; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">${data.branding?.receiptHeader || 'vibe-pos'}</div>
          <div>${new Date(data.createdAt).toLocaleString()}</div>
          <div>Ref: #${data.orderId}</div>
          ${data.tableName ? `<div>Table: ${data.tableName}</div>` : ''}
          ${data.roomNumber ? `<div>Room: #${data.roomNumber}</div>` : ''}
          <div>Cashier: ${data.cashierName}</div>
        </div>

        <div class="divider"></div>

        <div>
          ${data.items
            .map(
              (i) => `
            <div class="row">
              <span>${i.name} x${i.qty}</span>
              <span>${data.currencySymbol}${(i.price * i.qty).toFixed(2)}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>Subtotal:</span>
          <span>${data.currencySymbol}${data.subtotal.toFixed(2)}</span>
        </div>
        ${
          data.discount > 0
            ? `
          <div class="row">
            <span>Discount:</span>
            <span>-${data.currencySymbol}${data.discount.toFixed(2)}</span>
          </div>`
            : ''
        }
        <div class="row">
          <span>Tax:</span>
          <span>${data.currencySymbol}${data.tax.toFixed(2)}</span>
        </div>
        <div class="row total-row">
          <span>TOTAL:</span>
          <span>${data.currencySymbol}${data.total.toFixed(2)}</span>
        </div>

        <div class="divider"></div>

        <div class="text-center" style="margin-top: 10px;">
          ${data.branding?.receiptFooter || 'Thank you for your business!'}
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
