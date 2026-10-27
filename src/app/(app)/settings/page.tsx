import { getSettings } from "@/server/settings";
import { GeneralSettings } from "./general-settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  return <GeneralSettings settings={await getSettings()} />;
}
