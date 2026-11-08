import React, { useMemo, useState } from 'react';

type DemoSection = 'overview' | 'demands' | 'collections' | 'expenses' | 'members' | 'transactions';

const sections: { id: DemoSection; label: string; short: string }[] = [
  { id: 'overview', label: 'Overview', short: 'OV' },
  { id: 'demands', label: 'Demand Register', short: 'DR' },
  { id: 'collections', label: 'Collections', short: 'CL' },
  { id: 'expenses', label: 'Expenses', short: 'EX' },
  { id: 'members', label: 'Members', short: 'MB' },
  { id: 'transactions', label: 'Transactions', short: 'TX' },
];

const demoMembers = [
  { flat: 'A-101', name: 'Aarav Mehta', demand: 2600, received: 2600, balance: 0 },
  { flat: 'A-102', name: 'Diya Shah', demand: 2600, received: 1800, balance: 800 },
  { flat: 'A-203', name: 'Kabir Patel', demand: 2600, received: 3000, balance: -400 },
  { flat: 'B-304', name: 'Anaya Rao', demand: 2600, received: 2600, balance: 0 },
  { flat: 'C-502', name: 'Vivaan Iyer', demand: 2600, received: 1300, balance: 1300 },
];

const demoTransactions = [
  { id: 'DEMO-TXN-001', date: '08 Nov 2026', party: 'Aarav Mehta · A-101', type: 'Maintenance receipt', mode: 'UPI', amount: 2600, status: 'Verified' },
  { id: 'DEMO-TXN-002', date: '07 Nov 2026', party: 'City Water Services', type: 'Water bill', mode: 'Bank', amount: -8400, status: 'Verified' },
  { id: 'DEMO-TXN-003', date: '06 Nov 2026', party: 'Diya Shah · A-102', type: 'Part payment', mode: 'UPI', amount: 1800, status: 'Pending review' },
  { id: 'DEMO-TXN-004', date: '05 Nov 2026', party: 'BrightLift Maintenance', type: 'Lift AMC', mode: 'Bank', amount: -5200, status: 'Verified' },
  { id: 'DEMO-TXN-005', date: '04 Nov 2026', party: 'Kabir Patel · A-203', type: 'Advance receipt', mode: 'UPI', amount: 3000, status: 'Verified' },
];

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const PublicDemoMode: React.FC = () => {
  const [active, setActive] = useState<DemoSection>('overview');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('November 2026');
  const filteredMembers = useMemo(() => demoMembers.filter((m) => `${m.flat} ${m.name}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const filteredTransactions = useMemo(() => demoTransactions.filter((t) => `${t.id} ${t.party} ${t.type}`.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="border-b border-indigo-900 bg-slate-950 px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-indigo-100">
        PUBLIC DEVELOPMENT MODE <span className="mx-2 text-slate-500">•</span> Synthetic sample data only — no Pearl Meadows live records are connected
      </div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-sm font-black text-white">S</div>
            <div><div className="text-lg font-bold tracking-tight">Society OS</div><div className="text-xs text-slate-500">Community finance & governance workspace</div></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">DEMO ENVIRONMENT</span>
            <a href="?mode=live" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Live workspace sign in</a>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white p-4 md:min-h-[calc(100vh-118px)] md:border-b-0 md:border-r">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</div>
          <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
            {sections.map((section) => (
              <button key={section.id} onClick={() => { setActive(section.id); setSearch(''); }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${active === section.id ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold ${active === section.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{section.short}</span>
                {section.label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <div className="text-xs font-bold text-indigo-900">Explore safely</div>
            <p className="mt-1 text-xs leading-5 text-indigo-800">All names, amounts and transactions on this page are fictional examples for product evaluation.</p>
          </div>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Development workspace</div><h1 className="mt-1 text-2xl font-bold tracking-tight">{sections.find((s) => s.id === active)?.label}</h1><p className="mt-1 text-sm text-slate-500">Sample Society · Financial year 2026–27</p></div>
            <label className="text-xs font-semibold text-slate-500">Reporting period<select value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"><option>November 2026</option><option>October 2026</option><option>September 2026</option></select></label>
          </div>
          {active === 'overview' && <Overview />}
          {active === 'demands' && <Register title="Sample Demand Register" columns={['Demand ID', 'Flat', 'Demand month', 'Charge type', 'Amount', 'Status']} rows={[
            ['DEMO-DEM-001', 'A-101', 'Nov 2026', 'Maintenance', money(2600), 'Raised'],
            ['DEMO-DEM-002', 'A-102', 'Nov 2026', 'Maintenance', money(2600), 'Part paid'],
            ['DEMO-DEM-003', 'A-203', 'Nov 2026', 'Maintenance', money(2600), 'Advance'],
            ['DEMO-DEM-004', 'B-304', 'Nov 2026', 'Maintenance', money(2600), 'Paid'],
            ['DEMO-DEM-005', 'C-502', 'Nov 2026', 'Maintenance', money(2600), 'Outstanding'],
          ]} />}
          {active === 'collections' && <div className="grid gap-4 lg:grid-cols-2"><Metric title="Collection received" value={money(11300)} note="Illustrative for selected period" /><Metric title="Collection efficiency" value="87%" note="Based on synthetic sample demand" /><div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="font-bold">Member collection summary</h2><div className="mt-4"><SimpleTable columns={['Flat', 'Demand', 'Received', 'Balance']} rows={demoMembers.map(m => [m.flat, money(m.demand), money(m.received), money(m.balance)])} /></div></div></div>}
          {active === 'expenses' && <Register title="Sample Expense Register" columns={['Date', 'Payee', 'Category', 'Payment mode', 'Amount', 'Status']} rows={[
            ['08 Nov 2026', 'City Water Services', 'Water', 'Bank', money(8400), 'Paid'],
            ['05 Nov 2026', 'BrightLift Maintenance', 'Lift AMC', 'Bank', money(5200), 'Paid'],
            ['02 Nov 2026', 'GreenScape Services', 'Housekeeping', 'UPI', money(3600), 'Paid'],
            ['01 Nov 2026', 'Power Utility', 'Electricity', 'Bank', money(7100), 'Due'],
          ]} />}
          {active === 'members' && <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Sample member balances</h2><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flat or member" className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></div><SimpleTable columns={['Flat', 'Member', 'Demand', 'Received', 'Balance']} rows={filteredMembers.map(m => [m.flat, m.name, money(m.demand), money(m.received), money(m.balance)])} /></div>}
          {active === 'transactions' && <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Sample transaction register</h2><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions" className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></div><SimpleTable columns={['Transaction ID', 'Date', 'Party / description', 'Mode', 'Amount', 'Status']} rows={filteredTransactions.map(t => [t.id, t.date, t.party + ' · ' + t.type, t.mode, money(t.amount), t.status])} /></div>}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500"><span>Society OS · Public Demo</span><span>Fictional data · No live database access</span></footer>
        </main>
      </div>
    </div>
  );
};

const Metric: React.FC<{ title: string; value: string; note: string }> = ({ title, value, note }) => <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="text-sm font-medium text-slate-500">{title}</div><div className="mt-2 text-3xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>;

const Overview: React.FC = () => <div className="space-y-5">
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Metric title="Monthly demand" value={money(13000)} note="5 sample member accounts" />
    <Metric title="Collections received" value={money(11300)} note="Illustrative period total" />
    <Metric title="Outstanding" value={money(1700)} note="Net sample member balance" />
    <Metric title="Operating expenses" value={money(24300)} note="Illustrative expense entries" />
  </div>
  <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
    <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Collection performance</h2><p className="mt-1 text-xs text-slate-500">Synthetic monthly collection trend</p><div className="mt-6 flex h-44 items-end gap-3 border-b border-slate-200 px-2">{[{m:'Jun',v:48},{m:'Jul',v:62},{m:'Aug',v:55},{m:'Sep',v:75},{m:'Oct',v:68},{m:'Nov',v:87}].map(x=><div key={x.m} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-36 w-full items-end"><div className="w-full rounded-t-md bg-indigo-600" style={{height:`${x.v}%`}} /></div><span className="text-xs text-slate-500">{x.m}</span></div>)}</div><div className="mt-3 text-xs text-slate-500">Collection efficiency (%)</div></div>
    <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Attention required</h2><div className="mt-4 space-y-3"><Notice title="2 members with outstanding balances" detail="Review member-wise balances and follow up." /><Notice title="1 transaction pending review" detail="Verify supporting evidence before posting." /><Notice title="1 utility payment due" detail="Check the illustrative expense schedule." /></div></div>
  </div>
  <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Member balance snapshot</h2><div className="mt-4"><SimpleTable columns={['Flat', 'Member', 'Demand', 'Received', 'Balance']} rows={demoMembers.map(m => [m.flat, m.name, money(m.demand), money(m.received), money(m.balance)])} /></div></div>
</div>;

const Notice: React.FC<{title:string;detail:string}> = ({title,detail}) => <div className="rounded-lg bg-amber-50 p-3"><div className="text-sm font-semibold text-amber-900">{title}</div><div className="mt-1 text-xs text-amber-800">{detail}</div></div>;

const Register: React.FC<{title:string;columns:string[];rows:string[][]}> = ({title,columns,rows}) => <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">{title}</h2><SimpleTable columns={columns} rows={rows} /></div>;

const SimpleTable: React.FC<{columns:string[];rows:string[][]}> = ({columns,rows}) => <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">{columns.map(c=><th key={c} className="px-3 py-3 font-semibold">{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">{row.map((cell,j)=><td key={j} className={`px-3 py-3 ${j===0?'font-medium text-slate-800':'text-slate-600'}`}>{cell}</td>)}</tr>)}</tbody></table>{rows.length===0&&<div className="py-8 text-center text-sm text-slate-500">No matching sample records.</div>}</div>;
