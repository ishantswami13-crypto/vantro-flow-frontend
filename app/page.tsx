"use client";
import "./atlas.css";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { enableDemoMode } from "@/lib/demo";

function AtlasMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className="atlas-mark-spin"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z" />
    </svg>
  );
}

function useNavScroll(navRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = navRef.current; if (!el) return;
    const fn = () => el.classList.toggle("on", window.scrollY > 20);
    fn(); window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [navRef]);
}

function useReveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll(".atlas-page .rv, .atlas-page .rv2"));
    const show = (el: Element) => {
      el.classList.add("in");
      if (reduce) setTimeout(() => {
        const ts = el.classList.contains("rv2") ? Array.from(el.children) : [el];
        ts.forEach(c => { const s = c as HTMLElement; if (parseFloat(getComputedStyle(s).opacity) < 0.05) { s.style.transition="none"; s.style.opacity="1"; s.style.transform="none"; } });
      }, 1200);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.07, rootMargin: "0px 0px -5% 0px" });
    els.forEach(el => io.observe(el));
    const sweep = () => { const vh = window.innerHeight; els.forEach(el => { if (el.classList.contains("in")) return; const r = el.getBoundingClientRect(); if (r.top < vh * 0.92 && r.bottom > 0) show(el); }); };
    requestAnimationFrame(() => requestAnimationFrame(sweep));
    window.addEventListener("scroll", sweep, { passive: true });
    setTimeout(sweep, 300);
    return () => { io.disconnect(); window.removeEventListener("scroll", sweep); };
  }, []);
}

function useCortexCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, last = 0, brainRot = 0, radarAngle = 0, scanR = 0, scanAlpha = 0;
    const INPUTS = [
      {label:"Invoices & Ledger",sub:"Tally / Excel",tag:"INV_SYNC"},
      {label:"Customers",sub:"payment history",tag:"CUS_HIST"},
      {label:"Bank & UPI",sub:"live transactions",tag:"TXN_LIVE"},
      {label:"WhatsApp",sub:"threads & data",tag:"MSG_IN"},
      {label:"Inventory",sub:"stock levels",tag:"STK_DELTA"},
    ];
    const OUTPUTS = [
      {label:"Action List",sub:"ranked by AI",tag:"ACT_RANK"},
      {label:"Cash Forecast",sub:"90-day view",tag:"CF_90D"},
      {label:"Risk Alerts",sub:"flags & scores",tag:"RSK_FLAG"},
      {label:"WA Messages",sub:"ready to send",tag:"WA_QUEUE"},
      {label:"Reorder Plan",sub:"inventory",tag:"ORD_AUTO"},
    ];
    type NodeT={x:number;y:number;label:string;sub:string;tag:string;type:string;ph:number};
    type BlobT={t:number;sx:number;sy:number;ex:number;ey:number;sp:number;tag:string;nodeIdx:number;ph:number;trail:{x:number;y:number}[]};
    let nodes:NodeT[]=[], blobs:BlobT[]=[], brain={x:0,y:0}, edgeAlpha:number[]=[];

    const setup=()=>{
      const r=canvas!.parentElement!.getBoundingClientRect(); W=r.width; H=r.height;
      canvas!.width=W*DPR; canvas!.height=H*DPR; canvas!.style.width=W+"px"; canvas!.style.height=H+"px";
      ctx!.setTransform(DPR,0,0,DPR,0,0); brain={x:W/2,y:H/2}; nodes=[]; blobs=[];
      const m=W<580?W*0.11:W*0.19,cw=W-m*2,n=INPUTS.length;
      for(let i=0;i<n;i++){const y=H/2+(i-(n-1)/2)*((H*0.62)/(n-1)||1);nodes.push({x:m,y,label:INPUTS[i].label,sub:INPUTS[i].sub,tag:INPUTS[i].tag,type:"in",ph:Math.random()*6.28});}
      for(let i=0;i<n;i++){const y=H/2+(i-(n-1)/2)*((H*0.62)/(n-1)||1);nodes.push({x:m+cw,y,label:OUTPUTS[i].label,sub:OUTPUTS[i].sub,tag:OUTPUTS[i].tag,type:"out",ph:Math.random()*6.28});}
      edgeAlpha=nodes.map(()=>0);
    };
    const bpt=(t:number,sx:number,sy:number,ex:number,ey:number)=>{const mx=(sx+ex)/2,mt=1-t;return{x:mt*mt*mt*sx+3*mt*mt*t*mx+3*mt*t*t*mx+t*t*t*ex,y:mt*mt*mt*sy+3*mt*mt*t*sy+3*mt*t*t*ey+t*t*t*ey};};
    const blobPath=(cx:number,cy:number,baseR:number,phase:number)=>{
      const N=7,pts:[number,number][]=[];
      for(let i=0;i<N;i++){const a=(i/N)*Math.PI*2,w=0.68+0.32*Math.sin(phase*1.9+i*0.93+phase*0.5);pts.push([cx+Math.cos(a)*baseR*w,cy+Math.sin(a)*baseR*w]);}
      ctx!.beginPath();ctx!.moveTo((pts[N-1][0]+pts[0][0])/2,(pts[N-1][1]+pts[0][1])/2);
      for(let i=0;i<N;i++){const p=pts[i],p2=pts[(i+1)%N];ctx!.quadraticCurveTo(p[0],p[1],(p[0]+p2[0])/2,(p[1]+p2[1])/2);}ctx!.closePath();
    };
    const rrect=(x:number,y:number,w:number,h:number,r:number)=>{ctx!.beginPath();ctx!.moveTo(x+r,y);ctx!.lineTo(x+w-r,y);ctx!.quadraticCurveTo(x+w,y,x+w,y+r);ctx!.lineTo(x+w,y+h-r);ctx!.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx!.lineTo(x+r,y+h);ctx!.quadraticCurveTo(x,y+h,x,y+h-r);ctx!.lineTo(x,y+r);ctx!.quadraticCurveTo(x,y,x+r,y);ctx!.closePath();};
    const spawnBlob=()=>{
      const inN=nodes.filter(n=>n.type==="in"),outN=nodes.filter(n=>n.type==="out"),goIn=Math.random()<0.5;
      const src=goIn?inN[(Math.random()*inN.length)|0]:outN[(Math.random()*outN.length)|0];
      const idx=nodes.indexOf(src),sx=goIn?src.x:brain.x,sy=goIn?src.y:brain.y,ex=goIn?brain.x:src.x,ey=goIn?brain.y:src.y;
      blobs.push({t:0,sx,sy,ex,ey,sp:0.007+Math.random()*0.007,tag:src.tag,nodeIdx:idx,ph:Math.random()*6.28,trail:[]});
      if(idx>=0)edgeAlpha[idx]=0.5;
    };
    const drawHexGrid=()=>{
      const s=34,rows=Math.ceil(H/(s*1.73))+2,cols=Math.ceil(W/(s*1.5))+2;
      ctx!.strokeStyle="rgba(255,255,255,0.022)";ctx!.lineWidth=0.6;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const hx=col*s*1.5-s,hy=row*s*1.73+(col%2?s*0.865:0)-s*0.5;
        ctx!.beginPath();for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-30),r2=s*0.48;k===0?ctx!.moveTo(hx+r2*Math.cos(a),hy+r2*Math.sin(a)):ctx!.lineTo(hx+r2*Math.cos(a),hy+r2*Math.sin(a));}ctx!.closePath();ctx!.stroke();
      }
    };
    const drawEdge=(nx:number,ny:number,glow:number,now:number)=>{
      const mx=(nx+brain.x)/2;
      ctx!.strokeStyle=glow>0?`rgba(255,255,255,${0.08+glow*0.22})`:"rgba(255,255,255,0.06)";ctx!.lineWidth=glow>0?1.4:0.8;ctx!.setLineDash([]);
      ctx!.beginPath();ctx!.moveTo(nx,ny);ctx!.bezierCurveTo(mx,ny,mx,brain.y,brain.x,brain.y);ctx!.stroke();
      ctx!.strokeStyle=`rgba(255,255,255,${0.10+glow*0.15})`;ctx!.lineWidth=1;ctx!.setLineDash([4,12]);ctx!.lineDashOffset=-(now*0.045%16);
      ctx!.beginPath();ctx!.moveTo(nx,ny);ctx!.bezierCurveTo(mx,ny,mx,brain.y,brain.x,brain.y);ctx!.stroke();ctx!.setLineDash([]);
    };
    const drawBrain=(now:number)=>{
      brainRot+=0.004;const R=W<580?28:38,tw=0.55+0.45*Math.sin(now*0.0008);radarAngle+=0.022;const rLen=R+70;
      for(let i=0;i<20;i++){const a=radarAngle-i*0.04;ctx!.beginPath();ctx!.moveTo(brain.x,brain.y);ctx!.arc(brain.x,brain.y,rLen,a,a+0.04);ctx!.closePath();ctx!.fillStyle=`rgba(255,255,255,${0.11*(1-i/20)})`;ctx!.fill();}
      if(scanR>0){scanAlpha-=0.011;scanR+=2.2;if(scanAlpha>0){ctx!.strokeStyle=`rgba(255,255,255,${scanAlpha})`;ctx!.lineWidth=1.2;ctx!.beginPath();ctx!.arc(brain.x,brain.y,scanR,0,6.28);ctx!.stroke();}else{scanR=0;scanAlpha=0;}}
      ([[R+18,[5,9],1],[R+38,[3,14],-0.65],[R+60,[2,22],0.4]] as [number,[number,number],number][]).forEach(([rad,dash,spin],i)=>{ctx!.save();ctx!.translate(brain.x,brain.y);ctx!.rotate(brainRot*spin*1.2+i);ctx!.strokeStyle=`rgba(255,255,255,${0.12-i*0.03})`;ctx!.lineWidth=1;ctx!.setLineDash(dash);ctx!.beginPath();ctx!.arc(0,0,rad,0,6.28);ctx!.stroke();ctx!.setLineDash([]);ctx!.restore();});
      for(let i=0;i<4;i++){const a=brainRot*1.7+i*Math.PI/2;ctx!.strokeStyle="rgba(255,255,255,0.3)";ctx!.lineWidth=2;ctx!.beginPath();ctx!.arc(brain.x,brain.y,R+9,a,a+0.46);ctx!.stroke();}
      const ch=R+74;ctx!.strokeStyle="rgba(255,255,255,0.07)";ctx!.lineWidth=0.8;ctx!.setLineDash([3,9]);ctx!.beginPath();ctx!.moveTo(brain.x-ch,brain.y);ctx!.lineTo(brain.x+ch,brain.y);ctx!.stroke();ctx!.beginPath();ctx!.moveTo(brain.x,brain.y-ch);ctx!.lineTo(brain.x,brain.y+ch);ctx!.stroke();ctx!.setLineDash([]);
      const gO=ctx!.createRadialGradient(brain.x,brain.y,R*.5,brain.x,brain.y,R*3);gO.addColorStop(0,`rgba(255,255,255,${0.18*tw})`);gO.addColorStop(.4,`rgba(255,255,255,${0.05*tw})`);gO.addColorStop(1,"rgba(255,255,255,0)");ctx!.fillStyle=gO;ctx!.beginPath();ctx!.arc(brain.x,brain.y,R*3,0,6.28);ctx!.fill();
      const gC=ctx!.createRadialGradient(brain.x,brain.y,0,brain.x,brain.y,R);gC.addColorStop(0,"rgba(255,255,255,0.93)");gC.addColorStop(.45,"rgba(255,255,255,0.28)");gC.addColorStop(1,"rgba(255,255,255,0.06)");ctx!.fillStyle=gC;ctx!.beginPath();ctx!.arc(brain.x,brain.y,R,0,6.28);ctx!.fill();
      ctx!.strokeStyle="rgba(0,0,0,0.16)";ctx!.lineWidth=1;ctx!.setLineDash([]);ctx!.beginPath();ctx!.moveTo(brain.x-R*.6,brain.y);ctx!.lineTo(brain.x+R*.6,brain.y);ctx!.stroke();ctx!.beginPath();ctx!.moveTo(brain.x,brain.y-R*.6);ctx!.lineTo(brain.x,brain.y+R*.6);ctx!.stroke();
      ctx!.textAlign="center";ctx!.fillStyle="rgba(0,0,0,0.88)";ctx!.font=`700 ${W<580?10:13}px "Space Grotesk",system-ui,sans-serif`;ctx!.fillText("ATLAS",brain.x,brain.y-3);
      ctx!.font=`500 ${W<580?7:9}px "JetBrains Mono",ui-monospace,monospace`;ctx!.fillStyle="rgba(0,0,0,0.55)";ctx!.fillText("CORTEX",brain.x,brain.y+10);
    };
    const drawNode=(n:NodeT,now:number)=>{
      const tw=0.5+0.5*Math.sin(now*0.0012+n.ph),r=W<580?4:5+tw*1.5;
      const g=ctx!.createRadialGradient(n.x,n.y,0,n.x,n.y,18);g.addColorStop(0,`rgba(255,255,255,${0.16*tw})`);g.addColorStop(1,"rgba(255,255,255,0)");ctx!.fillStyle=g;ctx!.beginPath();ctx!.arc(n.x,n.y,18,0,6.28);ctx!.fill();
      ctx!.save();ctx!.translate(n.x,n.y);ctx!.rotate(Math.PI/4);ctx!.fillStyle=`rgba(255,255,255,${0.82*tw})`;const sq=r*1.2;ctx!.fillRect(-sq/2,-sq/2,sq,sq);ctx!.restore();
      ctx!.strokeStyle=`rgba(255,255,255,${0.16*tw})`;ctx!.lineWidth=1;ctx!.beginPath();ctx!.arc(n.x,n.y,12,0,6.28);ctx!.stroke();
      if(W<560)return;const lx=n.type==="in"?n.x-22:n.x+22;ctx!.textAlign=n.type==="in"?"right":"left";
      ctx!.fillStyle="rgba(255,255,255,.76)";ctx!.font='500 13px "Space Grotesk",system-ui,sans-serif';ctx!.fillText(n.label,lx,n.y-2);
      ctx!.fillStyle="rgba(255,255,255,.28)";ctx!.font='10px "JetBrains Mono",ui-monospace,monospace';ctx!.fillText(n.sub,lx,n.y+13);
    };
    const drawBlob=(b:BlobT,now:number)=>{
      if(b.t>=1)return;const pt=bpt(b.t,b.sx,b.sy,b.ex,b.ey);b.trail.push({x:pt.x,y:pt.y});if(b.trail.length>22)b.trail.shift();
      const fade=Math.sin(b.t*Math.PI),bphase=now*0.0018+b.ph,baseR=W<580?6:9;
      for(let i=0;i<b.trail.length;i++){const frac=i/b.trail.length,ta=frac*frac*0.14*fade,tr=baseR*frac*0.72;if(ta<0.008||tr<1.5)continue;blobPath(b.trail[i].x,b.trail[i].y,tr,bphase-(b.trail.length-i)*0.09);ctx!.fillStyle=`rgba(255,255,255,${ta})`;ctx!.fill();}
      const gO=ctx!.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,baseR*3.2);gO.addColorStop(0,`rgba(255,255,255,${0.20*fade})`);gO.addColorStop(1,"rgba(255,255,255,0)");ctx!.fillStyle=gO;ctx!.beginPath();ctx!.arc(pt.x,pt.y,baseR*3.2,0,6.28);ctx!.fill();
      blobPath(pt.x,pt.y,baseR,bphase);ctx!.fillStyle=`rgba(255,255,255,${0.86*fade})`;ctx!.fill();
      blobPath(pt.x,pt.y,baseR*0.42,bphase+0.5);ctx!.fillStyle=`rgba(255,255,255,${0.28*fade})`;ctx!.fill();
      if(W>560&&b.tag&&b.t>0.28&&b.t<0.72){const tf=Math.min(1,Math.min(b.t-0.28,0.72-b.t)*8);ctx!.font='600 8.5px "JetBrains Mono",ui-monospace,monospace';ctx!.textAlign="center";const tw2=ctx!.measureText(b.tag).width+10;ctx!.fillStyle=`rgba(8,8,8,${0.85*tf})`;rrect(pt.x-tw2/2,pt.y-21,tw2,13,3);ctx!.fill();ctx!.strokeStyle=`rgba(255,255,255,${0.25*tf})`;ctx!.lineWidth=0.7;rrect(pt.x-tw2/2,pt.y-21,tw2,13,3);ctx!.stroke();ctx!.fillStyle=`rgba(255,255,255,${0.88*tf})`;ctx!.fillText(b.tag,pt.x,pt.y-11);}
    };
    const drawCoords=()=>{if(W<640)return;ctx!.font='9px "JetBrains Mono",ui-monospace,monospace';ctx!.fillStyle="rgba(255,255,255,0.12)";ctx!.textAlign="left";ctx!.fillText("0,0",8,16);ctx!.textAlign="right";ctx!.fillText(Math.round(W)+",0",W-8,16);ctx!.textAlign="left";ctx!.fillText("0,"+Math.round(H),8,H-6);ctx!.textAlign="right";ctx!.fillText(Math.round(W)+","+Math.round(H),W-8,H-6);};
    const frame=(now:number)=>{
      ctx!.clearRect(0,0,W,H);drawHexGrid();
      for(let i=0;i<edgeAlpha.length;i++)if(edgeAlpha[i]>0)edgeAlpha[i]=Math.max(0,edgeAlpha[i]-0.018);
      nodes.forEach((n,i)=>drawEdge(n.x,n.y,edgeAlpha[i]||0,now));drawBrain(now);
      for(let i=blobs.length-1;i>=0;i--){drawBlob(blobs[i],now);if(blobs[i].t>=1)blobs.splice(i,1);}
      blobs.forEach(b=>{b.t+=b.sp;});nodes.forEach(n=>drawNode(n,now));drawCoords();
      if(now-last>280){last=now;if(blobs.length<10)spawnBlob();if(Math.random()<0.06&&scanR===0){scanR=38;scanAlpha=0.55;}}
      raf=requestAnimationFrame(frame);
    };
    const start=()=>{setup();if(reduce){ctx!.clearRect(0,0,W,H);drawHexGrid();nodes.forEach(n=>{ctx!.strokeStyle="rgba(255,255,255,0.06)";ctx!.beginPath();ctx!.moveTo(n.x,n.y);ctx!.bezierCurveTo((n.x+brain.x)/2,n.y,(n.x+brain.x)/2,brain.y,brain.x,brain.y);ctx!.stroke();});nodes.forEach(n=>{ctx!.fillStyle="rgba(255,255,255,.45)";ctx!.beginPath();ctx!.arc(n.x,n.y,5,0,6.28);ctx!.fill();});return;}cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);};
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(reduce)return;if(e.isIntersecting){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}else cancelAnimationFrame(raf);}),{threshold:0});
    io.observe(canvas);let rt=0;const onResize=()=>{clearTimeout(rt);rt=window.setTimeout(start,180);};window.addEventListener("resize",onResize);start();
    return()=>{cancelAnimationFrame(raf);io.disconnect();window.removeEventListener("resize",onResize);};
  },[canvasRef]);
}

