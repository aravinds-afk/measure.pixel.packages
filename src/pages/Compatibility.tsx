import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, GitCompare } from "lucide-react";
import { useApp } from "../lib/app.tsx";
import { MemberPicker } from "../components/MemberPicker.tsx";
import { Avatar, Button, Card, categoryName, PageHeader } from "../components/ui.tsx";

export default function Compatibility() {
  const { members, session, memberById } = useApp();
  const nav = useNavigate();
  const [a, setA] = useState<string | null>(session?.memberId ?? null);
  const [b, setB] = useState<string | null>(null);
  const ma = memberById(a);
  const mb = memberById(b);
  return (
    <div>
      <PageHeader title="Compatibility checker" subtitle="Select any two members to see a transparent compatibility breakdown, reciprocal referral opportunities and ready-to-use scripts." />
      <Card className="mb-5 p-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Slot m={ma} placeholder="Member A" />
            <button className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Swap members" onClick={() => { setA(b); setB(a); }}><ArrowLeftRight className="h-4 w-4" /></button>
            <Slot m={mb} placeholder="Member B" />
          </div>
          <Button disabled={!a || !b || a === b} onClick={() => nav(`/compatibility/${a}/${b}`)}><GitCompare className="h-4 w-4" /> Calculate compatibility</Button>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-4"><MemberPicker label="Member A" members={members} value={a} onChange={setA} exclude={b} /></Card>
        <Card className="p-4"><MemberPicker label="Member B" members={members} value={b} onChange={setB} exclude={a} /></Card>
      </div>
    </div>
  );
}

function Slot({ m, placeholder }: { m?: ReturnType<ReturnType<typeof useApp>["memberById"]>; placeholder: string }) {
  return (
    <div className="flex w-36 items-center gap-2 sm:w-52">
      {m ? <Avatar member={m} size={40} /> : <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-300" />}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-navy-950">{m?.fullName ?? placeholder}</div>
        <div className="truncate text-xs text-slate-500">{m ? categoryName(m) : "Select below"}</div>
      </div>
    </div>
  );
}
