import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '', // User must set this in .env.local
});

export async function POST(req) {
  try {
    const payload = await req.json();
    const { weekNumber, images } = payload;
    
    // We expect images.pnl to be an object { name, dataUrl } containing the Base64 image
    if (!images || !images.pnl || !images.pnl.dataUrl) {
      return NextResponse.json({ error: "Missing P&L screenshot data." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured in .env.local" }, { status: 500 });
    }

    // Try to handle both standard base64 and Next.js /uploads/ relative paths if we changed it earlier
    // Actually, in the page.js we left the pnlImage compressImage logic inside UploadBox if it's "pictures" mode!
    // Wait, earlier I replaced `compressImage` with `uploadFileToServer`. 
    // If it's a server URL (e.g., `/uploads/uuid.jpg`), OpenAI vision requires a public URL or base64. 
    // Since we are running on localhost, OpenAI cannot reach `/uploads/...`.
    // So if the frontend is passing the local URL, we need to read it from the local disk and convert to Base64 to send to OpenAI.
    
    let base64Image = "";
    if (images.pnl.dataUrl.startsWith('data:image')) {
      base64Image = images.pnl.dataUrl.split(',')[1];
    } else {
       // It's a local file path like /uploads/filename.jpg
       const fs = require('fs');
       const path = require('path');
       const filePath = path.join(process.cwd(), 'public', images.pnl.dataUrl);
       const fileBuffer = fs.readFileSync(filePath);
       base64Image = fileBuffer.toString('base64');
    }

    // Call OpenAI GPT-4o vision model to parse the MT4 screenshot
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert financial data extractor. I will provide an image of a MetaTrader 4/5 trade history.
          Extract the list of closed trades. Return ONLY a pure JSON object in the following format:
          {
            "brokerNet": 39.86,
            "trades": [
              {
                "dateTime": "YYYY-MM-DD HH:MM",
                "symbol": "XAUUSDm",
                "dir": "Buy" or "Sell",
                "lot": 0.01,
                "entry": 1234.56,
                "exit": 1235.67,
                "pnl": 25.50
              }
            ]
          }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the trades from this account history screenshot." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const parsedContent = JSON.parse(response.choices[0].message.content);
    
    // Format to match what the frontend expects
    const result = {
      week: weekNumber,
      dateRange: `Week ${weekNumber}`,
      brokerNet: parsedContent.brokerNet,
      trades: parsedContent.trades.map((t, i) => ({
        id: i + 1,
        dateTime: t.dateTime,
        symbol: t.symbol,
        dir: t.dir,
        lot: t.lot,
        entry: t.entry,
        exit: t.exit,
        pnl: t.pnl,
        grade: "Pending",
        hold: "Pending chart review",
        tag: "Needs review",
        setupType: ""
      }))
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: "Failed to analyze screenshots." }, { status: 500 });
  }
}
