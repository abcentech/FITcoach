import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../db/auth";
import OpenAI from "openai";

async function queryGemini(systemPrompt, contents, apiKey) {
  // Let's try gemini-2.0-flash first.
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: systemPrompt ? {
        parts: [{ text: systemPrompt }]
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error("Empty response from Gemini");
  return reply;
}

// Highly detailed rule-based fallback generator simulating Coach Pip
function generateLocalCoachFeedback(summary, recentTrades, question = "", mode = "chat") {
  const wr = (summary?.winRate || 0) * 100;
  const pnl = summary?.netPnL || 0;
  const tradesCount = summary?.trades || 0;
  const leaks = summary?.topLeaks || [];
  const commonLeak = leaks.length > 0 ? `${leaks[0].value} (category: ${leaks[0].category})` : "no major leaks yet";
  
  if (mode === "weekly-review") {
    const verdict = pnl >= 0 ? "STABILITY MODE" : "DEFENSE MODE";
    const statusAdvice = pnl >= 0 
      ? "Process is stable, but minor leaks exist. Do not get over-confident."
      : "Process is compromised. Prioritize capital preservation over recovery immediately.";

    return `### Coach Weekly Verdict
**Mode: ${verdict}**
${statusAdvice} (Win rate: ${wr.toFixed(1)}%, Net P&L: $${pnl.toFixed(2)} across ${tradesCount} trades)

### Behavioral Leak Analysis
Your stats show that the primary source of drag is **${commonLeak}**. In addition, review your exit efficiency. Overtrading or chasing setups when market context is suboptimal is hurting your bottom line.

### Game Plan for Next Week
1. **Reduce risk per trade by 50%** until win rate climbs back above 50%.
2. **Hard stop at 3 trades** per day to eliminate emotional revenge trading.
3. Align 1H structure with 15M trigger before entry. No counter-trend positions.`;
  }

  // Chat queries matching keyword patterns
  const query = String(question).toLowerCase();
  
  if (query.includes("leak") || query.includes("mistake") || query.includes("error")) {
    return `Coach Pip (Fallback Mode): Your biggest leak is **${commonLeak}**. When trading this asset or during these times, you are experiencing high negative drag. Eliminate this specific setup or time window for your next 10 trades and monitor the result.`;
  }
  
  if (query.includes("hour") || query.includes("time") || query.includes("when")) {
    return `Coach Pip (Fallback Mode): Looking at your session distribution, your performance varies. Check the Hourly Heatmap inside the Analytics tab to avoid low-probability zones. Generally, NY overlap is high volatility; ensure you aren't trading NY late session chop.`;
  }

  if (query.includes("symbol") || query.includes("pair") || query.includes("gold") || query.includes("btc")) {
    const goldTrade = (recentTrades || []).find(t => String(t.symbol).toUpperCase().includes("XAU"));
    return `Coach Pip (Fallback Mode): Gold (XAUUSD) has historically high reward potential but demands perfect alignment. Bitcoin (BTC) must be restricted to clear A+ structure breakouts. Avoid trading both simultaneously to limit correlation risk.`;
  }

  if (query.includes("risk") || query.includes("kelly") || query.includes("size")) {
    return `Coach Pip (Fallback Mode): Your current win rate of ${wr.toFixed(1)}% suggests a conservative leverage profile. Keep position risk strictly under 1% to 1.5% per trade. Never increase sizing during a losing streak to force recovery.`;
  }

  if (query.includes("overtrade") || query.includes("count") || query.includes("many")) {
    return `Coach Pip (Fallback Mode): Overtrading is active when you exceed 3 trades daily. If you notice yourself taking low-quality setups after a loss, close the platform immediately. Settle for 1 clear setup per day.`;
  }

  return `Coach Pip (Fallback Mode): I'm analyzing your profile (Win Rate: ${wr.toFixed(1)}%, P&L: $${pnl.toFixed(2)}, ${tradesCount} trades). Focus on keeping risk minimal, scaling only Grade A plays, and avoiding ${commonLeak}. What specific rule or setup would you like to review?`;
}

export async function POST(req) {
  const body = await req.json();
  const { mode, message, chatHistory, context } = body;
  const { summary, recentTrades, weekData } = context || {};

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (mode === "weekly-review") {
      const prompt = `You are the ultimate elite trading performance coach at FITpips.
Analyze this trading week's metrics and write a diagnostic coaching review.
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
### Coach Weekly Verdict
(Brutal summary of the week's execution and whether the trader should trade normally, reduce risk, or stop and review)

### Behavioral Leak Analysis
(Highlight the major emotional or procedural mistakes, referencing the statistics)

### Game Plan for Next Week
(List 3 actionable, specific rules they must follow in their next sessions)

Keep it professional, highly motivating, and concise.`;

      if (geminiKey) {
        try {
          const reply = await queryGemini("You are a professional trading coach.", [{ role: "user", parts: [{ text: prompt }] }], geminiKey);
          return NextResponse.json({ reply });
        } catch (geminiError) {
          console.error("Gemini failed, trying OpenAI fallback:", geminiError);
          if (openaiKey) {
            const openai = new OpenAI({ apiKey: openaiKey });
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: prompt }]
            });
            return NextResponse.json({ reply: response.choices[0].message.content });
          }
          throw geminiError; // escalate to trigger local rule-based fallback
        }
      } else if (openaiKey) {
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }]
        });
        return NextResponse.json({ reply: response.choices[0].message.content });
      } else {
        throw new Error("No API keys configured");
      }
    }

    // Default: Conversational Chat Mode
    const dataContext = `
Trader Statistics:
- Total trades: ${summary?.trades || 0}
- Win rate: ${((summary?.winRate || 0) * 100).toFixed(1)}%
- Net PnL: $${(summary?.netPnL || 0).toFixed(2)}
- Profit factor: ${(summary?.profitFactor || 0).toFixed(2)}
- Expectancy: $${(summary?.expectancy || 0).toFixed(2)}
- Sharpe ratio: ${(summary?.sharpeRatio || 0).toFixed(2)}
- Top leaks: ${JSON.stringify(summary?.topLeaks || [])}

Recent trades sample:
${(recentTrades || []).slice(0, 15).map(t => `${t.dateTime} ${t.symbol} ${t.dir} PnL:$${t.pnl} Grade:${t.grade}`).join('\n')}
`;

    const systemPrompt = `You are "Coach Pip", the elite trading performance AI coach for FITpips.
You have access to the trader's stats and current account health.
Analyze their questions, reference their metrics, call out their bad habits, and give precise, professional trading advice.

Current Account Statistics:
${dataContext}

Keep responses brief, professional, and directly focused on trading psychology, risk management, and setup discipline.`;

    if (geminiKey) {
      const contents = [];
      if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(msg => {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        });
      } else if (message) {
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }
      try {
        const reply = await queryGemini(systemPrompt, contents, geminiKey);
        return NextResponse.json({ reply });
      } catch (geminiError) {
        console.error("Gemini failed, trying OpenAI fallback:", geminiError);
        if (openaiKey) {
          const openai = new OpenAI({ apiKey: openaiKey });
          const messages = [
            { role: "system", content: systemPrompt },
            ...(chatHistory || []).map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            })),
            { role: "user", content: message }
          ];
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages
          });
          return NextResponse.json({ reply: response.choices[0].message.content });
        }
        throw geminiError;
      }
    } else if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      const messages = [
        { role: "system", content: systemPrompt },
        ...(chatHistory || []).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: "user", content: message }
      ];
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages
      });
      return NextResponse.json({ reply: response.choices[0].message.content });
    } else {
      throw new Error("No API keys configured");
    }

  } catch (error) {
    console.error("AI Coach API error, launching fallback engine:", error);
    // Safe fallback to prevent blank UI blocks
    const localReply = generateLocalCoachFeedback(summary || weekData?.summary, recentTrades || [], message, mode);
    return NextResponse.json({ reply: localReply });
  }
}
