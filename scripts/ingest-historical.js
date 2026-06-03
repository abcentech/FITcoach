const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(DB_PATH);

// Helper to calculate trading session
function getSession(date) {
    const hour = date.getHours();
    if (hour >= 0 && hour < 8) return 'Asia';
    if (hour >= 8 && hour < 13) return 'London';
    if (hour >= 13 && hour < 17) return 'Overlap'; // London/NY Overlap
    if (hour >= 17 && hour < 22) return 'NY';
    return 'Asia'; // Late NY / Early Asia
}

async function ingest() {
    console.log('🚀 Starting Robust Historical Ingestion...');
    
    // Ensure schema exists (self-contained — no dependency on drizzle-kit)
    db.exec(`
        CREATE TABLE IF NOT EXISTS weeks (
            id TEXT PRIMARY KEY,
            week INTEGER NOT NULL,
            month TEXT,
            year INTEGER,
            dateRange TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'reviewed',
            sourceType TEXT NOT NULL DEFAULT 'historical',
            brokerNet REAL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            screenshots TEXT,
            summary TEXT,
            coach TEXT
        );
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
            trade_id INTEGER NOT NULL,
            dateTime TEXT,
            executionTime TEXT,
            session TEXT,
            symbol TEXT,
            instrument TEXT,
            dir TEXT,
            lot REAL,
            entry REAL,
            exit REAL,
            pnl REAL,
            high REAL,
            low REAL,
            grade TEXT DEFAULT 'Pending',
            hold TEXT DEFAULT 'Pending chart review',
            tag TEXT DEFAULT 'Needs review',
            h1 TEXT DEFAULT 'Awaiting 1H context',
            m15 TEXT DEFAULT 'Awaiting 15M context',
            setupType TEXT,
            month TEXT,
            year INTEGER
        );
    `);
    console.log('✅ Schema ready.');
    
    const filePath = process.argv[2] || 'C:\\Users\\ADMIN\\Documents\\ark fund trading\\Jan1_May1_26_exness - Copy.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Read raw rows to find the "Deals" section
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const dealsHeaderIdx = rawData.findIndex(row => row.includes('Deals'));
    if (dealsHeaderIdx === -1) {
        throw new Error('Could not find "Deals" section in the Excel file.');
    }
    
    // The headers are usually the row after the "Deals" title
    const headers = rawData[dealsHeaderIdx + 1];
    const dealsData = rawData.slice(dealsHeaderIdx + 2);
    
    console.log(`📍 Found Deals section at row ${dealsHeaderIdx}. Headers:`, headers);

    // Map column names to indices
    const col = (name) => headers.indexOf(name);
    const idxTime = col('Time');
    const idxSymbol = col('Symbol');
    const idxType = col('Type');
    const idxDir = col('Direction');
    const idxComm = col('Commission');
    const idxSwap = col('Swap');
    const idxProfit = col('Profit');
    const idxBalance = col('Balance');

    const tradesByWeek = {};
    let totalPnlVerified = 0;
    let tradeCount = 0;

    for (const row of dealsData) {
        // Stop if we hit an empty row or a new section
        if (!row[idxTime] || row[idxTime] === 'Time' || String(row[idxTime]).includes('Summary')) break;

        const type = String(row[idxType]).toLowerCase();
        const direction = String(row[idxDir]).toLowerCase();
        
        // Skip balance/deposit/withdrawal rows for trade analytics
        if (type === 'balance') {
            console.log(`💰 Skip Balance Row: ${row[idxProfit]} (New Balance: ${row[idxBalance]})`);
            continue;
        }

        // Only count 'out' or 'in/out' as trade completions for the UI
        // But for P&L we should sum everything to be safe, OR just take 'out' rows which contain the realized P&L
        if (direction !== 'out' && direction !== 'in/out') {
            // This is likely an 'in' (entry), so P&L is 0
            continue;
        }

        const dateStr = row[idxTime];
        const date = new Date(dateStr.replace(/\./g, '/'));
        if (isNaN(date.getTime())) continue;

        const pnl = parseFloat(row[idxProfit] || 0);
        const comm = parseFloat(row[idxComm] || 0);
        const swap = parseFloat(row[idxSwap] || 0);
        const netTradePnl = pnl + comm + swap;

        totalPnlVerified += netTradePnl;
        tradeCount++;

        // Grouping logic
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const weekId = `${year}-W${weekNum}`;

        if (!tradesByWeek[weekId]) {
            tradesByWeek[weekId] = {
                id: uuidv4(),
                weekNumber: weekNum,
                month: monthName,
                year: year,
                startDate: dateStr.split(' ')[0],
                trades: []
            };
        }

        tradesByWeek[weekId].trades.push({
            id: uuidv4(),
            symbol: row[idxSymbol] || 'UNK',
            dir: row[idxType].includes('buy') ? 'Buy' : 'Sell',
            pnl: netTradePnl,
            dateTime: dateStr,
            session: getSession(date),
            executionTime: dateStr.split(' ')[1]
        });
    }

    console.log(`✅ Processed ${tradeCount} trade executions.`);
    console.log(`📈 Verified Net P&L: ${totalPnlVerified.toFixed(2)}`);

    // Insert into DB
    const insertWeek = db.prepare(`
        INSERT INTO weeks (id, week, month, year, dateRange, summary, coach)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTrade = db.prepare(`
        INSERT INTO trades (id, week_id, trade_id, symbol, dir, pnl, dateTime, session, executionTime, month, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
        for (const weekId in tradesByWeek) {
            const w = tradesByWeek[weekId];
            const net = w.trades.reduce((s, t) => s + t.pnl, 0);
            const wins = w.trades.filter(t => t.pnl > 0).length;
            
            const summary = {
                netPnL: net,
                tradesCount: w.trades.length,
                winRate: (wins / w.trades.length),
                bestAsset: 'N/A',
                coachNotes: net > 0 ? "Strong performance. Maintain discipline." : "Rough period. Review execution and risk."
            };

            const coach = {
                verdict: net > 0 
                    ? `Excellent week! You maintained a positive edge with a ${(wins / w.trades.length * 100).toFixed(1)}% win rate. Focus on scaling your winning setups.`
                    : `Challenging week with a total net of ${net.toFixed(2)}. Review your entries and ensure you are not revenge trading.`,
                score: Math.min(10, Math.max(1, Math.round((wins / w.trades.length) * 10 + (net > 0 ? 2 : 0)))),
                tone: net > 0 ? "green" : "red"
            };
            
            insertWeek.run(w.id, w.weekNumber, w.month, w.year, w.startDate, JSON.stringify(summary), JSON.stringify(coach));

            let seqId = 1;
            for (const t of w.trades) {
                insertTrade.run(t.id, w.id, seqId++, t.symbol, t.dir, t.pnl, t.dateTime, t.session, t.executionTime, w.month, w.year);
            }
        }
    })();

    console.log('🎉 Database updated successfully!');
}

ingest().catch(console.error);
