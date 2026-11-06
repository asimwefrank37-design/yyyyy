import mongoose from "mongoose";
import { AiUsage } from "../model/aiUsage.model";

export interface AiUsageSnapshot {
  used: number;
  limit: number;
  remaining: number;
}

export class AiLimitError extends Error {
  readonly usage: AiUsageSnapshot;

  constructor(usage: AiUsageSnapshot) {
    super(
      `You have used today's ${usage.limit} AI requests. You can keep writing without the assistant.`,
    );
    this.name = "AiLimitError";
    this.usage = usage;
  }
}

const memoryCounts = new Map<string, number>();

export const dailyLimit = () => {
  const parsed = Number(process.env.AI_DAILY_LIMIT ?? 20);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.floor(parsed);
};

export const todayKey = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const snapshot = (used: number): AiUsageSnapshot => {
  const limit = dailyLimit();
  return {
    used,
    limit,
    remaining: Math.max(limit - used, 0),
  };
};

const mongoReady = () => mongoose.connection.readyState === 1;

export const getAiUsage = async (userId: string): Promise<AiUsageSnapshot> => {
  const date = todayKey();

  if (!mongoReady()) {
    return snapshot(memoryCounts.get(`${userId}:${date}`) ?? 0);
  }

  const record = await AiUsage.findOne({ userId, date });
  return snapshot(record?.count ?? 0);
};

export const consumeAiRequest = async (userId: string): Promise<AiUsageSnapshot> => {
  const date = todayKey();
  const limit = dailyLimit();

  if (!mongoReady()) {
    const key = `${userId}:${date}`;
    const used = memoryCounts.get(key) ?? 0;
    if (used >= limit) {
      throw new AiLimitError(snapshot(used));
    }
    memoryCounts.set(key, used + 1);
    return snapshot(used + 1);
  }

  const updated = await AiUsage.findOneAndUpdate(
    { userId, date, count: { $lt: limit } },
    { $inc: { count: 1 } },
    { new: true },
  );

  if (updated) {
    return snapshot(updated.count);
  }

  const existing = await AiUsage.findOne({ userId, date });
  if (!existing) {
    try {
      const created = await AiUsage.create({ userId, date, count: 1 });
      return snapshot(created.count);
    } catch {
      const raced = await AiUsage.findOne({ userId, date });
      if (raced && raced.count < limit) {
        raced.count += 1;
        await raced.save();
        return snapshot(raced.count);
      }
      throw new AiLimitError(snapshot(raced?.count ?? limit));
    }
  }

  throw new AiLimitError(snapshot(existing.count));
};
