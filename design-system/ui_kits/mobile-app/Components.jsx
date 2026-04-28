/* Components.jsx — small composable primitives + per-screen components.
   Reads tokens from CSS file via class names; uses inline styles where it's
   the same effort as adding a class. */

const { useState, useEffect, useMemo, useRef } = React;

/* ─── Primitives ────────────────────────────────────────────────────── */

function Eyebrow({ children, style }) {
  return <p style={{margin:0,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:"#737373",...style}}>{children}</p>;
}
function H1({ children, style }) {
  return <h1 style={{margin:0,fontSize:24,fontWeight:600,letterSpacing:"-0.01em",lineHeight:1.2,...style}}>{children}</h1>;
}
function Card({ children, style, lg }) {
  return <div style={{border:"1px solid #262626",background:"#171717",borderRadius:lg?8:6,padding:12,...style}}>{children}</div>;
}
function PrimaryButton({ children, onClick, lg, style, disabled }) {
  return <button onClick={onClick} disabled={disabled}
    style={{width:"100%",height:lg?56:48,borderRadius:6,background:"#fff",color:"#000",
            fontWeight:500,fontSize:lg?16:14,border:"none",cursor:"pointer",
            opacity:disabled?0.5:1,...style}}>{children}</button>;
}
function GhostButton({ children, onClick, style }) {
  return <button onClick={onClick}
    style={{height:36,padding:"0 12px",borderRadius:6,background:"transparent",
            color:"#d4d4d4",fontSize:11,border:"1px solid #262626",cursor:"pointer",
            display:"inline-flex",alignItems:"center",gap:6,...style}}>{children}</button>;
}
function DashedButton({ children, onClick }) {
  return <button onClick={onClick} style={{width:"100%",height:40,borderRadius:6,background:"rgba(23,23,23,0.4)",
    color:"#d4d4d4",fontSize:12,border:"1px dashed #404040",cursor:"pointer",
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}>{children}</button>;
}
function ExercisePlate({ size=44 }) {
  return <div style={{width:size,height:size,borderRadius:4,background:"#f5f5f5",border:"1px solid #262626",flexShrink:0,
    display:"flex",alignItems:"center",justifyContent:"center",color:"#a3a3a3",fontSize:10}}>img</div>;
}

/* ─── Bottom Nav ─────────────────────────────────────────────────────── */
function BottomNav({ tab, onTab, hidden }) {
  if (hidden) return null;
  const items = [
    {k:"today",label:"Today",I:ic.Cal},
    {k:"program",label:"Program",I:ic.Dumb},
    {k:"calendar",label:"Calendar",I:ic.Hist},
    {k:"history",label:"History",I:ic.List},
    {k:"body",label:"Body",I:ic.Scale},
    {k:"settings",label:"Settings",I:ic.Set},
  ];
  return (
    <nav style={{position:"absolute",bottom:0,left:0,right:0,zIndex:40,
      borderTop:"1px solid #262626",background:"rgba(0,0,0,0.95)",backdropFilter:"blur(8px)"}}>
      <ul style={{listStyle:"none",margin:0,padding:0,display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,height:64,maxWidth:448,margin:"0 auto"}}>
        {items.map(({k,label,I}) => {
          const active = tab===k;
          return (
            <li key={k} style={{display:"flex",minWidth:0}}>
              <button onClick={()=>onTab(k)} style={{flex:1,minWidth:0,background:"none",border:"none",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
                fontSize:10,color:active?"#fff":"#737373",padding:"0 2px"}}>
                <I size={20} sw={active?2.25:1.75}/>
                <span style={{maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ─── Login ──────────────────────────────────────────────────────────── */
function LoginBackdrop({ variant }) {
  if (variant === "glow") {
    return (
      <div aria-hidden style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        {/* primary radial — emerald, soft, behind the title */}
        <div style={{position:"absolute",top:"22%",left:"50%",transform:"translate(-50%,-50%)",
          width:560,height:560,borderRadius:"50%",
          background:"radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.08) 35%, transparent 65%)",
          filter:"blur(12px)"}}/>
        {/* secondary, smaller, deeper — adds depth without color */}
        <div style={{position:"absolute",top:"22%",left:"50%",transform:"translate(-50%,-50%)",
          width:280,height:280,borderRadius:"50%",
          background:"radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)"}}/>
      </div>
    );
  }
  if (variant === "barbell") {
    // Two stacked plates + bar, centered vertically. Pure stroke, ~6% opacity.
    return (
      <div aria-hidden style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="640" height="200" viewBox="0 0 640 200" fill="none"
          style={{opacity:0.07,color:"#fff"}}>
          {/* bar */}
          <line x1="40" y1="100" x2="600" y2="100" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          {/* left sleeve collar */}
          <line x1="170" y1="92" x2="170" y2="108" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* left plates: outer big, inner medium */}
          <rect x="115" y="40" width="22" height="120" rx="3" stroke="currentColor" strokeWidth="2.5"/>
          <rect x="142" y="58" width="18" height="84" rx="3" stroke="currentColor" strokeWidth="2.5"/>
          {/* right sleeve collar */}
          <line x1="470" y1="92" x2="470" y2="108" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          {/* right plates: inner medium, outer big */}
          <rect x="480" y="58" width="18" height="84" rx="3" stroke="currentColor" strokeWidth="2.5"/>
          <rect x="503" y="40" width="22" height="120" rx="3" stroke="currentColor" strokeWidth="2.5"/>
          {/* end caps */}
          <line x1="40" y1="92" x2="40" y2="108" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <line x1="600" y1="92" x2="600" y2="108" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }
  return null;
}

function LoginScreen({ onSignIn, variant = "minimal" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  function submit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setTimeout(() => { setStatus("sent"); setTimeout(onSignIn, 900); }, 600);
  }
  return (
    <div style={{position:"relative",minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
      <LoginBackdrop variant={variant}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:24}}>
        <div>
          <H1>Workout Tracker</H1>
          <p style={{margin:"4px 0 0",fontSize:14,color:"#a3a3a3"}}>Sign in with a magic link.</p>
        </div>
        {status==="sent" ? (
          <Card><p style={{margin:0,fontSize:14}}>Check <span style={{fontWeight:500}}>{email}</span> for the sign-in link.</p></Card>
        ) : (
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:16}}>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{width:"100%",height:48,borderRadius:6,background:"#171717",border:"1px solid #262626",
                padding:"0 16px",color:"#fff",fontSize:16,outline:"none",fontFamily:"inherit"}}/>
            <PrimaryButton lg disabled={status==="sending"}>
              {status==="sending"?"Sending…":"Send magic link"}
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Today ──────────────────────────────────────────────────────────── */
const PROGRAM = {
  name: "12-Week Hypertrophy",
  weeks: 12,
  deloads: [4,8,12],
  days: [
    { id:"d1", label:"Day 1", title:"Upper — Strength", exercises:[
      {id:"e1",name:"Barbell Bench Press",sets:4,reps:5,wt:75},
      {id:"e2",name:"Barbell Bent-Over Row",sets:4,reps:5,wt:70},
      {id:"e3",name:"Seated DB Overhead Press",sets:3,reps:8,wt:50},
      {id:"e4",name:"Cable Row (close grip)",sets:3,reps:10,wt:60},
      {id:"e5",name:"EZ Bar Curl",sets:3,reps:10,wt:35},
      {id:"e6",name:"Tricep Pushdown",sets:3,reps:10,wt:35},
    ]},
    { id:"d2", label:"Day 2", title:"Lower — Strength", exercises:[
      {id:"e7",name:"Barbell Back Squat",sets:4,reps:5,wt:75},
      {id:"e8",name:"Romanian Deadlift",sets:3,reps:8,wt:85},
      {id:"e9",name:"DB Reverse Lunge",sets:3,reps:10,wt:25,note:"per side"},
      {id:"e10",name:"DB Hip Thrust",sets:3,reps:12,wt:40},
      {id:"e11",name:"Standing Calf Raises",sets:4,reps:15,wt:40},
      {id:"e12",name:"Plank",sets:3,reps:null,wt:null,note:"45 sec hold"},
    ]},
    { id:"d3", label:"Day 3", title:"Upper — Hypertrophy", exercises:[
      {id:"e13",name:"Incline DB Press",sets:4,reps:10,wt:30},
      {id:"e14",name:"Lat Pulldown",sets:4,reps:10,wt:60},
      {id:"e15",name:"Cable Fly",sets:3,reps:12,wt:20},
    ]},
    { id:"d4", label:"Day 4", title:"Lower — Hypertrophy", exercises:[
      {id:"e16",name:"Bulgarian Split Squat",sets:3,reps:10,wt:25,note:"per side, DB"},
      {id:"e17",name:"DB Lunges",sets:3,reps:12,wt:25,note:"per side"},
      {id:"e18",name:"DB Stiff-Leg Deadlift",sets:3,reps:12,wt:40},
    ]},
  ],
};

function TodayScreen({ onStart }) {
  const week = 3, day = PROGRAM.days[1];
  // Status eyebrow renders by default. Re-engagement strip renders only when
  // gapDays >= 4 (cold-start / returning user) — wire from sessions.completed_at.
  const gapDays = 0; // mock: most recent session was today/yesterday
  const showReengage = gapDays >= 4;
  // Block-aware coaching line. Tied to current program block + day type — not
  // a random quote. Imperative, terse, one actionable cue per cell.
  // Same line shows for the whole 4-week block on purpose; repetition is the
  // coaching. Read as: COACH[`${block.kind}.${day.kind}`] ?? COACH.default
  const COACH = {
    "foundation.upper-strength":    "Focus on bar speed. Smooth descent, drive fast.",
    "foundation.upper-hypertrophy": "Slow eccentrics. Three counts down on every rep.",
    "foundation.lower-strength":    "Tight setup. Wedge into the bar before you unrack.",
    "foundation.lower-hypertrophy": "Full depth. Don't chase weight today.",
    "build.upper-strength":         "Top set is the work set. Back-offs at RPE 7.",
    "build.upper-hypertrophy":      "Stretch under load. Pause one count at the bottom.",
    "build.lower-strength":         "Brace before the rep, not during. Drive through the floor.",
    "build.lower-hypertrophy":      "Control the negative. The pump is the point.",
    "peak.upper-strength":          "Trust the program. Don't add weight today.",
    "peak.upper-hypertrophy":       "Volume over intensity this week. Save it for the test.",
    "peak.lower-strength":          "Singles only on top sets. Reset between reps.",
    "peak.lower-hypertrophy":       "Pump work. Stay 2 reps shy of failure.",
    "deload.upper-strength":        "Half the volume, half the bar. Practice the patterns.",
    "deload.upper-hypertrophy":     "Light and clean. Leave the gym feeling fresh.",
    "deload.lower-strength":        "Bar warmup only on top sets. Reset your back.",
    "deload.lower-hypertrophy":     "Mobility focus. Quality reps, no grinders.",
    "default":                      "Show up. The program does the rest.",
  };
  const userName = "Rahul";
  const blockKind = "foundation"; // mock — read from current_block
  const dayKind = "lower-strength"; // mock — read from day
  const coach = COACH[`${blockKind}.${dayKind}`] ?? COACH.default;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <header style={{display:"flex",flexDirection:"column",gap:6}}>
        <p style={{margin:0,fontSize:13,color:"#d4d4d4"}}>
          Hi, {userName}.
        </p>
        <p style={{margin:0,fontSize:11,color:"#737373",fontVariantNumeric:"tabular-nums",
          display:"flex",alignItems:"center",gap:8}}>
          <span>Day 23 of 84</span>
          <span style={{color:"#404040"}}>·</span>
          <span>4-day streak</span>
        </p>
        <p style={{margin:"8px 0 0",fontSize:13,color:"#a3a3a3",lineHeight:1.45,
          fontStyle:"normal",borderLeft:"1.5px solid #262626",paddingLeft:10}}>
          {coach}
        </p>
        <H1 style={{marginTop:8}}>{day.label}: {day.title}</H1>
      </header>

      {showReengage ? (
        <div style={{border:"1px solid #262626",background:"#171717",borderRadius:8,padding:12,
          display:"flex",flexDirection:"column",gap:10}}>
          <p style={{margin:0,fontSize:13,color:"#d4d4d4",lineHeight:1.45}}>
            It's been {gapDays} days. Pick up where you left off — or shift the program back a week.
          </p>
          <div style={{display:"flex",gap:8}}>
            <button style={{height:36,padding:"0 12px",borderRadius:6,background:"#fff",color:"#000",
              fontSize:12,fontWeight:500,border:"none",cursor:"pointer"}}>Pick up here</button>
            <button style={{height:36,padding:"0 12px",borderRadius:6,background:"transparent",color:"#d4d4d4",
              fontSize:12,border:"1px solid #262626",cursor:"pointer"}}>Shift back 1 week</button>
            <button aria-label="Dismiss" style={{marginLeft:"auto",height:36,width:36,borderRadius:6,
              background:"transparent",color:"#737373",border:"none",cursor:"pointer",
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              <ic.X size={16}/>
            </button>
          </div>
        </div>
      ) : null}

      <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
        {day.exercises.map(ex => (
          <li key={ex.id} style={{border:"1px solid #262626",background:"#171717",borderRadius:6,padding:12,
            display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12}}>
            <span style={{fontSize:14}}>{ex.name}</span>
            <span style={{fontSize:11,color:"#a3a3a3",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
              {ex.sets}×{ex.reps??"—"}{ex.wt!==null?` · ${ex.wt} lb`:""}
            </span>
          </li>
        ))}
      </ul>
      <PrimaryButton lg onClick={onStart}>Start workout</PrimaryButton>
    </div>
  );
}

      {showReengage ? (
        <div style={{border:"1px solid #262626",background:"#171717",borderRadius:8,padding:12,
          display:"flex",flexDirection:"column",gap:10}}>
          <p style={{margin:0,fontSize:13,color:"#d4d4d4",lineHeight:1.45}}>
            It's been {gapDays} days. Pick up where you left off — or shift the program back a week.
          </p>
          <div style={{display:"flex",gap:8}}>
            <button style={{height:36,padding:"0 12px",borderRadius:6,background:"#fff",color:"#000",
              fontSize:12,fontWeight:500,border:"none",cursor:"pointer"}}>Pick up here</button>
            <button style={{height:36,padding:"0 12px",borderRadius:6,background:"transparent",color:"#d4d4d4",
              fontSize:12,border:"1px solid #262626",cursor:"pointer"}}>Shift back 1 week</button>
            <button aria-label="Dismiss" style={{marginLeft:"auto",height:36,width:36,borderRadius:6,
              background:"transparent",color:"#737373",border:"none",cursor:"pointer",
              display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
              <ic.X size={16}/>
            </button>
          </div>
        </div>
      ) : null}

      <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
        {day.exercises.map(ex => (
          <li key={ex.id} style={{border:"1px solid #262626",background:"#171717",borderRadius:6,padding:12,
            display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12}}>
            <span style={{fontSize:14}}>{ex.name}</span>
            <span style={{fontSize:11,color:"#a3a3a3",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
              {ex.sets}×{ex.reps??"—"}{ex.wt!==null?` · ${ex.wt} lb`:""}
            </span>
          </li>
        ))}
      </ul>
      <PrimaryButton lg onClick={onStart}>Start workout</PrimaryButton>
    </div>
  );
}

/* ─── Workout ────────────────────────────────────────────────────────── */
function WorkoutScreen({ onFinish, onBack }) {
  const day = PROGRAM.days[1];
  const week = 3;
  const [elapsed, setElapsed] = useState(0);
  const [exercises, setExercises] = useState(() =>
    day.exercises.slice(0,4).map(ex => ({
      ...ex,
      rows: Array.from({length: ex.sets}, (_,i) => ({setN:i+1, w: ex.wt, r: ex.reps, done: false}))
    }))
  );
  const [restEndsAt, setRestEndsAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => { setElapsed(e=>e+1); setNow(Date.now()); }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restEndsAt && Date.now() >= restEndsAt) setRestEndsAt(null);
  }, [now, restEndsAt]);

  function toggle(exId, setN) {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exId) return ex;
      return {...ex, rows: ex.rows.map(r => r.setN!==setN ? r : {...r, done: !r.done})};
    }));
    const ex = exercises.find(e=>e.id===exId);
    const row = ex?.rows.find(r=>r.setN===setN);
    if (row && !row.done) setRestEndsAt(Date.now() + 90000);
  }

  const fmtDur = s => {
    const m = Math.floor(s/60), sec = s%60;
    return `${m}:${String(sec).padStart(2,"0")}`;
  };
  const remaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt-now)/1000)) : 0;
  const totalSets = exercises.reduce((a,e)=>a+e.rows.length,0);
  const doneSets  = exercises.flatMap(e=>e.rows).filter(r=>r.done).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,paddingBottom:96}}>
      <header style={{display:"flex",flexDirection:"column",gap:4}}>
        <Eyebrow>Week {week} · {day.label}</Eyebrow>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:600,lineHeight:1.2}}>{day.title}</h1>
          <span style={{fontSize:14,color:"#d4d4d4",fontVariantNumeric:"tabular-nums"}}>{fmtDur(elapsed)}</span>
        </div>
        <p style={{margin:0,fontSize:11,color:"#737373"}}>{doneSets}/{totalSets} sets done</p>
      </header>

      {/* rest bar */}
      {restEndsAt ? (
        <div style={{border:"1px solid rgba(16,185,129,0.4)",background:"rgba(16,185,129,0.10)",
          borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:"#34d399"}}>Rest</span>
          <span style={{flex:1,textAlign:"center",fontSize:18,fontWeight:600,color:"#6ee7b7",fontVariantNumeric:"tabular-nums"}}>{fmtDur(remaining)}</span>
          <button onClick={()=>setRestEndsAt(restEndsAt-15000)} style={{height:32,width:32,borderRadius:4,border:"1px solid rgba(16,185,129,0.4)",background:"transparent",color:"#6ee7b7",cursor:"pointer"}}><ic.Minus/></button>
          <button onClick={()=>setRestEndsAt(restEndsAt+15000)} style={{height:32,width:32,borderRadius:4,border:"1px solid rgba(16,185,129,0.4)",background:"transparent",color:"#6ee7b7",cursor:"pointer"}}><ic.Plus/></button>
          <button onClick={()=>setRestEndsAt(null)} style={{height:32,width:32,borderRadius:4,border:"none",background:"transparent",color:"#6ee7b7",cursor:"pointer"}}><ic.X/></button>
        </div>
      ) : (
        <div style={{border:"1px solid #262626",background:"#171717",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#a3a3a3"}}>Rest: 90s default</div>
      )}

      <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:12}}>
        {exercises.map(ex => (
          <li key={ex.id} style={{border:"1px solid #262626",background:"#171717",borderRadius:8,padding:12,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <ExercisePlate size={64}/>
              <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:2}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8}}>
                  <h2 style={{margin:0,fontSize:14,fontWeight:500,lineHeight:1.35}}>{ex.name}</h2>
                  <span style={{fontSize:11,color:"#a3a3a3",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
                    {ex.sets}×{ex.reps??"—"}{ex.wt?` · ${ex.wt} lb`:""}
                  </span>
                </div>
                {ex.note ? <p style={{margin:0,fontSize:11,color:"#737373"}}>{ex.note}</p> : null}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {ex.rows.map(row => (
                <div key={row.setN} style={{display:"grid",gridTemplateColumns:"1fr 1fr 44px",gap:8,alignItems:"center",
                  background: row.done?"rgba(38,38,38,0.6)":"#0a0a0a",
                  borderRadius:6,padding:"6px 8px"}}>
                  <input defaultValue={row.w??""} placeholder="lb" inputMode="decimal"
                    style={{height:44,border:"1px solid transparent",background:"transparent",color:row.done?"#a3a3a3":"#fff",
                      textAlign:"center",fontSize:16,fontVariantNumeric:"tabular-nums",outline:"none",borderRadius:4,fontFamily:"inherit"}}/>
                  <input defaultValue={row.r??""} placeholder="reps" inputMode="numeric"
                    style={{height:44,border:"1px solid transparent",background:"transparent",color:row.done?"#a3a3a3":"#fff",
                      textAlign:"center",fontSize:16,fontVariantNumeric:"tabular-nums",outline:"none",borderRadius:4,fontFamily:"inherit"}}/>
                  <button onClick={()=>toggle(ex.id,row.setN)}
                    style={{height:44,width:44,borderRadius:6,
                      border: row.done?"1px solid #10b981":"1px solid #404040",
                      background: row.done?"#10b981":"transparent",
                      color: row.done?"#000":"#737373",
                      display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    <ic.Check size={20} sw={3}/>
                  </button>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:30,
        background:"linear-gradient(to top, #000 0%, rgba(0,0,0,0.95) 60%, transparent 100%)",
        paddingTop:24,paddingBottom:16,paddingLeft:16,paddingRight:16}}>
        <PrimaryButton lg onClick={onFinish} style={{maxWidth:416,margin:"0 auto",display:"block"}}>Finish workout</PrimaryButton>
      </div>
    </div>
  );
}

/* ─── Program ────────────────────────────────────────────────────────── */
function ProgramScreen({ onStart }) {
  const [week, setWeek] = useState(3);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <header style={{display:"flex",flexDirection:"column",gap:4}}>
        <H1>{PROGRAM.name}</H1>
        <p style={{margin:0,fontSize:11,color:"#737373"}}>{PROGRAM.weeks} weeks · deloads on {PROGRAM.deloads.join(", ")}</p>
      </header>
      <div style={{margin:"0 -16px",padding:"0 16px",overflowX:"auto"}}>
        <div style={{display:"flex",gap:6,minWidth:"max-content"}}>
          {Array.from({length: PROGRAM.weeks}, (_,i)=>i+1).map(w => {
            const sel = w===week, deload = PROGRAM.deloads.includes(w);
            return (
              <button key={w} onClick={()=>setWeek(w)} style={{
                height:36,minWidth:44,padding:"0 8px",borderRadius:6,fontVariantNumeric:"tabular-nums",
                display:"inline-flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:11,
                cursor:"pointer",
                background: sel?"#fff":"transparent",
                color: sel?"#000":(w===3?"#34d399":"#a3a3a3"),
                border: sel?"1px solid #fff":(w===3?"1px solid #10b981":"1px solid #262626"),
              }}>
                <span style={{fontWeight:500,lineHeight:1}}>W{w}</span>
                {deload?<span style={{fontSize:9,opacity:0.7,marginTop:2,lineHeight:1}}>deload</span>:null}
              </button>
            );
          })}
        </div>
      </div>
      <Eyebrow>{week<=4?"Foundation":week<=8?"Build":"Peak"} · Week {week}{PROGRAM.deloads.includes(week)?" · Deload":""}{week===3?" · Current":""}</Eyebrow>
      <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:12}}>
        {PROGRAM.days.map(day => (
          <li key={day.id} style={{border:"1px solid #262626",background:"#171717",borderRadius:8,overflow:"hidden"}}>
            <header style={{padding:"10px 12px",borderBottom:"1px solid #262626",display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",color:"#737373"}}>{day.label}</p>
                <h2 style={{margin:0,fontSize:14,fontWeight:500}}>{day.title}</h2>
              </div>
              <button onClick={onStart} style={{height:36,padding:"0 12px",borderRadius:6,background:"#fff",color:"#000",
                fontSize:11,fontWeight:500,border:"none",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
                <ic.Play size={14}/> Start W{week}
              </button>
            </header>
            <ul style={{listStyle:"none",margin:0,padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>
              {day.exercises.slice(0,4).map(ex => (
                <li key={ex.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:14}}>
                  <ExercisePlate size={36}/>
                  <span style={{flex:1,minWidth:0,lineHeight:1.35}}>{ex.name}{ex.note?<span style={{fontSize:11,color:"#737373",marginLeft:4}}>({ex.note})</span>:null}</span>
                  <span style={{fontSize:11,color:"#a3a3a3",fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
                    {ex.sets}×{ex.reps??"—"}{ex.wt?` · ${ex.wt} lb`:""}
                  </span>
                </li>
              ))}
            </ul>
            <div style={{borderTop:"1px solid #262626",padding:"8px 12px",fontSize:11,color:"#a3a3a3",
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer"}}>
              <ic.Plus size={14}/> Add exercise
            </div>
          </li>
        ))}
      </ul>
      <DashedButton><ic.Plus size={14}/> Add day</DashedButton>
    </div>
  );
}

/* ─── History ────────────────────────────────────────────────────────── */
function HistoryScreen() {
  const sessions = [
    {id:1,week:3,label:"Day 1",title:"Upper — Strength",dur:"42:18",sets:18,vol:6420,date:"Apr 24"},
    {id:2,week:2,label:"Day 4",title:"Lower — Hypertrophy",dur:"38:02",sets:15,vol:5180,date:"Apr 22"},
    {id:3,week:2,label:"Day 3",title:"Upper — Hypertrophy",dur:"45:30",sets:18,vol:5840,date:"Apr 20"},
    {id:4,week:2,label:"Day 2",title:"Lower — Strength",dur:"40:11",sets:18,vol:7100,date:"Apr 18"},
    {id:5,week:2,label:"Day 1",title:"Upper — Strength",dur:"43:55",sets:18,vol:6260,date:"Apr 16"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <header>
        <H1>History</H1>
        <p style={{margin:"4px 0 0",fontSize:14,color:"#a3a3a3"}}>{sessions.length} sessions</p>
      </header>
      <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
        {sessions.map(s => (
          <li key={s.id} style={{borderRadius:8,border:"1px solid #262626",background:"#171717",padding:12}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12}}>
              <Eyebrow>Week {s.week} · {s.label}</Eyebrow>
              <span style={{fontSize:11,color:"#737373"}}>{s.date}</span>
            </div>
            <h2 style={{margin:"4px 0 0",fontSize:14,fontWeight:500}}>{s.title}</h2>
            <div style={{marginTop:4,fontSize:11,color:"#a3a3a3",fontVariantNumeric:"tabular-nums",display:"flex",gap:12}}>
              <span>{s.dur}</span><span>{s.sets} sets</span><span>{s.vol.toLocaleString()} lb·reps</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Settings ───────────────────────────────────────────────────────── */
function SettingsScreen({ onSignOut }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <header><H1>Settings</H1></header>
      <Card style={{display:"flex",flexDirection:"column",gap:4}}>
        <Eyebrow>Signed in as</Eyebrow>
        <p style={{margin:0,fontSize:14}}>rahul@example.com</p>
      </Card>
      <button onClick={onSignOut} style={{width:"100%",height:48,borderRadius:6,background:"transparent",
        color:"#d4d4d4",fontSize:14,border:"1px solid #262626",cursor:"pointer"}}>Sign out</button>
      <section style={{display:"flex",flexDirection:"column",gap:12,paddingTop:16}}>
        <Eyebrow>Danger zone</Eyebrow>
        <div style={{borderRadius:6,border:"1px solid rgba(239,68,68,0.30)",background:"rgba(239,68,68,0.05)",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          <p style={{margin:0,fontSize:14,color:"#d4d4d4"}}>Delete all workout sessions and set logs. You have 14 sessions. Your program and exercises stay.</p>
          <button style={{height:40,borderRadius:6,background:"#ef4444",color:"#fff",fontSize:13,fontWeight:500,border:"none",cursor:"pointer"}}>Wipe sessions</button>
        </div>
      </section>
    </div>
  );
}

/* ─── Calendar ───────────────────────────────────────────────────────── */
// April 2026 mock data — keyed by ISO yyyy-mm-dd. label is the day card title;
// "kind" maps to a workout type but here it's just used to vary the mark
// (filled chip vs outline) — single emerald accent, no extra colors.
const CAL_MONTH = { y: 2026, m: 3 /* zero-indexed: April */ };
const CAL_TODAY = "2026-04-27";
const CAL_DATA = {
  "2026-04-02": { label: "Upper · Strength", kind: "done" },
  "2026-04-04": { label: "Lower · Strength", kind: "done" },
  "2026-04-06": { label: "Upper · Hypertrophy", kind: "done" },
  "2026-04-08": { label: "Lower · Hypertrophy", kind: "done" },
  "2026-04-10": { label: "Upper · Strength", kind: "done" },
  "2026-04-13": { label: "Lower · Strength", kind: "done" },
  "2026-04-15": { label: "Upper · Hypertrophy", kind: "done" },
  "2026-04-17": { label: "Lower · Hypertrophy", kind: "done" },
  "2026-04-20": { label: "Upper · Strength", kind: "done" },
  "2026-04-22": { label: "Lower · Strength", kind: "done" },
  "2026-04-24": { label: "Upper · Hypertrophy", kind: "done" },
  "2026-04-27": { label: "Lower · Hypertrophy", kind: "today" }, // current day
  "2026-04-29": { label: "Upper · Strength", kind: "planned" },
};

function isoOf(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function monthName(m) {
  return ["January","February","March","April","May","June","July","August","September","October","November","December"][m];
}

function CalendarScreen({ onOpenDay }) {
  const { y, m } = CAL_MONTH;
  const first = new Date(y, m, 1);
  const startDow = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells = [];
  for (let i=0;i<startDow;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <H1 style={{whiteSpace:"nowrap"}}>{monthName(m)} <span style={{color:"#a3a3a3",fontWeight:400}}>{y}</span></H1>
        <button aria-label="Search" style={{height:36,width:36,borderRadius:6,border:"1px solid #262626",
          background:"transparent",color:"#a3a3a3",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <ic.Search size={16}/>
        </button>
      </header>

      {/* weekday headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
          <div key={d} style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",
            color:"#737373",textAlign:"center",padding:"4px 0"}}>{d}</div>
        ))}
      </div>

      {/* grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {cells.map((d,i) => {
          if (d===null) return <div key={"e"+i}/>;
          const iso = isoOf(y,m,d);
          const entry = CAL_DATA[iso];
          const isToday = iso===CAL_TODAY;
          return <CalendarCell key={iso} day={d} entry={entry} isToday={isToday}
            onClick={()=>onOpenDay(iso, entry, d)}/>;
        })}
      </div>
    </div>
  );
}

function CalendarCell({ day, entry, isToday, onClick }) {
  const empty = !entry;
  const cellBase = {
    aspectRatio:"1 / 1.05",
    borderRadius:6,
    border:"1px solid #262626",
    background:"#0a0a0a",
    padding:"4px 4px 6px",
    display:"flex",
    flexDirection:"column",
    cursor:"pointer",
    overflow:"hidden",
    minWidth:0,
  };
  if (empty) {
    return (
      <button onClick={onClick} style={{...cellBase,
        background:"transparent",border:"1px solid #171717"}}>
        <span style={{fontSize:10,color:"#737373",
          fontVariantNumeric:"tabular-nums",lineHeight:1}}>{day}</span>
        <span style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#404040"}}>
          <ic.Plus size={12}/>
        </span>
      </button>
    );
  }
  const kind = entry.kind;
  const chipStyle = kind==="done"
    ? {background:"#10b981",color:"#000",border:"1px solid #10b981"}
    : kind==="today"
    ? {background:"rgba(16,185,129,0.10)",color:"#6ee7b7",border:"1px solid rgba(16,185,129,0.4)"}
    : {background:"#171717",color:"#d4d4d4",border:"1px solid #262626"};
  const numStyle = kind==="done"
    ? {color:"rgba(0,0,0,0.55)"}
    : kind==="today"
    ? {color:"#6ee7b7"}
    : {color:"#a3a3a3"};
  // first letter of "Upper..." or "Lower..." → U / L
  const glyph = entry.label.trim()[0].toUpperCase();
  return (
    <button onClick={onClick} style={{...cellBase, ...chipStyle}}>
      <span style={{fontSize:9,fontVariantNumeric:"tabular-nums",lineHeight:1,...numStyle}}>{day}</span>
      <span style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:18,fontWeight:600,letterSpacing:"-0.02em",lineHeight:1}}>{glyph}</span>
    </button>
  );
}

/* ─── Day detail sheet ───────────────────────────────────────────────── */
const DAY_DETAIL = {
  date: "Mon, Apr 27",
  groups: [
    { id:"g1", title:"Upper back", count:2, expanded:true, exercises:[
      { id:"x1", name:"Hammer curl (cable)", sets:[
        {n:1, w:50, r:10}, {n:2, w:55, r:10}, {n:3, w:55, r:8},
      ]},
      { id:"x2", name:"Lat pulldown", sets:[
        {n:1, w:80, r:10}, {n:2, w:85, r:8},
      ]},
    ]},
    { id:"g2", title:"Triceps", count:2, expanded:false },
    { id:"g3", title:"Core", count:1, expanded:false },
  ],
};

function DayDetailSheet({ onClose }) {
  const [groups, setGroups] = useState(DAY_DETAIL.groups);
  const toggle = id => setGroups(gs => gs.map(g => g.id===id ? {...g, expanded: !g.expanded} : g));
  return (
    <div style={{position:"absolute",inset:0,zIndex:60,background:"#000",display:"flex",flexDirection:"column"}}>
      <header style={{display:"flex",alignItems:"center",gap:12,padding:"16px 16px 12px",
        borderBottom:"1px solid #262626"}}>
        <ic.Cal size={18}/>
        <h2 style={{margin:0,flex:1,fontSize:14,fontWeight:500}}>Thursday, {DAY_DETAIL.date.replace("Mon, ","")}</h2>
        <button onClick={onClose} aria-label="Close"
          style={{height:32,width:32,borderRadius:6,border:"none",background:"transparent",color:"#a3a3a3",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
          <ic.X size={18}/>
        </button>
      </header>

      <div style={{flex:1,overflowY:"auto",padding:"12px 16px 96px"}}>
        <ul style={{listStyle:"none",margin:0,padding:0,display:"flex",flexDirection:"column",gap:8}}>
          {groups.map(g => (
            <li key={g.id} style={{border:"1px solid #262626",background:"#171717",borderRadius:8,overflow:"hidden"}}>
              <header onClick={()=>toggle(g.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px",cursor:"pointer"}}>
                <div style={{height:32,width:32,borderRadius:"50%",background:"#0a0a0a",
                  border:"1px solid #262626",display:"inline-flex",alignItems:"center",justifyContent:"center",
                  color:"#d4d4d4",fontSize:11,fontWeight:500}}>{g.title.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:14,fontWeight:500}}>{g.title}</p>
                  <p style={{margin:0,fontSize:11,color:"#737373"}}>Exercises {g.count}</p>
                </div>
                <button onClick={e=>{e.stopPropagation();}} aria-label="Add exercise"
                  style={{height:32,width:32,borderRadius:"50%",border:"1px solid #262626",
                    background:"transparent",color:"#d4d4d4",cursor:"pointer",
                    display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  <ic.Plus size={14}/>
                </button>
                <span style={{color:"#737373"}}><ic.Chev size={16} dir={g.expanded?"up":"down"}/></span>
              </header>

              {g.expanded && g.exercises ? (
                <div style={{borderTop:"1px solid #262626",padding:"8px 12px 12px",display:"flex",flexDirection:"column",gap:12}}>
                  {g.exercises.map(ex => (
                    <ExerciseGroupRow key={ex.id} ex={ex}/>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <button style={{marginTop:12,width:"100%",height:48,borderRadius:8,
          background:"#171717",border:"1px solid #262626",color:"#fff",fontSize:14,
          display:"inline-flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",cursor:"pointer"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
            <ic.Plus size={14}/> New workout
          </span>
          <span style={{color:"#737373"}}>→</span>
        </button>
        <button style={{marginTop:8,width:"100%",height:48,borderRadius:8,
          background:"transparent",border:"1px dashed #404040",color:"#a3a3a3",fontSize:13,
          display:"inline-flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",cursor:"pointer"}}>
          <span>Add notes</span>
          <ic.Plus size={14}/>
        </button>
      </div>
    </div>
  );
}

function ExerciseGroupRow({ ex }) {
  const [sets, setSets] = useState(ex.sets);
  const addSet = () => {
    const last = sets[sets.length-1] || {w:0, r:0};
    setSets([...sets, {n: sets.length+1, w: last.w, r: last.r}]);
  };
  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:6}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"#d4d4d4"}}>↳ {ex.name}</p>
        <span style={{fontSize:11,color:"#737373",fontVariantNumeric:"tabular-nums"}}>{sets.length} sets</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {sets.map(s => (
          <div key={s.n} style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 32px",gap:8,alignItems:"center"}}>
            <span style={{height:24,width:24,borderRadius:"50%",background:"#0a0a0a",
              border:"1px solid #262626",display:"inline-flex",alignItems:"center",justifyContent:"center",
              fontSize:10,color:"#a3a3a3",fontVariantNumeric:"tabular-nums"}}>{s.n}</span>
            <SetField defaultValue={s.w} unit="Lbs"/>
            <SetField defaultValue={s.r} unit="Reps"/>
            <span/>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 1fr 32px",gap:8,alignItems:"center"}}>
          <span/><span/><span/>
          <button onClick={addSet} aria-label="Add set" style={{height:32,width:32,borderRadius:"50%",
            border:"1px solid rgba(16,185,129,0.4)",background:"rgba(16,185,129,0.10)",color:"#6ee7b7",
            cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            <ic.Plus size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}
function SetField({ defaultValue, unit }) {
  return (
    <label style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:"0 8px",
      borderRadius:6,border:"1px solid #262626",background:"#0a0a0a"}}>
      <input defaultValue={defaultValue} inputMode="decimal"
        style={{width:"100%",height:"100%",border:"none",background:"transparent",color:"#fff",
          fontSize:13,outline:"none",fontVariantNumeric:"tabular-nums",fontFamily:"inherit",minWidth:0}}/>
      <span style={{fontSize:10,color:"#737373",textTransform:"none",flexShrink:0}}>{unit}</span>
    </label>
  );
}

/* ─── Body / placeholder ──────────────────────────────────────────────── */
function BodyScreen() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <header>
        <H1>Body</H1>
        <p style={{margin:"4px 0 0",fontSize:14,color:"#a3a3a3"}}>Log weight and progress photos.</p>
      </header>
      <Card>
        <Eyebrow>Latest</Eyebrow>
        <p style={{margin:"4px 0 0",fontSize:24,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>178.4 <span style={{fontSize:14,color:"#a3a3a3",fontWeight:400}}>lb</span></p>
        <p style={{margin:0,fontSize:11,color:"#737373"}}>Apr 24</p>
      </Card>
      <PrimaryButton>+ Log weight</PrimaryButton>
    </div>
  );
}

Object.assign(window, {
  Eyebrow, H1, Card, PrimaryButton, GhostButton, DashedButton, ExercisePlate,
  BottomNav, LoginScreen, TodayScreen, WorkoutScreen, ProgramScreen,
  HistoryScreen, SettingsScreen, BodyScreen,
  CalendarScreen, DayDetailSheet,
});
