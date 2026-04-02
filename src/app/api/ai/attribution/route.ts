import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChannelData {
  conversions: number;
  spend?: number;
  touchpoints?: number;
  avgPosition?: number;
}

function computeAttributionModels(channelData: Record<string, ChannelData>) {
  const channels = Object.keys(channelData);
  const totalConversions = channels.reduce((s, c) => s + (channelData[c].conversions ?? 0), 0);

  if (totalConversions === 0) {
    const even = channels.reduce((acc, c) => ({ ...acc, [c]: 0 }), {} as Record<string, number>);
    return { lastClick: even, firstClick: even, linear: even, timeDecay: even, positionBased: even };
  }

  // Last-click: 100% credit to last channel (by position descending)
  const sortedByPosition = [...channels].sort((a, b) => (channelData[b].avgPosition ?? 0) - (channelData[a].avgPosition ?? 0));
  const lastClick: Record<string, number> = {};
  channels.forEach(c => { lastClick[c] = 0; });
  if (sortedByPosition[0]) lastClick[sortedByPosition[0]] = totalConversions;

  // First-click: 100% credit to first channel
  const firstClick: Record<string, number> = {};
  channels.forEach(c => { firstClick[c] = 0; });
  const sortedByFirst = [...channels].sort((a, b) => (channelData[a].avgPosition ?? 999) - (channelData[b].avgPosition ?? 999));
  if (sortedByFirst[0]) firstClick[sortedByFirst[0]] = totalConversions;

  // Linear: equal credit
  const linear: Record<string, number> = {};
  channels.forEach(c => { linear[c] = parseFloat((totalConversions / channels.length).toFixed(2)); });

  // Time-decay: exponential weighting by recency (later channels get more credit)
  const timeDecay: Record<string, number> = {};
  const decayWeights = channels.map((_, i) => Math.pow(2, i));
  const decayTotal = decayWeights.reduce((s, w) => s + w, 0);
  channels.forEach((c, i) => {
    timeDecay[c] = parseFloat(((decayWeights[i] / decayTotal) * totalConversions).toFixed(2));
  });

  // Position-based: 40% first, 40% last, 20% distributed among middle
  const positionBased: Record<string, number> = {};
  if (channels.length === 1) {
    positionBased[channels[0]] = totalConversions;
  } else if (channels.length === 2) {
    positionBased[sortedByFirst[0]] = parseFloat((totalConversions * 0.5).toFixed(2));
    positionBased[sortedByPosition[0]] = parseFloat((totalConversions * 0.5).toFixed(2));
  } else {
    const middleChannels = channels.filter(c => c !== sortedByFirst[0] && c !== sortedByPosition[0]);
    channels.forEach(c => { positionBased[c] = 0; });
    positionBased[sortedByFirst[0]] = parseFloat((totalConversions * 0.4).toFixed(2));
    positionBased[sortedByPosition[0]] = (positionBased[sortedByPosition[0]] ?? 0) + parseFloat((totalConversions * 0.4).toFixed(2));
    const middleShare = parseFloat(((totalConversions * 0.2) / (middleChannels.length || 1)).toFixed(2));
    middleChannels.forEach(c => { positionBased[c] = middleShare; });
  }

  return { lastClick, firstClick, linear, timeDecay, positionBased };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, channelData } = await request.json() as {
      clientId: string;
      channelData: Record<string, ChannelData>;
    };

    if (!clientId || !channelData) return NextResponse.json({ error: "clientId and channelData are required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const models = computeAttributionModels(channelData);

    const openai = await getOpenAiClient();

    const prompt = `You are a digital marketing attribution expert. Explain the following multi-touch attribution model results for ${client.name} in plain English.

Channel Data (conversions reported per channel):
${JSON.stringify(channelData, null, 2)}

Attribution Model Results:
${JSON.stringify(models, null, 2)}

Write a 3-4 sentence narrative explaining:
1. Which channels appear overvalued or undervalued under last-click vs linear attribution
2. What the position-based model reveals about the customer journey
3. A practical recommendation for which model to use and why

Keep it concise and actionable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ models, narrative });
  } catch (error) {
    console.error("Attribution error:", error);
    return NextResponse.json({ error: "Failed to compute attribution" }, { status: 500 });
  }
}