/* ── CORTEX AGENT NETWORK — 200 agents, 20×10 grid ──────────── */
function useAgentNetCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv)return;
    const ctx=cv.getContext("2d"); if(!ctx)return;
    const DPR=Math.min(2,window.devicePixelRatio||1);
    const reduce=window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    let W=0,H=520,raf=0,startTime=0,lastT=0;
    let mX=-9999,mY=-9999,hovAgent:NamedAgent|null=null,hovFade=0;
    const COLS=20,ROWS=10;

    type NamedAgent={col:number;row:number;num:string;name:string;status:string;desc:string};
    type Agent={col:number;row:number;named:NamedAgent|null;x:number;y:number;pT:number;nP:number};

    const NAMED:NamedAgent[]=[
      {col:9, row:0,num:"001",name:"Policy Guard",   status:"ALWAYS ACTIVE",  desc:"Checks every action. Blocks unsafe messages, legal threats and cross-tenant leakage."},
      {col:2, row:0,num:"002",name:"Cost Router",    status:"EVERY CALL",     desc:"Routes to cheapest engine — rules, cache, cheap or strong model."},
      {col:16,row:0,num:"003",name:"Data Quality",   status:"DAILY SWEEP",    desc:"Detects missing dates, duplicates and corrupted records before they affect AI decisions."},
      {col:3, row:2,num:"005",name:"Collections",    status:"RUNS DAILY",     desc:"Scores every debtor by pay probability. Right reminder at the right time."},
      {col:8, row:2,num:"006",name:"Cashflow",       status:"DAILY FORECAST", desc:"Monitors cash and forecasts gaps 90 days out."},
      {col:13,row:2,num:"007",name:"Credit Risk",    status:"PER TRANSACTION",desc:"Real-time credit scoring per customer. Flags exposure before a new sale worsens it."},
      {col:18,row:2,num:"008",name:"Promise Tracker",status:"REAL-TIME",      desc:"Tracks every payment promise and escalates broken ones automatically."},
      {col:1, row:5,num:"009",name:"Owner Briefing", status:"EVERY MORNING",  desc:"Generates the ranked daily action list. Complete picture in 60 seconds."},
      {col:6, row:5,num:"010",name:"Inventory-Cash", status:"DAILY",          desc:"Links stock levels to cash pressure. Flags reorder danger points before crisis."},
      {col:11,row:5,num:"011",name:"Dispute",        status:"EVENT-DRIVEN",   desc:"Detects invoice disputes, pauses collections, routes to resolution."},
      {col:16,row:5,num:"012",name:"Payables",       status:"WEEKLY",         desc:"Optimises supplier payment timing vs available cash."},
      {col:4, row:8,num:"013",name:"Alert Mgr",      status:"ALWAYS ACTIVE",  desc:"Monitors all KPIs in real-time. Fires alerts the moment a threshold is crossed."}
    ];

    const namedMap:Record<string,NamedAgent>={};
    NAMED.forEach(a=>{ namedMap[a.col+"-"+a.row]=a; });
    const agents:Agent[]=[];
    for(let row=0;row<ROWS;row++)
      for(let col=0;col<COLS;col++)
        agents.push({col,row,named:namedMap[col+"-"+row]||null,x:0,y:0,pT:0,nP:Math.random()*5000});

    function computeLayout(){
      H=W<480?380:520;
      cv!.width=W*DPR; cv!.height=H*DPR;
      cv!.style.width=W+"px"; cv!.style.height=H+"px";
      ctx!.setTransform(DPR,0,0,DPR,0,0);
      const px=W<480?20:36,py=W<480?32:44;
      const cw=(W-px*2)/(COLS-1),ch=(H-py*2)/(ROWS-1);
      agents.forEach(a=>{ a.x=px+a.col*cw; a.y=py+a.row*ch; });
    }

    function rrect(x:number,y:number,w:number,h:number,r:number){ctx!.beginPath();ctx!.moveTo(x+r,y);ctx!.lineTo(x+w-r,y);ctx!.quadraticCurveTo(x+w,y,x+w,y+r);ctx!.lineTo(x+w,y+h-r);ctx!.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx!.lineTo(x+r,y+h);ctx!.quadraticCurveTo(x,y+h,x,y+h-r);ctx!.lineTo(x,y+r);ctx!.quadraticCurveTo(x,y,x+r,y);ctx!.closePath();}

    function drawCard(ag:NamedAgent){
      const CW=252,CH=130,pad=14;
      let px2=ag.col<COLS/2?agents[ag.row*COLS+ag.col].x+14:agents[ag.row*COLS+ag.col].x-CW-14;
      let py2=agents[ag.row*COLS+ag.col].y-CH/2;
      px2=Math.max(8,Math.min(W-CW-8,px2)); py2=Math.max(8,Math.min(H-CH-8,py2));
      ctx!.save(); ctx!.globalAlpha=hovFade;
      ctx!.fillStyle="rgba(2,2,5,.98)"; rrect(px2,py2,CW,CH,6); ctx!.fill();
      ctx!.fillStyle="rgba(255,255,255,.88)"; rrect(px2,py2,CW,1.5,0); ctx!.fill();
      ctx!.strokeStyle="rgba(255,255,255,.1)"; ctx!.lineWidth=1; rrect(px2,py2,CW,CH,6); ctx!.stroke();
      ctx!.textAlign="left";
      ctx!.fillStyle="rgba(255,255,255,.25)"; ctx!.font='400 7.5px "JetBrains Mono",monospace'; ctx!.fillText("AGENT "+ag.num+" · CORTEX MESH",px2+pad,py2+15);
      ctx!.fillStyle="rgba(255,255,255,.14)"; ctx!.font='400 7px "JetBrains Mono",monospace'; ctx!.fillText(ag.status,px2+pad,py2+26);
      ctx!.fillStyle="rgba(255,255,255,.9)"; ctx!.font='600 14px "Space Grotesk",system-ui'; ctx!.fillText(ag.name,px2+pad,py2+46);
      ctx!.fillStyle="rgba(255,255,255,.38)"; ctx!.font='400 10px "Space Grotesk",system-ui';
      const ws=ag.desc.split(" "); let line="",ly=py2+64;
      for(let i=0;i<ws.length;i++){const t=line+(line?" ":"")+ws[i];if(ctx!.measureText(t).width>CW-pad*2&&line){ctx!.fillText(line,px2+pad,ly);line=ws[i];ly+=13;}else line=t;}
      ctx!.fillText(line,px2+pad,ly);
      ctx!.restore();
    }

    function frame(now:number){
      if(!startTime) startTime=now;
      const dt=Math.min(50,now-lastT); lastT=now;
      const elapsed=now-startTime;
      ctx!.clearRect(0,0,W,H);

      // HUD corners
      const cs=16;
      ctx!.strokeStyle="rgba(255,255,255,.16)"; ctx!.lineWidth=1.2;
      [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]].forEach(c=>{
        ctx!.beginPath(); ctx!.moveTo(c[0]+c[2]*cs,c[1]); ctx!.lineTo(c[0],c[1]); ctx!.lineTo(c[0],c[1]+c[3]*cs); ctx!.stroke();
      });
      ctx!.font='400 8.5px "JetBrains Mono",monospace';
      ctx!.fillStyle="rgba(255,255,255,.18)"; ctx!.textAlign="left";
      ctx!.fillText("CORTEX · 200 AGENTS ACTIVE",W<480?16:26,14);
      ctx!.textAlign="right"; ctx!.fillText("ALL SYSTEMS NOMINAL",W<480?W-16:W-26,14);
      ctx!.fillStyle="rgba(255,255,255,.07)"; ctx!.textAlign="left";
      ctx!.fillText("HOVER NAMED NODES FOR DETAIL",W<480?16:26,H-8);

      // Pulse wave sweeping left→right
      const pulseNorm=((elapsed*0.00022)%1.4)-0.2;
      const pxPx=pulseNorm*W;
      const bigScreen=W>560;

      // Connections
      agents.forEach(a=>{
        (bigScreen?[[1,0],[0,1],[1,1]]:[[1,0],[0,1]] as number[][]).forEach(dir=>{
          const nx=a.col+dir[0],ny=a.row+dir[1];
          if(nx>=COLS||ny>=ROWS)return;
          const nb=agents[ny*COLS+nx];
          const pg=Math.max(0,1-Math.abs((a.x+nb.x)/2-pxPx)/70)*0.14;
          ctx!.strokeStyle=`rgba(255,255,255,${0.04+pg})`; ctx!.lineWidth=0.5+pg*2;
          ctx!.beginPath(); ctx!.moveTo(a.x,a.y); ctx!.lineTo(nb.x,nb.y); ctx!.stroke();
        });
      });

      // Dots
      let newH:NamedAgent|null=null;
      agents.forEach(a=>{
        const pg=Math.max(0,1-Math.abs(a.x-pxPx)/55);
        const isN=!!a.named;
        const isH=!!(a.named&&Math.abs(mX-a.x)<10&&Math.abs(mY-a.y)<10);
        if(isH&&a.named) newH=a.named;
        if(!reduce){a.nP-=dt;if(a.nP<=0){a.pT=1;a.nP=2500+Math.random()*8000;}if(a.pT>0)a.pT=Math.max(0,a.pT-dt/480);}
        const sp=a.pT;
        const brightness=(isN?0.52:0.13)+pg*0.48+sp*0.26+(isH?0.36:0);
        const dr=isN?3.4:2;
        if(isN||pg>0.22||sp>0.22){
          const gr=dr*(isN?4.5:3.5);
          const g=ctx!.createRadialGradient(a.x,a.y,0,a.x,a.y,gr);
          g.addColorStop(0,`rgba(255,255,255,${brightness*0.36})`); g.addColorStop(1,"rgba(255,255,255,0)");
          ctx!.fillStyle=g; ctx!.beginPath(); ctx!.arc(a.x,a.y,gr,0,6.28); ctx!.fill();
        }
        ctx!.fillStyle=`rgba(255,255,255,${brightness})`; ctx!.beginPath(); ctx!.arc(a.x,a.y,dr*(isH?1.5:1),0,6.28); ctx!.fill();
        if(isN&&W>480&&(pg>0.1||sp>0.15||isH)){
          const la=Math.max(pg*0.85,sp*0.75,isH?0.7:0);
          const side=a.col<COLS/2?1:-1;
          ctx!.fillStyle=`rgba(255,255,255,${la})`; ctx!.font=`500 ${W<700?7:8}px "JetBrains Mono",monospace`;
          ctx!.textAlign=side>0?"left":"right";
          ctx!.fillText(a.named!.name,a.x+side*(dr+6),a.y-5);
          ctx!.fillStyle=`rgba(255,255,255,${la*0.4})`; ctx!.font='400 6.5px "JetBrains Mono",monospace';
          ctx!.fillText(a.named!.num,a.x+side*(dr+6),a.y+10); ctx!.textAlign="left";
        }
      });

      if(newH){hovAgent=newH;hovFade=Math.min(1,hovFade+.1);}
      else{hovFade=Math.max(0,hovFade-.07);if(!hovFade)hovAgent=null;}
      if(hovAgent&&hovFade>.01) drawCard(hovAgent);
      raf=requestAnimationFrame(frame);
    }

    function setup(){const r=cv!.parentElement!.getBoundingClientRect();W=r.width||800;computeLayout();}

    const onMM=(e:MouseEvent)=>{const r=cv!.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);cv!.style.cursor="crosshair";};
    const onML=()=>{mX=-9999;mY=-9999;};
    cv.addEventListener("mousemove",onMM); cv.addEventListener("mouseleave",onML);

    const io=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){if(!raf){setup();startTime=0;raf=requestAnimationFrame(frame);}}
      else{cancelAnimationFrame(raf);raf=0;}
    }),{threshold:0});
    io.observe(cv);

    let rt=0;const onResize=()=>{clearTimeout(rt);rt=window.setTimeout(()=>{setup();startTime=0;},180);};
    window.addEventListener("resize",onResize);
    setup(); startTime=0;
    return()=>{cancelAnimationFrame(raf);io.disconnect();window.removeEventListener("resize",onResize);cv.removeEventListener("mousemove",onMM);cv.removeEventListener("mouseleave",onML);};
  },[canvasRef]);
}

