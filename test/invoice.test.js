'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

// Saved order lines have price, qty, and HSN; gstRate is absent in persisted
// orders. null represents an absent explicit rate; tax.js resolves the HSN slab.
function line(name, sku, hsn, price, qty) {
  return { name, sku, hsn, price, qty, gstRate: null };
}

function checkOrder(items, coupon, expectedInvoice, expectedCheckout) {
  const order = { items, coupon };
  const invoiceFigures = invoice.computeInvoiceFigures(order);
  const checkoutFigures = pricing.computeTotals(items, coupon);

  assert.deepEqual(invoiceFigures, expectedInvoice);
  assert.deepEqual(
    {
      subtotal: checkoutFigures.subtotal,
      discount: checkoutFigures.discount,
      tax: checkoutFigures.tax,
      total: checkoutFigures.total
    },
    expectedCheckout
  );
}

test('invoice matches checkout HSN GST and capped coupon totals', function () {
  const fixtures = [
    {
      id: 1001,
      coupon: '',
      items: [
        line('Assam CTC Masala Chai 250g', 'BEV-001', '0902', 140, 2),
        line('Unpolished Toor Dal 1kg', 'GRN-002', '0713', 165, 2)
      ]
    },
    {
      id: 1002,
      coupon: 'SAVE10',
      items: [
        line('Indrayani Basmati Rice 5kg', 'GRN-001', '1006', 640, 1),
        line('Cold-Pressed Sunflower Oil 1L', 'OIL-001', '1512', 190, 2)
      ]
    },
    {
      id: 1004,
      coupon: 'SAVE10',
      items: [line('Cold-Pressed Groundnut Oil 5L', 'OIL-002', '1508', 1120, 2)]
    },
    {
      id: 1008,
      coupon: '',
      items: [
        line('Assam CTC Masala Chai 250g', 'BEV-001', '0902', 140, 1),
        line('Kokum Sherbet Concentrate 750ml', 'BEV-003', '2106', 180, 2)
      ]
    }
  ];

  fixtures.forEach(function (fixture) {
    const invoiceFigures = invoice.computeInvoiceFigures({ items: fixture.items, coupon: fixture.coupon });
    const checkoutFigures = pricing.computeTotals(fixture.items, fixture.coupon);

    assert.deepEqual(
      {
        subtotal: invoiceFigures.subtotal,
        discount: invoiceFigures.discount,
        tax: invoiceFigures.tax,
        cgst: invoiceFigures.cgst,
        sgst: invoiceFigures.sgst,
        total: invoiceFigures.total,
        lines: invoiceFigures.rows.map(function (row) {
          return { gstPercent: row.gstPercent, tax: row.lineTax };
        })
      },
      {
        subtotal: checkoutFigures.subtotal,
        discount: checkoutFigures.discount,
        tax: checkoutFigures.tax,
        cgst: checkoutFigures.cgst,
        sgst: checkoutFigures.sgst,
        total: checkoutFigures.total,
        lines: checkoutFigures.lines.map(function (lineItem) {
          return { gstPercent: lineItem.gstPercent, tax: lineItem.tax };
        }),
      },
      'invoice figures should match checkout for order #' + fixture.id
    );
  });
});

test('#1001 invoice applies mixed HSN slabs without a coupon', function () {
  checkOrder(
    [
      line('Assam CTC Masala Chai 250g', 'BEV-001', '0902', 140, 2),
      line('Unpolished Toor Dal 1kg', 'GRN-002', '0713', 165, 2)
    ],
    '',
    {
      subtotal: 610,
      discount: 0,
      tax: 66.9,
      cgst: 33.45,
      sgst: 33.45,
      total: 676.9,
      rows: [
        { name: 'Assam CTC Masala Chai 250g', sku: 'BEV-001', hsn: '0902', qty: 2, price: 140, gstPercent: 18, line: 280, lineTax: 50.4 },
        { name: 'Unpolished Toor Dal 1kg', sku: 'GRN-002', hsn: '0713', qty: 2, price: 165, gstPercent: 5, line: 330, lineTax: 16.5 }
      ]
    },
    { subtotal: 610, discount: 0, tax: 66.9, total: 676.9 }
  );
});

test('#1002 invoice applies SAVE10 to subtotal before HSN GST', function () {
  checkOrder(
    [
      line('Indrayani Basmati Rice 5kg', 'GRN-001', '1006', 640, 1),
      line('Cold-Pressed Sunflower Oil 1L', 'OIL-001', '1512', 190, 2)
    ],
    'SAVE10',
    {
      subtotal: 1020,
      discount: 102,
      tax: 45.9,
      cgst: 22.95,
      sgst: 22.95,
      total: 963.9,
      rows: [
        { name: 'Indrayani Basmati Rice 5kg', sku: 'GRN-001', hsn: '1006', qty: 1, price: 640, gstPercent: 5, line: 640, lineTax: 28.8 },
        { name: 'Cold-Pressed Sunflower Oil 1L', sku: 'OIL-001', hsn: '1512', qty: 2, price: 190, gstPercent: 5, line: 380, lineTax: 17.1 }
      ]
    },
    { subtotal: 1020, discount: 102, tax: 45.9, total: 963.9 }
  );
});

test('#1004 invoice respects the SAVE10 cap before HSN GST', function () {
  checkOrder(
    [line('Cold-Pressed Groundnut Oil 5L', 'OIL-002', '1508', 1120, 2)],
    'SAVE10',
    {
      subtotal: 2240,
      discount: 150,
      tax: 104.5,
      cgst: 52.25,
      sgst: 52.25,
      total: 2194.5,
      rows: [
        { name: 'Cold-Pressed Groundnut Oil 5L', sku: 'OIL-002', hsn: '1508', qty: 2, price: 1120, gstPercent: 5, line: 2240, lineTax: 104.5 }
      ]
    },
    { subtotal: 2240, discount: 150, tax: 104.5, total: 2194.5 }
  );
});

test('CURRENT BEHAVIOUR: #1008 invoice and checkout agree for HSN items at 18% without coupon', function () {
  checkOrder(
    [
      line('Assam CTC Masala Chai 250g', 'BEV-001', '0902', 140, 1),
      line('Kokum Sherbet Concentrate 750ml', 'BEV-003', '2106', 180, 2)
    ],
    '',
    {
      subtotal: 500,
      discount: 0,
      tax: 90,
      cgst: 45,
      sgst: 45,
      total: 590,
      rows: [
        { name: 'Assam CTC Masala Chai 250g', sku: 'BEV-001', hsn: '0902', qty: 1, price: 140, gstPercent: 18, line: 140, lineTax: 25.2 },
        { name: 'Kokum Sherbet Concentrate 750ml', sku: 'BEV-003', hsn: '2106', qty: 2, price: 180, gstPercent: 18, line: 360, lineTax: 64.8 }
      ]
    },
    { subtotal: 500, discount: 0, tax: 90, total: 590 }
  );
});
