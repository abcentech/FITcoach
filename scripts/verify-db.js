const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

const weeks = db.prepare('SELECT id, week, month, year, dateRange, summary, coach FROM weeks ORDER BY year, week').all();
console.log('\n=== WEEKS IN DB ===');
weeks.forEach(w => {
  const s = JSON.parse(w.summary || '{}');
  const c = JSON.parse(w.coach || '{}');
  const net = typeof s.netPnL === 'number' ? s.netPnL.toFixed(2) : s.netPnL;
  const wr = typeof s.winRate === 'number' ? (s.winRate * 100).toFixed(1) + '%' : s.winRate;
  console.log(`Week ${w.week} | ${w.month} ${w.year} | Net: $${net} | Trades: ${s.tradesCount} | WR: ${wr}`);
  if (c.verdict) console.log('  Coach:', c.verdict.slice(0, 80));
});

const total = db.prepare('SELECT sum(pnl) as t, count(*) as c FROM trades').get();
console.log('\n=== OVERALL TOTALS ===');
console.log('Total NET P&L: $' + total.t.toFixed(2));
console.log('Total Trades:', total.c);

const byMonth = db.prepare('SELECT month, year, sum(pnl) as net, count(*) as cnt FROM trades GROUP BY month, year ORDER BY year, min(dateTime)').all();
console.log('\n=== MONTHLY BREAKDOWN ===');
byMonth.forEach(m => console.log(m.month, m.year, '| Net: $' + m.net.toFixed(2), '| Trades:', m.cnt));
