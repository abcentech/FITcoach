import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured in .env.local" }, { status: 500 });
    }

    const body = await req.json();
    const { mode, chatHistory, currentStats, weekData, userMessage } = body;

    if (mode === 'weekly-review') {
      const prompt = `You are the ultimate elite trading performance coach at FITpips.
Analyze this trading week's metrics and write a brutal, high-fidelity coaching review.
Target any behavioral leaks (e.g. overtrading, holding onto losers too long, running scalp trades, trading bad symbols).

Weekly Statistics:
- Week: ${weekData.week}
- Date Range: ${weekData.dateRange}
- Net P&L: $${weekData.summary?.netPnL?.toFixed(2) || '0.00'}
- Gross Profit: $${weekData.summary?.grossProfit?.toFixed(2) || '0.00'}
- Gross Loss: $${weekData.summary?.grossLoss?.toFixed(2) || '0.00'}
- Win Rate: ${(weekData.summary?.winRate * 100)?.toFixed(1) || '0'}%
- Profit Factor: ${weekData.summary?.profitFactor?.toFixed(2) || '0.00'}
- Best Trade: $${weekData.summary?.bestTrade?.toFixed(2) || '0.00'}
- Worst Trade: $${weekData.summary?.worstTrade?.toFixed(2) || '0.00'}
- Top Leaks: ${JSON.stringify(weekData.summary?.topLeaks || [])}

Provide your evaluation in a clear markdown structure:
1. **Coach Verdict** (Brutal summary of the week: trade normally, reduce risk, or stop and review)
2. **Behavioral Leak Analysis** (Identify the biggest structural and execution mistakes)
3. **Weekly Game Plan** (3 specific actionable rules to follow for the next week)

Keep it professional, highly motivating, and concise.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
      });

      return NextResponse.json({ review: response.choices[0].message.content });
    }

    // Default: Interactive Chat Mode
    const systemPrompt = `You are "Coach Pip", the elite trading performance AI coach for FITpips.
You have access to the trader's historical stats and current account health.
Analyze their questions, reference their metrics, call out their bad habits, and give precise, professional trading advice.

Current Account Statistics:
- Total Trades: ${currentStats?.trades || 0}
- Net P&L: $${currentStats?.netPnL?.toFixed(2) || '0.00'}
- Win Rate: ${(currentStats?.winRate * 100)?.toFixed(1) || '0'}%
- Profit Factor: ${currentStats?.profitFactor?.toFixed(2) || '0.00'}
- Expectancy: $${currentStats?.expectancy?.toFixed(2) || '0.00'}
- Sharpe Ratio: ${currentStats?.sharpeRatio?.toFixed(2) || '0.00'}
- Biggest leaks: ${JSON.stringify(currentStats?.topLeaks || [])}

Keep responses brief, professional, and directly focused on trading psychology, risk management, and setup discipline.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(chatHistory || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages
    });

    return NextResponse.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error("AI Coach API Error:", error);
    return NextResponse.json({ error: "Failed to communicate with AI Coach." }, { status: 500 });
  }
}