const INTEGRATIONS=["QuickBooks","Stripe","Xero","WhatsApp Business","Tally ERP","Zoho Books","Razorpay","Salesforce","HubSpot","Excel / CSV","PayPal","NetSuite","FreshBooks","Square"];
const FEATURES=[
  {idx:"01",metric:"3.2× collection lift",title:"Collections Autopilot",desc:"AI scores every debtor by pay probability, sends the right reminder at the right time — in their language, personally. Zero manual chasing. Every day, automatically."},
  {idx:"02",metric:"Daily · every morning",title:"AI Owner Briefing",desc:"Who to call, what's risky, what cash is incoming, what to approve today. One screen. The complete picture in under 60 seconds."},
  {idx:"03",metric:"90-day visibility",title:"Cash Flow Forecast",desc:"Three-scenario forecast updated daily. Automated runway alerts. Know what's coming before it arrives — not after the crisis starts."},
  {idx:"04",metric:"73% open rate",title:"Smart Messaging",desc:"AI-crafted reminders delivered via the channel your customer prefers — email, WhatsApp, SMS. Feels personal. Works globally. Sent at the optimal moment."},
  {idx:"05",metric:"Real-time risk radar",title:"Risk Signals",desc:"Credit flags, broken-promise tracking, payment behaviour scoring. Atlas alerts you before a slow payer becomes a bad debt written off."},
  {idx:"06",metric:"Live stock intelligence",title:"Inventory Intelligence",desc:"Moving stock vs trapped capital — updated daily. See exactly what's tying up your working capital and what needs reordering before you run out."},
];
const PIPELINE=[
  {phase:"INPUT",n:"01",name:"Business Event",desc:"sale · overdue · promise missed · payment received · silent customer detected"},
  {phase:"INPUT",n:"02",name:"Event Normalizer",desc:"Converts raw event into a structured, typed signal ready for pipeline processing"},
  {phase:"INTEL",n:"03",name:"Context Builder",desc:"Fetches full user-scoped context from Postgres — customers, invoices, history, promises"},
  {phase:"INTEL",n:"04",name:"Agent Router",desc:"Cortex Orchestrator selects the correct specialized agent for this event type"},
  {phase:"INTEL",n:"05",name:"Rust Engine",desc:"Deterministic score, policy evaluation, timing calculation, risk — zero ambiguity, zero hallucination"},
  {phase:"INTEL",n:"06",name:"LLM Gate",desc:"Reasoning and language generation, only when this event requires it. Never by default."},
  {phase:"SAFETY",n:"07",name:"Policy Guard",desc:"Blocks unsafe actions, legal threats, cross-tenant leakage. Every proposed output reviewed."},
  {phase:"SAFETY",n:"08",name:"Owner Approval",desc:"Risky or high-value actions pause here. Human sign-off required before any execution."},
  {phase:"OUTPUT",n:"09",name:"Execution",desc:"Creates the task, sends the reminder, generates the action card. Real-world effect fires."},
  {phase:"OUTPUT",n:"10",name:"Audit Log",desc:"Full decision trail — agent, inputs, output, policy hash, timestamp. Immutable."},
  {phase:"OUTPUT",n:"11",name:"Outcome Tracking",desc:"Reply? Payment? Promise kept? Every result feeds the Learning agent to improve future actions."},
];
const TESTI_1=[
  {av:"MJ",name:"Marcus Johnson",co:"Precision Logistics · Chicago, USA · $2.1M managed",q:"Before Atlas, we had two full-time credit controllers. Now one person handles twice the volume — and DSO dropped 34 days."},
  {av:"SM",name:"Sophie Müller",co:"Bautech Consulting · Berlin, Germany · 45 invoices/mo",q:"DSO dropped from 52 to 29 days in six weeks. I stopped sending payment reminders entirely. Atlas does it better than I ever did."},
  {av:"JO",name:"James Okafor",co:"BuildRight Materials · Lagos, Nigeria · $180K outstanding",q:"Three collectors plus Atlas. The AI does more than all three combined, every single day."},
  {av:"TR",name:"Tariq Al-Rashid",co:"Gulf Fresh Foods · Dubai, UAE · $320K managed",q:"The 90-day cash forecast is the first thing I open every morning. In four months, it hasn't been wrong once."},
  {av:"PN",name:"Priya Nair",co:"Indigo Textiles · Chennai, India · 200+ employees",q:"We export to 14 countries. Atlas handles every follow-up in the customer's time zone. Seamlessly, every single day."},
  {av:"RO",name:"Ryan O'Brien",co:"O'Brien Plumbing · Dublin, Ireland · €95K recovered",q:"First automated message went out at 7am. By 9am we had three payments clear. I was still in bed."},
  {av:"CM",name:"Carlos Mendez",co:"Acero del Norte · Mexico City, Mexico · $450K/mo",q:"My CFO wanted to hire two more people for collections. I showed him Atlas. We didn't hire anyone."},
];
const TESTI_2=[
  {av:"ST",name:"Sakura Tanaka",co:"Tanaka Fashion Trade · Tokyo, Japan · $220K managed",q:"Japanese clients expect perfect communication. Atlas gets the tone, timing, and formality right every single time."},
  {av:"IP",name:"Igor Petrov",co:"Techprom Industrial · Warsaw, Poland · 80 employees",q:"We had €340K stuck in overdue accounts for months. Six weeks with Atlas: €290K cleared."},
  {av:"MS",name:"Maria Santos",co:"Floresta E-commerce · São Paulo, Brazil · R$180K/mo",q:"Three employees, 400 invoices a month. Atlas handles every follow-up while I sleep."},
  {av:"DC",name:"David Choi",co:"KoreaNet IT Services · Seoul, South Korea · 38 enterprise clients",q:"Our biggest client paid 90 days late, every quarter, for two years. Atlas sent the right message. They now pay at 30."},
  {av:"AM",name:"Aisha Mohammed",co:"MedSupply Ghana · Accra, Ghana · 89 overdue invoices",q:"89 invoices were 60+ days overdue. Atlas prioritized them in one ranked list. 71 cleared within 30 days."},
  {av:"LF",name:"Luisa Ferreira",co:"Ferreira Food Industries · Lisbon, Portugal · €280K/mo",q:"I thought AI would send robotic messages. My customers actually complimented how personal the reminders felt."},
  {av:"NT",name:"Nguyen Thanh",co:"VietFresh Export · Ho Chi Minh City, Vietnam · $380K/mo",q:"We export to 12 countries. Before Atlas we lost 8% to bad debt every year. This year: 0.3%."},
];
const PLAN_FREE=["5 invoices per month","Manual WhatsApp messages","Basic receivables dashboard","CSV import"];
const PLAN_PRO=["Unlimited invoices","WhatsApp auto-reminders","Razorpay & UPI payment links","AI priority scoring","90-day cash flow forecast","Tally ERP sync","Inventory intelligence","AI Owner Briefing daily"];
const PLAN_SUCCESS=["Everything in Pro","No monthly fee — ever","1.5% on Atlas-collected invoices only","AI voice follow-up calls","Dedicated account manager","API access & 24/7 support"];
const FAQS=[
  {q:'What does "200 agents" mean in practice?',a:'Each agent owns a single, narrow business task. 200 agents run in parallel, each triggered by the exact business event they are designed for. Deterministic decisions at scale with a complete audit trail.'},
  {q:'Which accounting tools does Atlas connect to?',a:'QuickBooks, Xero, Zoho Books, Tally ERP, FreshBooks, NetSuite, and any system that exports CSV or has an API. Setup takes under 5 minutes.'},
  {q:'Can I review messages before they go out?',a:'"Approve before send" mode puts every message in a queue for your review. Most founders switch to fully automatic after seeing the first week of messages.'},
  {q:'Will automated reminders damage my customer relationships?',a:'Atlas learns your customer patterns. A first-time buyer gets a very different message than a chronic late-payer. Polite, personal, contextual.'},
  {q:"I've tried tools before and stopped. Why is Atlas different?",a:"Most tools show data but don't do work. Atlas sends the messages, logs responses, follows up and keeps the cycle running even when you ignore it for a week."},
  {q:'Is my financial data safe? Where is it stored?',a:'All data is encrypted in transit (TLS 1.3) and at rest (AES-256), stored in India. Full audit trail of every action. Role-based access.'},
];

