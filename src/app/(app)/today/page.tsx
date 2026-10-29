import { requirePageUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { getSettings } from "@/server/settings";
import { buildToday, localToday } from "@/server/services/today";
import { TodayView } from "./today-view";

export const metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requirePageUser();
  const db = getDb();
  const settings = await getSettings(db);
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localToday(settings.plan.timeZone);
  const data = await buildToday(db, settings, date);
  return <TodayView data={data} firstName={user.name.split(" ")[0]} isToday={date === localToday(settings.plan.timeZone)} />;
}
