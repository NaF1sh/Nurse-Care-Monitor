import { BrandLoading } from "@/components/SplashScreen";
import { BrandLogo } from "@/components/BrandLogo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Bell, Check, ChevronDown, ChevronRight, HeartHandshake, Info, MessageSquare, RefreshCw, Search, Send, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FALLBACK_NURSES, FALLBACK_PREDICTIONS, useLatestPredictions, useNurses, useOverviewReadings } from "@/lib/queries";
import { fmtTime, isStale, useStore, WARDS, type NotificationItem } from "@/lib/store";
import "@/components/wecare-overview.css";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Overview — NurseCare Monitor" }, { name: "description", content: "Nurse monitoring and staff coordination." }] }),
  component: () => <AppShell title="Overview"><Dashboard /></AppShell>,
});

type Status = "normal" | "moderate" | "high" | "unknown";
const labels: Record<Status, string> = { normal: "Normal estimate", moderate: "Moderate strain", high: "Elevated strain", unknown: "No current estimate" };
// Existing original demonstration values. Never used for authenticated live records.
const sample: Record<string, { hr: number; eda: string; trend: number[]; last: string; role: string; context: string }> = {
  "N-001": {hr:98,eda:"3.4 µS (+42%)",trend:[78,82,85,91,95,98],last:"Just now",role:"Senior Staff Nurse",context:"Trauma ICU intake, prolonged high exertion"},
  "N-002": {hr:72,eda:"1.2 µS (baseline)",trend:[70,71,73,72,74,72],last:"12s ago",role:"Clinical Specialist",context:"Triage assessment, stable physiological state"},
  "N-003": {hr:70,eda:"1.1 µS (baseline)",trend:[68,69,71,70,70,70],last:"28s ago",role:"Staff Nurse",context:"Pediatric ward rounds, steady vitals"},
  "N-004": {hr:84,eda:"2.1 µS (+15%)",trend:[74,76,80,82,81,84],last:"45s ago",role:"Registered Nurse",context:"Post-op medication round, moderate cognitive load"},
  "N-005": {hr:64,eda:"0.9 µS (baseline)",trend:[66,65,64,64,63,64],last:"42m ago",role:"Night Charge Nurse",context:"Shift handover completed, device resting in dock"},
};
const supportStaff = [
  {code:"SUP-01", name:"Dr. Anika Rahman", ward:"All inpatient", role:"Supervisor"},
  {code:"SUP-02", name:"Dr. Tariq Hasan", ward:"Emergency", role:"Supervisor"},
  {code:"FLT-01", name:"Staff Nurse Kabir", ward:"Central Wing", role:"Float relief"},
  {code:"FLT-02", name:"Staff Nurse Nasreen", ward:"Surgery & ICU", role:"Float relief"},
];
const categories: {value:NotificationItem["category"];label:string;message:string}[] = [
  {value:"check_in", label:"Private check-in", message:"Hello, please let us know how your shift is going and whether you need any assistance."},
  {value:"assistance", label:"Request assistance", message:"Assistance has been requested in your ward. Please confirm whether you are available."},
  {value:"break_coverage", label:"Break coordination", message:"Please confirm your availability for supervisor-approved break coverage."},
  {value:"supervisor_msg", label:"Direct message", message:"Please contact your supervisor when convenient."},
  {value:"announcement", label:"Ward announcement", message:""},
];
function initials(name:string) {return name.replace(/^Demo Nurse /, "").split(/\s+/).filter(Boolean).map(x=>x[0]).slice(-2).join("").toUpperCase();}
function Spark({values,status}:{values:number[];status:Status}) {
  if(values.length<2) return null;
  const min=Math.min(...values)-2,max=Math.max(...values)+2;
  const points=values.map((v,i)=>`${2+i*64/(values.length-1)},${22-(v-min)*20/(max-min)}`).join(" ");
  return <svg className={`wc-spark ${status}`} width="68" height="26" viewBox="0 0 68 26" role="img" aria-label="Recent heart rate trend"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function StatusPill({status}:{status:Status}) {return <span className={`wc-status ${status}`}><i/>{labels[status]}</span>;}

export function Dashboard() {
  const {user,isDemoMode,activeWard,setActiveWard,notifications,addNotification,supportRequests}=useStore();
  const nurses=useNurses(); const preds=useLatestPredictions();
  const [search,setSearch]=useState(""); const [filter,setFilter]=useState<Status|"all">("all");
  const [selected,setSelected]=useState<Set<string>>(new Set()); const [expanded,setExpanded]=useState<string|null>(null);
  const [drawer,setDrawer]=useState(false); const [recipientSearch,setRecipientSearch]=useState("");
  const [category,setCategory]=useState<NotificationItem["category"]>("check_in"); const [message,setMessage]=useState("");
  const [subject,setSubject]=useState(""); const [requiresAck,setRequiresAck]=useState(true);
  const [priority,setPriority]=useState<"normal"|"urgent">("normal");
  const demo=Boolean(isDemoMode||user?.isDemo);
  const fallbackIds=new Set(FALLBACK_NURSES.map(n=>n.id));
  const liveNurses=(nurses.data??[]).filter(n=>!fallbackIds.has(n.id));
  const sourceNurses=demo?FALLBACK_NURSES:liveNurses;
  const active=sourceNurses.filter(n=>n.is_active);
  const readings=useOverviewReadings(demo?[]:active.map(n=>n.id));
  const demoPreds=new Map(FALLBACK_PREDICTIONS.map(p=>[p.nurse_id,p]));
  const rows=active.map(n=>{
    const p=demo?demoPreds.get(n.id):preds.data?.get(n.id);
    const records=readings.data?.get(n.id)??[];
    const latest=records[0]; const s=demo?sample[n.nurse_code]:undefined;
    const stale=Boolean(!p||(!demo&&isStale(p.created_at)));
    const status:Status=p&&!stale&&p.api_status==="ok"?p.stress_level:"unknown";
    const current=demo?Boolean(s&&n.nurse_code!=="N-005"):Boolean(latest&&!isStale(latest.recorded_at));
    const hr=demo?(current?s?.hr:undefined):latest?.heart_rate;
    const trend=demo?(current?s?.trend??[]:[]):records.map(r=>r.heart_rate).filter((v):v is number=>v!=null&&Number.isFinite(v)).reverse();
    return {n,p,status,current,hr,trend,latest,s};
  });
  const wardRows=rows.filter(r=>activeWard==="all"||r.n.ward===activeWard);
  const filtered=wardRows.filter(r=>(filter==="all"||filter===r.status)&&[r.n.full_name,r.n.nurse_code,r.n.ward??""].some(x=>x.toLowerCase().includes(search.toLowerCase().trim())));
  const counts={normal:wardRows.filter(r=>r.status==="normal").length,moderate:wardRows.filter(r=>r.status==="moderate").length,high:wardRows.filter(r=>r.status==="high").length,unknown:wardRows.filter(r=>r.status==="unknown").length};
  const pending=demo?supportRequests.filter(r=>r.status==="pending"&&(activeWard==="all"||r.ward===activeWard)):[];
  const recent=demo?notifications.slice(0,3):[];
  const availableRecipients=[...rows.map(r=>({code:r.n.nurse_code,name:r.n.full_name,ward:r.n.ward??"Unassigned",role:"Nurse"})),...(demo?supportStaff:[])];
  const recipients=availableRecipients.filter(r=>selected.has(r.code));
  const chosen=new Set(recipients.map(r=>r.code));
  const allSelected=filtered.length>0&&filtered.every(r=>chosen.has(r.n.nurse_code));
  const toggle=(code:string)=>setSelected(prev=>{const next=new Set(prev);next.has(code)?next.delete(code):next.add(code);return next;});
  const toggleAll=()=>setSelected(prev=>{const next=new Set(prev);filtered.forEach(r=>allSelected?next.delete(r.n.nurse_code):next.add(r.n.nurse_code));return next;});
  const open=(codes?:string[])=>{if(codes)setSelected(new Set(codes));setRecipientSearch("");setDrawer(true);};
  const submit=(e:FormEvent)=>{e.preventDefault(); if(!demo){toast.info("Phone delivery is not connected. This is a preview only.");return;} if(!recipients.length||!message.trim())return;
    addNotification({recipients:recipients.map(r=>r.name),category,priority,subject:subject.trim()||categories.find(c=>c.value===category)?.label||"NurseCare Monitor message",message:message.trim(),requiresAck});
    toast.success("Demo notification recorded",{description:"Saved to the local session only. No phone message was sent."});setDrawer(false);setMessage("");setSubject("");setSelected(new Set());
  };
  const refresh=()=>{void nurses.refetch();void preds.refetch();if(!demo&&active.length)void readings.refetch();};
  const metrics: {key:Status|"all";label:string;value:number;sub:string}[]=[{key:"all",label:"Active nurse profiles",value:wardRows.length,sub:`${wardRows.filter(r=>r.current).length} ${demo?"sample":"recent"} sensor feeds`},{key:"normal",label:"Normal estimate",value:counts.normal,sub:"Latest model output"},{key:"moderate",label:"Moderate strain",value:counts.moderate,sub:"Latest model output"},{key:"high",label:"Elevated strain",value:counts.high,sub:"Consider a check-in"},{key:"unknown",label:"Unknown / stale",value:counts.unknown,sub:"No current estimate"}];
  return <div className="wc-overview">
    <header className="wc-heading"><div><div className="wc-kicker"><span className="wc-kicker-mark"><BrandLogo compact /></span> CARE TEAM <span className="wc-kicker-sep">/</span> OVERVIEW</div><h1>Care, in focus<span>.</span></h1><p>Monitor your nursing team and coordinate timely assistance, all in one place.</p></div><div className="wc-heading-actions"><button className="wc-btn wc-secondary" onClick={refresh} aria-label="Refresh data"><RefreshCw size={16} className={nurses.isFetching||preds.isFetching?"wc-spin":""}/> Refresh</button><button className="wc-btn wc-primary" onClick={()=>open()}><Send size={16}/> New notification</button></div></header>
    <div className="wc-mode"><div><span className="wc-mode-dot"/><strong>{demo?"Demonstration workspace":"Authenticated workspace"}</strong><span className="wc-mode-text">{demo?"Original sample nurse profiles and illustrative sensor readings. Not live hardware.":"Database records only. Monitoring and mobile delivery are not clinically validated."}</span></div><Link to="/simulation">{demo?"Open simulation":"View simulation"}<ArrowRight size={15}/></Link></div>
    {!demo&&nurses.data?.some(n=>fallbackIds.has(n.id))&&<div className="wc-warning"><Info size={17}/> The roster query returned demo fallback data. It is hidden in this authenticated view.</div>}
    <section className="wc-summary" aria-label="Monitoring overview"><div className="wc-summary-top"><div><span className="wc-eyebrow">TEAM SNAPSHOT</span><h2>{activeWard==="all"?"All wards":activeWard}</h2></div><div className="wc-summary-caption"><span className="wc-small-dot"/> {demo?"Sample estimates":"Latest available estimates"}</div></div><div className="wc-metrics">{metrics.map(m=><button key={m.key} type="button" aria-pressed={filter===m.key} onClick={()=>setFilter(filter===m.key?"all":m.key)} className={`wc-metric ${m.key} ${filter===m.key?"is-active":""}`}><span className="wc-metric-label">{m.key!=="all"&&<i/>}{m.label}</span><strong>{m.value.toString().padStart(2,"0")}</strong><span className="wc-metric-sub">{m.sub}</span></button>)}</div><div className="wc-distribution" aria-label={`Distribution: ${counts.normal} normal, ${counts.moderate} moderate, ${counts.high} elevated, ${counts.unknown} unknown`}>{(["normal","moderate","high","unknown"] as const).map(s=>counts[s]>0?<span key={s} className={s} style={{flex:counts[s]}}/>:null)}{wardRows.length===0&&<span className="unknown" style={{flex:1}}/>}</div></section>
    <div className="wc-workspace"><section className="wc-roster"><div className="wc-section-header"><div><span className="wc-eyebrow">01 / MONITOR</span><h2>Nurse monitoring <span className="wc-count">{filtered.length}</span></h2><p>Select staff to compose a check-in or assistance notification.</p></div><Link className="wc-text-link" to="/nurses">Directory <ChevronRight size={16}/></Link></div>
      <div className="wc-toolbar"><label className="wc-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or ID" aria-label="Search nurses"/>{search&&<button aria-label="Clear search" onClick={()=>setSearch("")}><X size={14}/></button>}</label><label className="wc-select"><select aria-label="Filter by ward" value={activeWard} onChange={e=>setActiveWard(e.target.value)}><option value="all">All wards</option>{WARDS.map(w=><option key={w}>{w}</option>)}</select><ChevronDown size={15}/></label><label className="wc-select"><select aria-label="Filter by strain status" value={filter} onChange={e=>setFilter(e.target.value as Status|"all")}><option value="all">All estimates</option>{Object.entries(labels).map(([key,value])=><option value={key} key={key}>{value}</option>)}</select><ChevronDown size={15}/></label></div>
      {recipients.length>0&&<div className="wc-selection"><span><Check size={15}/> {recipients.length} selected</span><div><button onClick={()=>setSelected(new Set())}>Clear</button><button className="wc-btn wc-primary" onClick={()=>open()}>Notify selected <ArrowRight size={15}/></button></div></div>}
      <div className="wc-table-scroll"><table className="wc-table"><thead><tr><th className="wc-check-cell"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all visible nurses"/></th><th>Nurse / ward</th><th>AI estimate</th><th>Heart rate</th><th>Data source</th><th><span className="wc-sr-only">Actions</span></th></tr></thead><tbody>
      {!demo&&nurses.isLoading?<tr><td colSpan={6}><BrandLoading /></td></tr>:filtered.length===0?<tr><td colSpan={6}><div className="wc-empty"><Users size={24}/><strong>No matching nurses</strong><span>Change your filters or review the nurse directory.</span></div></td></tr>:filtered.map(r=><RosterRow key={r.n.id} row={r} selected={chosen.has(r.n.nurse_code)} expanded={expanded===r.n.id} toggle={()=>toggle(r.n.nurse_code)} expand={()=>setExpanded(expanded===r.n.id?null:r.n.id)} notify={()=>open([r.n.nurse_code])} demo={demo}/>)}</tbody></table></div>
      <footer className="wc-table-footer"><span>{filtered.length} of {wardRows.length} active profiles</span><span><ShieldCheck size={15}/> {demo?"Illustrative estimates":"Estimates, not diagnoses"}</span></footer></section>
      <aside className="wc-side"><section className="wc-attention"><div className="wc-section-header"><div><span className="wc-eyebrow">02 / REVIEW</span><h2>Needs attention</h2></div><div className="wc-attention-icon"><HeartHandshake size={21}/></div></div><p className="wc-side-intro">Review elevated estimates separately from confirmed support requests.</p><div className="wc-attention-list">{wardRows.filter(r=>r.status==="high").map(r=><div className="wc-attention-row" key={r.n.id}><span className="wc-attention-avatar">{initials(r.n.full_name)}</span><div><strong>{r.n.full_name}</strong><small>{r.n.ward??"Unassigned"} · Elevated estimate</small></div><button className="wc-icon-btn" aria-label={`Compose check-in for ${r.n.full_name}`} onClick={()=>{setCategory("check_in");setMessage(categories[0].message);open([r.n.nurse_code]);}}><MessageSquare size={17}/></button></div>)}{counts.high===0&&<p className="wc-muted">No current elevated estimates.</p>}</div><div className="wc-side-divider"/><div className="wc-side-sub"><span>Pending support</span><strong>{demo?pending.length:"—"}</strong></div>{demo?pending.slice(0,3).map(r=><Link to="/support" className="wc-support-row" key={r.id}><div><strong>{r.nurseName}</strong><small>{r.type.replaceAll("_"," ")} · {r.ward}</small></div><ChevronRight size={15}/></Link>):<p className="wc-muted">Live support service is not connected.</p>}<Link to="/support" className="wc-side-link">Support workflow <ArrowRight size={16}/></Link></section>
      <section className="wc-activity"><div className="wc-section-header"><div><span className="wc-eyebrow">03 / COORDINATE</span><h2>Recent messages</h2></div><Bell size={19}/></div><p className="wc-side-intro">{demo?"Local demo history · no actual delivery":"Phone delivery is not configured"}</p>{recent.map(n=><div key={n.id} className="wc-message-row"><span className="wc-message-icon"><MessageSquare size={15}/></span><div><strong>{n.subject}</strong><small>{n.recipients.join(", ")}</small><span className="wc-local-label">Demo · {n.status}</span></div></div>)}<Link to="/notifications" className="wc-side-link">Message history <ArrowRight size={16}/></Link></section></aside></div>
    <footer className="wc-bottom"><span><ShieldCheck size={16}/> Human judgment, always. NurseCare Monitor is not an emergency monitor.</span><Link to="/ai-devices">Model & device information <ArrowRight size={14}/></Link></footer>
    <Sheet open={drawer} onOpenChange={setDrawer}><SheetContent side="right" className="wc-sheet"><div className="wc-sheet-inner"><SheetHeader className="wc-sheet-header"><div className="wc-sheet-icon"><Send size={22}/></div><SheetTitle className="wc-sheet-title">New notification</SheetTitle><SheetDescription className="wc-sheet-desc">Choose recipients, write a message and preview their mobile experience. {demo?"Demo only — no phone delivery.":"Live phone delivery is not connected."}</SheetDescription></SheetHeader>
      <form id="wc-compose" onSubmit={submit} className="wc-compose"><div className="wc-field-heading"><label htmlFor="wc-recipient-search">Recipients</label><span>{recipients.length} selected</span></div><label className="wc-search"><Search size={16}/><input id="wc-recipient-search" value={recipientSearch} onChange={e=>setRecipientSearch(e.target.value)} placeholder="Find nurses or staff"/></label><div className="wc-recipients">{availableRecipients.filter(r=>`${r.name} ${r.ward} ${r.role}`.toLowerCase().includes(recipientSearch.toLowerCase())).map(r=><label key={r.code} className={`wc-recipient ${chosen.has(r.code)?"chosen":""}`}><input type="checkbox" checked={chosen.has(r.code)} onChange={()=>toggle(r.code)}/><span className="wc-mini-avatar">{initials(r.name)}</span><span><strong>{r.name}</strong><small>{r.role} · {r.ward}</small></span></label>)}</div>
      <label className="wc-field">Category<select value={category} onChange={e=>setCategory(e.target.value as NotificationItem["category"])}>{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><div className="wc-templates">{categories.slice(0,3).map(c=><button key={c.value} type="button" onClick={()=>{setCategory(c.value);setMessage(c.message);}}>{c.label}</button>)}</div><label className="wc-field">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={80} placeholder="Optional subject"/></label><label className="wc-field">Message<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} maxLength={300} placeholder="Write a clear, supportive message…"/><small>{message.length}/300</small></label><label className="wc-field">Priority<select value={priority} onChange={e=>setPriority(e.target.value as "normal"|"urgent")}><option value="normal">Normal</option><option value="urgent">Time-sensitive (not emergency)</option></select></label><label className="wc-ack"><input type="checkbox" checked={requiresAck} onChange={e=>setRequiresAck(e.target.checked)}/> Request acknowledgment</label>
      <div className="wc-phone"><div className="wc-phone-caption"><Smartphone size={16}/> MOBILE PREVIEW <span>Illustrative</span></div><div className="wc-phone-notification"><div><span className="wc-phone-logo"><BrandLogo compact /></span><strong>NurseCare Monitor</strong><small>Preview</small></div><b>{subject||categories.find(c=>c.value===category)?.label}</b><p>{message||"Your message will appear here."}</p>{requiresAck&&<span className="wc-phone-ack">Acknowledge</span>}</div></div></form></div><div className="wc-sheet-footer"><button type="button" className="wc-btn wc-secondary" onClick={()=>setDrawer(false)}>Cancel</button><button type="submit" form="wc-compose" className="wc-btn wc-primary" disabled={!demo||!recipients.length||!message.trim()}><Send size={16}/>{demo?"Record demo message":"Delivery not connected"}</button></div></SheetContent></Sheet>
  </div>;
}

// Keep the row contract local; existing nurse details and original data pages are unchanged.
function RosterRow({row,selected,expanded,toggle,expand,notify,demo}:{row:{n:{id:string;nurse_code:string;full_name:string;ward:string|null;device_code:string|null};p?:{confidence:number|null;created_at:string;model_version:string|null;api_status:string};status:Status;current:boolean;hr?:number|null;trend:number[];latest?:{recorded_at:string;source:string;temperature:number|null;accel_x:number|null;accel_y:number|null;accel_z:number|null};s?:typeof sample[string]};selected:boolean;expanded:boolean;toggle:()=>void;expand:()=>void;notify:()=>void;demo:boolean}) {
  const {n,p,status,hr,trend,latest,s,current}=row;
  return <><tr className={`${selected?"wc-row-selected":""} ${status==="high"?"wc-row-high":""}`}><td className="wc-check-cell"><input aria-label={`Select ${n.full_name}`} type="checkbox" checked={selected} onChange={toggle}/></td><td><div className="wc-person"><span className={`wc-avatar ${status}`}>{initials(n.full_name)}</span><div><Link to="/nurses/$id" params={{id:n.id}}>{n.full_name}</Link><small>{n.nurse_code} · {n.ward??"Unassigned"}</small></div></div></td><td><StatusPill status={status}/></td><td><div className="wc-hr">{hr!=null?<><strong>{Math.round(hr)}</strong><small> bpm</small></>:<span>—</span>}<Spark values={trend} status={status}/></div></td><td><div className="wc-data"><i className={current?"current":""}/><div><strong>{demo?(current?"Sample feed":"Sample offline"):latest?(current?latest.source:"Stale reading"):"No reading"}</strong><small>{demo?(s?.last??"—"):fmtTime(latest?.recorded_at)}</small></div></div></td><td><div className="wc-row-actions"><button className="wc-icon-btn" onClick={notify} title="Compose notification" aria-label={`Notify ${n.full_name}`}><MessageSquare size={18}/></button><button className="wc-icon-btn" onClick={expand} aria-expanded={expanded} aria-label={`Details for ${n.full_name}`}><ChevronDown size={17} className={expanded?"wc-rotated":""}/></button></div></td></tr>{expanded&&<tr className="wc-expanded"><td colSpan={6}><div className="wc-expanded-grid"><div><span>Prediction time</span><strong>{fmtTime(p?.created_at)}</strong></div><div><span>Model version</span><strong>{p?.model_version??"Unavailable"}</strong></div><div><span>Device assignment</span><strong>{n.device_code??"Not assigned"}</strong></div><div><span>Model score (uncalibrated)</span><strong>{p?.confidence!=null?`${Math.round(p.confidence*100)}%`:"Unavailable"}</strong></div>{demo&&s?<><div><span>Sample EDA</span><strong>{s.eda}</strong></div><div><span>Sample context</span><strong>{s.context}</strong></div></>:<><div><span>Temperature</span><strong>{latest?.temperature!=null?`${latest.temperature} °C`:"Unavailable"}</strong></div><div><span>Motion axes</span><strong>{latest&&[latest.accel_x,latest.accel_y,latest.accel_z].every(x=>x!=null)?[latest.accel_x,latest.accel_y,latest.accel_z].join(" / "):"Unavailable"}</strong></div></>}<Link className="wc-text-link" to="/nurses/$id" params={{id:n.id}}>Full nurse profile <ArrowRight size={15}/></Link></div></td></tr>}</>;
}
export default Dashboard;