export default function LandingPage() {
  const navRef=useRef<HTMLElement>(null);
  const cortexRef=useRef<HTMLCanvasElement>(null);
  const agentRef=useRef<HTMLCanvasElement>(null);
  const [mobOpen,setMobOpen]=useState(false);
  const faqBodies=useRef<(HTMLDivElement|null)[]>([]);
  const [openFaq,setOpenFaq]=useState<number|null>(null);

  useNavScroll(navRef); useReveal(); useCortexCanvas(cortexRef); useAgentNetCanvas(agentRef);

  const toggleFaq=useCallback((i:number)=>{
    setOpenFaq(prev=>{
      const next=prev===i?null:i;
      requestAnimationFrame(()=>{faqBodies.current.forEach((b,idx)=>{if(!b)return;b.style.maxHeight=idx===next?b.scrollHeight+"px":"0";});});
      return next;
    });
  },[]);

  const mag={
    onMouseMove:(e:React.MouseEvent<HTMLAnchorElement>)=>{const r=e.currentTarget.getBoundingClientRect();const x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;e.currentTarget.style.transform=`translate(${x*.18}px,${y*.26}px)`;},
    onMouseLeave:(e:React.MouseEvent<HTMLAnchorElement>)=>{e.currentTarget.style.transform="";},
  };

  return (
    <div className="atlas-page">
      <div className="grain"/>

      {/* NAV */}
      <nav ref={navRef} className={`nav${mobOpen?" mob-open":""}`}>
        <div className="wrap nav-inner">
          <a className="brand" href="#top" style={{display:"flex",alignItems:"center",gap:"11px",textDecoration:"none"}}>
            <AtlasMark size={28}/>
            <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"14.5px",letterSpacing:".2em",textTransform:"uppercase",color:"white",lineHeight:1}}>ATLAS</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a><a href="#agent-mesh">Agents</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          </div>
          <button className="nav-ham" aria-label="Menu" onClick={()=>setMobOpen(o=>!o)}><span/><span/><span/></button>
          <div className="nav-cta">
            <Link className="nav-login" href="/login">Log in</Link>
            <Link className="btn btn-primary" {...mag} href="/signup">Start free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="top">
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <span className="hero-badge"><span className="dot"/>&nbsp;200 AI Agents &middot; Every Business. Every Scale. Everywhere.</span>
            <h1><em>AI runs the ops.</em><br/>You run the business.</h1>
            <p>Atlas deploys 200 specialized AI agents across your entire business — collections, cashflow, credit risk, inventory, payables. Every decision logged. Every action explainable. Nothing assumed.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" {...mag} href="/signup">
                Start for free
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <button className="btn btn-ghost btn-lg" onClick={()=>{enableDemoMode();window.location.href="/dashboard";}}>See a demo</button>
            </div>
            <div className="hero-guarantees rv">
              <div className="hg-item"><div className="hg-val">↓18 days</div><div className="hg-lbl">Average DSO reduction</div></div>
              <div className="hg-sep"/>
              <div className="hg-item"><div className="hg-val">3.2×</div><div className="hg-lbl">Collection rate lift</div></div>
              <div className="hg-sep"/>
              <div className="hg-item"><div className="hg-val">8 min</div><div className="hg-lbl">To go live from any accounting tool</div></div>
            </div>
            <div className="hero-proof rv">
              <div className="avas"><div className="av">VM</div><div className="av">PS</div><div className="av">AG</div><div className="av">RK</div></div>
              <span><strong>200+ businesses</strong> in 14 countries &middot; live since 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRACTION */}
      <div className="traction-bar" id="traction">
        <div className="tb-inner">
          {[["$60M+","Receivables managed"],["200+","Businesses live"],["14","Countries"],["↓18d","Avg DSO cut"],["200","AI agents deployed"],["11","Pipeline stages"]].map(([v,l],i)=>(
            <div key={i} className="tb-stat"><div className="tb-val">{v}</div><div className="tb-lbl">{l}</div></div>
          ))}
        </div>
      </div>

      {/* MARQUEE */}
      <div style={{paddingBlock:"40px",borderTop:"1px solid rgba(255,255,255,.08)",borderBottom:"1px solid rgba(255,255,255,.08)",overflow:"hidden"}}>
        <div style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:"10.5px",letterSpacing:".22em",textTransform:"uppercase",color:"rgba(255,255,255,.25)",marginBottom:"20px"}}>Connects with what you already use</div>
        <div style={{display:"flex",overflow:"hidden",WebkitMaskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",maskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)"}}>
          <div className="mq-track">{[...INTEGRATIONS,...INTEGRATIONS].map((n,i)=><span key={i} style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:500,fontSize:"18px",color:"rgba(255,255,255,.38)"}}>{n}</span>)}</div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="s"><div className="wrap">
        <span className="s-label rv">The silent drain</span>
        <h2 className="pain-hed rv">Your business is<br/>bleeding cash. <em>Silently.</em></h2>
        <div className="pain-lines rv">
          <div className="pain-line"><span className="n">01</span>Dozens of open threads — invoices buried in email, chat and spreadsheets.</div>
          <div className="pain-line"><span className="n">02</span>An Excel sheet nobody has updated in three weeks.</div>
          <div className="pain-line"><span className="n">03</span>Chasing customers at random. No strategy. Just hoping someone pays today.</div>
          <div className="pain-line"><span className="n">04</span>No idea what cash is actually arriving next month.</div>
        </div>
        <div className="pain-fix rv">
          <span className="pain-fix-text">Atlas solves all four. In 8 minutes.</span>
          <a className="btn btn-ghost btn-sm" href="#cortex-section">See how →</a>
        </div>
      </div></section>

      {/* CORTEX */}
      <section className="cortex-sec" id="cortex-section"><div className="wrap">
        <span className="s-label rv">Atlas Cortex</span>
        <h2 className="rv" style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(28px,4.2vw,58px)",letterSpacing:"-0.045em",lineHeight:1.04,maxWidth:"18ch"}}>Raw data in.<br/>Ranked decisions out.</h2>
        <p className="rv s-desc" style={{maxWidth:"52ch"}}>Every morning, Atlas processes your entire business — invoices, payments, customers, stock — and hands you one list. Ranked. Specific. Ready to act on.</p>
      </div>
        <div className="cortex-canvas-wrap rv"><canvas ref={cortexRef} id="cortex"/></div>
      </section>

      {/* FEATURES */}
      <section className="s" id="features"><div className="wrap">
        <span className="s-label rv">Six modules</span>
        <h2 className="pain-hed rv" style={{fontSize:"clamp(28px,4.5vw,68px)"}}>Everything Atlas<br/>runs automatically.</h2>
        <div className="feat-list rv">{FEATURES.map(f=>(
          <div className="feat-row" key={f.idx}>
            <div className="idx">{f.idx}</div>
            <div><div className="metric">{f.metric}</div><h3>{f.title}</h3></div>
            <p>{f.desc}</p>
          </div>
        ))}</div>
      </div></section>

      {/* TECH STACK */}
      <section className="s" style={{background:"#020202"}} id="tech-stack"><div className="wrap">
        <span className="s-label rv">Powered by</span>
        <h2 className="rv" style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(26px,4vw,52px)",letterSpacing:"-0.042em",lineHeight:1.04}}>Three engines.<br/>One reliable system.</h2>
        <p className="rv s-desc">Node holds the safe production path. Rust handles all deterministic computation. Postgres is the single source of truth.</p>
        <div className="engine-grid rv">
          {[{badge:"en-node",label:"Node.js Backend",title:"Safe Production Path",items:["Auth & session management","API routing & validation","Existing business logic","JS fallback layer","Feature flag evaluation","Rust sidecar orchestration","Graceful degradation on Rust failure"]},
            {badge:"en-rust",label:"Rust — Automation RS",title:"Deterministic Engine",items:["CPI scoring engine","Policy evaluation","Credit simulation","Cost routing calculation","DB-backed bootstrap endpoints","Structured JSON schemas","Sidecar — never the primary path"]},
            {badge:"en-db",label:"Postgres",title:"Source of Truth",items:["customers","invoices","promises","payments","products / purchases","ai_actions","call_logs / audit_logs"]}
          ].map(e=>(
            <div className="engine-card" key={e.label}>
              <div className={`engine-badge ${e.badge}`}>{e.label}</div>
              <div className="engine-card-title">{e.title}</div>
              <ul>{e.items.map(i=><li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </div></section>

      {/* AGENT MESH */}
      <section className="s" id="agent-mesh"><div className="wrap">
        <span className="s-label rv">Agent Mesh</span>
        <h2 className="rv" style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(26px,4vw,52px)",letterSpacing:"-0.042em",lineHeight:1.04}}>200 Specialized Agents.<br/>Coordinated by Cortex.</h2>
        <p className="rv s-desc">Each agent owns one task — one input, one output, one purpose. Cortex selects, sequences and gates every call. No agent acts without Policy Guard review.</p>
        <div className="cortex-net-wrap rv"><canvas ref={agentRef} id="cortexAgentNet" style={{height:"340px"}}/></div>
      </div></section>

      {/* PIPELINE */}
      <section className="s" id="event-pipeline" style={{background:"#020202"}}><div className="wrap">
        <span className="s-label rv">Event Pipeline</span>
        <h2 className="rv" style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(26px,4vw,52px)",letterSpacing:"-0.042em",lineHeight:1.04}}>Event to action.<br/><span style={{color:"rgba(255,255,255,.38)"}}>11 deterministic stages.</span></h2>
        <p className="rv s-desc" style={{color:"rgba(255,255,255,.38)"}}>Every business event passes through 11 deterministic stages before any action fires. Rust engine for scoring. LLM only when needed. Human approval before execution. <span style={{color:"rgba(255,255,255,.58)"}}>Nothing assumed. Everything verified.</span></p>
      </div>
        <div className="pipe-seq rv">
          <div className="pipe-rail"><div className="pipe-signal"/></div>
          {["INPUT","INTEL","SAFETY","OUTPUT"].map(ph=>(
            <div key={ph}>
              <div className="pipe-phase-hd"><span className="pipe-ph-tag">{ph}</span><div className="pipe-ph-line"/></div>
              {PIPELINE.filter(s=>s.phase===ph).map(s=>(
                <div className="pipe-stage" key={s.n}>
                  <div className="pipe-num">{s.n}</div>
                  <div className="pipe-node"><div className="pipe-dot"/></div>
                  <div className="pipe-body"><div className="pipe-name">{s.name}</div><div className="pipe-desc">{s.desc}</div></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testi-sec">
        <div className="wrap s-head">
          <span className="s-label">Customer proof</span>
          <h2 style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(24px,3.5vw,48px)",letterSpacing:"-0.042em",lineHeight:1.05}}>Real businesses.<br/>Real numbers. 20 countries.</h2>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {[TESTI_1,TESTI_2].map((row,ri)=>(
            <div className="testi-marquee-wrap" key={ri}>
              <div className={`testi-track${ri===1?" rev":""}`}>
                {[...row,...row].map((t,i)=>(
                  <div className="t-card" key={i}>
                    <p className="t-quote">&ldquo;{t.q}&rdquo;</p>
                    <div className="t-who"><div className="t-av">{t.av}</div><div><div className="t-name">{t.name}</div><div className="t-co">{t.co}</div></div></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="s" id="pricing"><div className="wrap">
        <span className="s-label rv">Pricing</span>
        <h2 style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(30px,4.5vw,64px)",letterSpacing:"-0.045em",lineHeight:1.02}} className="rv">Start free.<br/>Scale on results.</h2>
        <div className="prices rv2">
          <div className="price">
            <div className="pname">Free</div><div className="amt">₹0<small>/forever</small></div>
            <div className="desc">Start tracking. No card needed.</div>
            <ul>{PLAN_FREE.map(f=><li key={f}>{f}</li>)}</ul>
            <Link className="pbtn pbtn-outline" href="/signup?plan=free">Get started free</Link>
          </div>
          <div className="price pop">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div className="pname">Pro</div><div className="pop-lbl">★ Most popular</div></div>
            <div className="amt">₹999<small style={{color:"rgba(0,0,0,.5)"}}>/month</small></div>
            <div className="desc">Full automation. Flat fee. No surprises.</div>
            <ul>{PLAN_PRO.map(f=><li key={f}>{f}</li>)}</ul>
            <Link className="pbtn pbtn-dark" href="/signup?plan=pro">Start 14-day free trial</Link>
          </div>
          <div className="price">
            <div className="pname">Success</div><div className="amt">₹0<small>/mo + 1.5%</small></div>
            <div className="desc">Pay only when Atlas collects for you.</div>
            <ul>{PLAN_SUCCESS.map(f=><li key={f}>{f}</li>)}</ul>
            <Link className="pbtn pbtn-outline" href="/signup?plan=success">Pay from results</Link>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:"6px 22px",marginTop:"24px",fontFamily:"'JetBrains Mono',monospace",fontSize:"11px",color:"rgba(255,255,255,.25)",letterSpacing:".04em"}} className="rv">
          SOC 2 Type II &middot; Role-based access &middot; Full audit trail &middot; Human approval first &middot; Regional data residency &middot; Cancel anytime
        </div>
      </div></section>

      {/* FAQ */}
      <section className="s" id="faq"><div className="wrap">
        <span className="s-label rv">FAQ</span>
        <h2 className="rv" style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:600,fontSize:"clamp(28px,4vw,56px)",letterSpacing:"-0.044em",lineHeight:1.04}}>Questions investors<br/>and founders ask.</h2>
        <div className="faq-list rv">
          {FAQS.map((f,i)=>(
            <div key={i} className={`faq-item${openFaq===i?" open":""}`}>
              <button className="faq-q" onClick={()=>toggleFaq(i)}>{f.q}<span className="faq-ic"/></button>
              <div className="faq-body" ref={el=>{faqBodies.current[i]=el;}}>
                <div className="faq-body-in">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div></section>

      {/* FINAL CTA */}
      <section className="s"><div className="wrap">
        <div className="final-cta rv">
          <div className="final-cta-glow"/>
          <h2>AI runs the ops.<br/>You run the business.</h2>
          <p>Every hour your team spends on follow-ups, data entry and manual collections is an hour not spent on growth. Atlas runs the operations — you run the business.</p>
          <div className="final-cta-actions">
            <Link className="btn btn-primary btn-lg" {...mag} href="/signup">
              Start for free — no card needed
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
            <Link className="btn btn-ghost btn-lg" {...mag} href="/login">Book a live demo</Link>
          </div>
          <p className="final-cta-note">Works with QuickBooks, Xero, Tally &amp; more &middot; Set up in 5 minutes &middot; Cancel anytime</p>
        </div>
      </div></section>

      {/* FOOTER */}
      <footer className="footer"><div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href="#top" style={{display:"flex",alignItems:"center",gap:"9px",textDecoration:"none"}}>
              <AtlasMark size={22}/>
              <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"13px",letterSpacing:".2em",textTransform:"uppercase",color:"white",lineHeight:1}}>ATLAS</span>
            </a>
            <p>The AI business control room for every founder, at every scale, everywhere. Collections, cashflow, inventory and follow-ups — automated in one place.</p>
            <p className="foot-made">Global infrastructure &middot; Regional data residency &middot; SOC 2 compliant</p>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <a href="#features">Features</a><a href="#agent-mesh">Agents</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          </div>
          <div className="foot-col">
            <h4>Contact</h4>
            <a href="#">Investor inquiries</a>
            <a href="mailto:hello@atlas.vantro.io">hello@atlas.vantro.io</a>
            <a href="#">Book a demo</a>
          </div>
        </div>
        <div className="wm">ATLAS by VANTRO</div>
        <div className="foot-bottom">
          <span>&copy; 2026 Vantro. Atlas is a product of Vantro under Auren Group.</span>
          <span className="foot-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link></span>
        </div>
      </div></footer>
    </div>
  );
}
