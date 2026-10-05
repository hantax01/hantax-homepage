/* 근로소득 원천징수영수증(소득세법 시행규칙 별지 제24호서식(1)) PDF 읽기
   - 파일은 브라우저 안에서만 읽습니다. 서버로 보내거나 저장하지 않고, 이름·주민등록번호는 꺼내지 않습니다.
   - 이런 PDF는 글자가 한 글자씩 따로 들어 있어, 같은 줄의 글자를 위치로 다시 묶은 뒤 칸 이름 옆의 금액을 찾습니다.
   - 사용: HantaxReceipt.read(file) → Promise<{ok, v:{...금액}, note:[...]} | {ok:false, msg}> */
(function(g){
  const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';   // 한글 글꼴 표(cmaps)까지 있는 곳

  /* 글자 → 줄·낱말 */
  function lines(items){
    const pts=items.filter(t=>t.str&&t.str.trim()).map(t=>({s:t.str,x:t.transform[4],y:t.transform[5],w:t.width,h:Math.abs(t.transform[3])||8}));
    pts.sort((a,b)=>b.y-a.y||a.x-b.x);
    const rows=[];
    pts.forEach(p=>{ const r=rows.find(r=>Math.abs(r.y-p.y)<1.6); if(r) r.items.push(p); else rows.push({y:p.y,items:[p]}); });
    return rows.map(r=>{ r.items.sort((a,b)=>a.x-b.x); const toks=[];
      r.items.forEach(p=>{ const t=toks[toks.length-1];
        if(t&&p.x-(t.x+t.w)<Math.max(2.2,p.h*.35)){ t.s+=p.s; t.w=p.x+p.w-t.x; } else toks.push({s:p.s,x:p.x,w:p.w}); });
      return {y:r.y,toks}; });
  }
  const norm=s=>s.replace(/[\s①-⓿㉑-㉟㊱-㊿]/g,'');
  const isNum=s=>/^[-△]?[\d,]*\d$/.test(s.replace(/\s/g,''));
  const toNum=s=>{ const t=s.replace(/\s/g,''); const n=Number(t.replace(/[^\d]/g,''))||0; return /^[-△]/.test(t)?-n:n; };

  /* 칸 이름이 있는 줄 찾기: zone 안의 낱말을 이어 붙여 정규식과 비교 */
  function lab(pg,zone,re,from){
    for(const l of pg){ if(from!=null&&l.y>=from) continue;
      const txt=l.toks.filter(t=>t.x>=zone[0]&&t.x<zone[1]).map(t=>norm(t.s)).join('');
      const m=txt.match(re); if(m) return {y:l.y,txt,m}; }
    return null;
  }
  /* y 근처 줄에서 x 범위의 금액 (가까운 줄 우선). 바로 왼쪽에 따로 찍힌 '-'·'△'도 음수로 봅니다 */
  function val(pg,y,x0,x1,dy){
    let best=null;
    pg.forEach(l=>{ const d=Math.abs(l.y-y); if(d>(dy==null?6:dy)) return;
      l.toks.forEach((t,i)=>{ if(t.x<x0||t.x>=x1||!isNum(t.s)) return;
        let v=toNum(t.s); const prev=l.toks[i-1];
        if(v>0&&prev&&/^[-△]$/.test(prev.s.trim())&&t.x-(prev.x+prev.w)<8) v=-v;
        if(!best||d<best.d) best={d,v}; }); });
    return best?best.v:0;
  }

  /* 1쪽: 결정세액, 차감징수세액, 비과세소득계 */
  function page1(pg,v){
    const L=[0,300];
    const fin=lab(pg,L,/결정세액/), due=lab(pg,L,/차감징수세액/), nt=lab(pg,L,/비과세소득계/);
    v.finTax= fin?val(pg,fin.y,280,400,2):0;
    v.dueTax= due?val(pg,due.y,280,400,2):0;
    // 이미 낸 세금 = 결정세액 − 차감징수세액 (종전 근무지·납부특례 포함). 차감징수세액은 10원 미만을 버리므로 그만큼 되돌립니다
    const back=(fin,due)=>{ const r=((fin%10)+10)%10; return due>=0 ? fin-due-r : fin-due+(10-r)%10; };
    v.paid=back(v.finTax,v.dueTax);
    v.finLocal= fin?val(pg,fin.y,400,480,2):0;
    v.dueLocal= due?val(pg,due.y,400,480,2):0;
    v.paidLocal=back(v.finLocal,v.dueLocal);
    v.nontaxYear= nt?val(pg,nt.y,150,600,2):0;
  }

  /* 2쪽: 왼쪽(소득공제)·오른쪽(세액공제) */
  function page2(pg,v,note){
    const L=[15,240], LV=[240,335], R=[320,500], RV=[490,600];
    const left=(re,dy)=>{ const a=lab(pg,L,re); return a?val(pg,a.y,LV[0],LV[1],dy):0; };
    const right=(re)=>{ const a=lab(pg,R,re); return a?val(pg,a.y,RV[0],RV[1],3):0; };
    const cnt=re=>{ const a=lab(pg,L.concat?L:L,re)||lab(pg,R,re); return a&&a.m[1]?+a.m[1]:0; };
    // '대상금액·공제금액' 두 줄짜리 칸: 칸 이름 바로 아래 '공제금액' 줄의 금액
    const sub=(re)=>{ const a=lab(pg,L,re); if(!a) return 0;
      const s=pg.find(l=>l.y<=a.y+1&&l.y>=a.y-13&&l.toks.some(t=>t.x>=150&&t.x<240&&norm(t.s)==='공제금액'));
      return s?val(pg,s.y,LV[0],LV[1],1):0; };

    v.gross=left(/^총급여/,7);
    v.wageDed=left(/^근로소득공제/,3);
    v.earned=left(/^근로소득금액/,3);
    v.spouse=left(/^배우자/,3)>0?1:0;
    v.dep=cnt(/부양가족\((\d+)명\)/);
    v.old=cnt(/경로우대\((\d+)명\)/);
    v.dis=cnt(/장애인\((\d+)명\)/);
    v.woman=left(/^부녀자/,3)>0;
    v.single=left(/^한부모/,3)>0;
    v.np=sub(/^국민연금보험료/);
    v.pubPen=sub(/공무원연금/)+sub(/군인연금/)+sub(/사립학교교직원연금/)+sub(/별정우체국연금/);
    v.hi=sub(/건강보험료/);
    v.ei=sub(/고용보험료/);
    const lease1=left(/대출기관/,2), lease2=left(/거주자$/,2);
    v.leaseDed=lease1+lease2;
    const spSum=(()=>{ const a=lab(pg,L,/^계$/); return a?val(pg,a.y,LV[0],LV[1],2):0; })();    // 특별소득공제 계
    v.mortDed=Math.max(0,spSum-v.hi-v.ei-v.leaseDed);                                            // 주택담보대출 이자 = 계 − 보험료 − 전세대출
    v.persPen=left(/^개인연금저축/,2);
    v.noran=left(/소기업.?소상공인/,2);
    v.subDed=left(/청약저축$/,2)+left(/주택청약종합저축/,2)+left(/근로자주택마련저축/,2);
    v.invest=left(/^투자조합출자/,2);
    v.cardDed=left(/^신용카드등사용액/,2);
    v.esop=left(/^우리사주조합출연금/,2);
    v.keep=left(/^고용유지/,2);
    v.ltFund=left(/^장기집합투자증권저축/,2);
    v.ytFund=left(/^청년형장기집합투자증권저축/,2);
    v.otherSum=left(/^그밖의소득공제계/,2);
    // 오른쪽 한 줄짜리
    v.base=right(/종합소득과세표준/);
    v.taxCalc=right(/산출세액/);
    v.redPit=right(/^「소득세법」$/);
    v.redEtc=right(/조세특례제한법」\(제외\)/);
    v.redSme=right(/조세특례제한법」제30조/);
    v.redTreaty=right(/^조세조약/);
    v.wc=right(/^근로소득$/);
    v.marry=right(/^혼인세액공제/);
    v.kids=cnt(/공제대상자녀\((\d+)명\)/); v.childCr=right(/^공제대상자녀/);
    v.birthCnt=cnt(/출산.?입양자\((\d+)명\)/); v.birthCr=right(/^출산.?입양자/);
    v.stdCr=right(/^표준세액공제/);
    v.unionCr=right(/^납세조합공제/);
    v.houseCr=right(/^주택차입금/);
    v.foreignCr=right(/^외국납부/);
    v.crSum=right(/^세액공제계/);
    v.finCheck=right(/^결정세액/);
    // '공제대상금액·세액공제액' 짝: 두 줄 사이의 칸 이름으로 항목을 가립니다
    const rowsOf=t=>pg.filter(l=>l.toks.some(k=>k.x>=440&&k.x<500&&norm(k.s)===t)).map(l=>l.y);
    const dedRows=rowsOf('공제대상금액'), crRows=rowsOf('세액공제액');
    let tenK=0;
    dedRows.forEach(y1=>{
      const y2=crRows.filter(y=>y<y1).sort((a,b)=>b-a)[0]; if(y2==null) return;
      const txt=pg.filter(l=>l.y<=y1+5&&l.y>=y2-5).map(l=>l.toks.filter(t=>t.x>=330&&t.x<455).map(t=>norm(t.s)).join('')).join('');
      const amt=val(pg,y1,RV[0],RV[1],1);
      let k=null;
      if(/과학기술인/.test(txt)) k='penSci'; else if(/근로자퇴직급여|퇴직연금/.test(txt)) k='penRet';
      else if(/연금저축/.test(txt)) k='penSav'; else if(/ISA/.test(txt)) k='isa';
      else if(/장애인전용/.test(txt)) k='disIns'; else if(/보장성/.test(txt)) k='ins';
      else if(/의료비/.test(txt)) k='medDed'; else if(/교육비/.test(txt)) k='edu';
      else if(/특례/.test(txt)) k='donSpec'; else if(/우리사주/.test(txt)) k='donEsop';
      else if(/종교단체외/.test(txt)) k='donGen'; else if(/종교단체/.test(txt)) k='donRel';
      else if(/월세/.test(txt)) k='rent';
      else if(/10만원/.test(txt)){ k=['donPol','donPol','donHome','donHome','donHome'][tenK]||'donHome'; tenK++; }
      if(k) v[k]=(v[k]||0)+amt;
    });
  }

  /* 3쪽: 카드 사용액·의료비 지출 합계 (열 제목 위치로 금액 배정) */
  function page3(pg,v){
    const center=t=>t.x+t.w/2;
    const pick=(rowY,cols)=>{ const out={}; const l=pg.find(l=>Math.abs(l.y-rowY)<1);
      // 인원수(한 자리)는 빼고 금액만 봅니다
      (l?l.toks:[]).filter(t=>isNum(t.s)&&t.x>75&&t.s.replace(/\D/g,'').length>=3).forEach(t=>{ let best=null; cols.forEach(c=>{ const d=Math.abs(center(t)-c.c); if(!best||d<best.d) best={d,k:c.k}; }); if(best) out[best.k]=(out[best.k]||0)+toNum(t.s); });
      return out; };
    // 카드: '신용카드·직불카드등·현금영수증' 머리 줄
    const ch=pg.find(l=>{ const t=l.toks.map(k=>norm(k.s)).join(''); return /신용카드/.test(t)&&/직불카드/.test(t); });
    if(ch){
      const band=pg.filter(l=>l.y<=ch.y+14&&l.y>=ch.y-12).flatMap(l=>l.toks);
      const col=(re,k)=>{ const t=band.find(t=>re.test(norm(t.s))); return t?{k,c:center(t)}:null; };
      const cols=[col(/^신용카드$/,'credit'),col(/^직불카드/,'debit'),col(/^현금영수증/,'cash'),col(/^문화체육/,'culture'),col(/^전통시장/,'market'),col(/^대중교통/,'transit'),col(/^기부금/,'don')].filter(Boolean);
      const rows=pg.filter(l=>l.y<ch.y-10&&l.toks.some(t=>/^(국세청계|기타계)$/.test(norm(t.s)))).slice(0,2);   // 바로 아래 '합계'의 국세청계·기타계
      rows.forEach(r=>{ const o=pick(r.y,cols); Object.keys(o).forEach(k=>v['c_'+k]=(v['c_'+k]||0)+o[k]); });
    }
    // 의료비: 위쪽 표 머리(건강·고용·보장성·일반·난임·실손 …)
    const mh=pg.find(l=>l.toks.some(t=>norm(t.s)==='건강')&&l.toks.some(t=>norm(t.s)==='고용'));
    if(mh){
      const band=pg.filter(l=>l.y<=mh.y+12&&l.y>=mh.y-10).flatMap(l=>l.toks).filter(t=>t.x>180);
      const find=(re,pred)=>band.filter(t=>re.test(norm(t.s))).filter(pred||(()=>true)).sort((a,b)=>a.x-b.x)[0];
      const cols=[['health',find(/^건강$/)],['emp',find(/^고용$/)],['ins',find(/^보장성$/)],['disIns',find(/^전용$/)],
        ['gen',find(/^일반$/,t=>t.x<400)],['pre',find(/선천성|미숙아/)],['inf',find(/난임/)],['spec',find(/65세|장애인·건강/)],
        ['silson',find(/실손/)],['eduGen',find(/^일반$/,t=>t.x>=480)],['eduDis',find(/특수교육/)]].filter(c=>c[1]).map(([k,t])=>({k,c:center(t)}));
      // 표 머리 바로 아래 두 줄이 합계(국세청·기타), 그 아래 관계코드 0인 줄이 본인
      const data=pg.filter(l=>l.y<mh.y-6&&l.toks.some(t=>/^(국세청|기타)$/.test(norm(t.s))));
      data.slice(0,2).forEach(r=>{ const o=pick(r.y,cols); Object.keys(o).forEach(k=>v['m_'+k]=(v['m_'+k]||0)+o[k]); });
      const selfIdx=data.findIndex((r,i)=>i>=2&&r.toks[0]&&norm(r.toks[0].s)==='0'&&r.toks[0].x<45);
      if(selfIdx>=0) [data[selfIdx],data[selfIdx+1]].filter(Boolean).forEach(r=>{ const o=pick(r.y,cols); v.m_selfGen=(v.m_selfGen||0)+(o.gen||0); });
    }
  }

  function parse(pages){
    const all=pages.map(p=>p.map(l=>l.toks.map(t=>norm(t.s)).join('')).join(''));
    if(!/근로소득원천징수영수증|근로소득지급명세서/.test(all[0]||'')) return {ok:false,msg:'근로소득 원천징수영수증이 아닌 것 같습니다. 회사에서 받은 원천징수영수증 PDF를 올려 주세요.'};
    const v={}, note=[];
    page1(pages[0],v);
    const p2=pages.findIndex(t=>/정산명세|종합소득과세표준/.test(all[pages.indexOf(t)]));
    if(p2<0) return {ok:false,msg:'정산명세(2쪽)를 찾지 못했습니다. 3쪽짜리 원본 PDF를 올려 주세요.'};
    page2(pages[p2],v,note);
    const p3=pages.findIndex((t,i)=>i>p2&&/신용카드/.test(all[i])&&/의료비/.test(all[i]));
    if(p3>=0) page3(pages[p3],v); else note.push('3쪽(지출 명세)을 찾지 못해 카드·의료비 사용액은 비워 두었습니다.');
    if(!v.gross) return {ok:false,msg:'총급여를 읽지 못했습니다. 회사 프로그램에서 출력한 원본 PDF인지 확인해 주세요.'};
    return {ok:true,v,note};
  }

  /* pdf.js는 처음 쓸 때만 불러옵니다 */
  let loading=null;
  function pdfjs(){
    if(g['pdfjs-dist/build/pdf']) return Promise.resolve(g['pdfjs-dist/build/pdf']);
    return loading||(loading=new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=PDFJS+'build/pdf.min.js';
      s.onload=()=>{ const L=g['pdfjs-dist/build/pdf']; L.GlobalWorkerOptions.workerSrc=PDFJS+'build/pdf.worker.min.js'; ok(L); };
      s.onerror=()=>{ loading=null; no(new Error('load')); }; document.head.appendChild(s); }));
  }
  async function read(file){
    if(!file||!/\.pdf$/i.test(file.name)) return {ok:false,msg:'PDF 파일을 골라 주세요.'};
    let L; try{ L=await pdfjs(); }catch(e){ return {ok:false,msg:'PDF를 읽는 도구를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'}; }
    try{
      const doc=await L.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:PDFJS+'cmaps/',cMapPacked:true}).promise;
      const pages=[]; for(let i=1;i<=Math.min(doc.numPages,4);i++){ const pg=await doc.getPage(i); pages.push(lines((await pg.getTextContent()).items)); }
      if(pages[0].length<10) return {ok:false,msg:'글자를 읽을 수 없는 파일입니다. 사진을 찍거나 스캔한 PDF가 아니라 회사에서 받은 원본 PDF를 올려 주세요.'};
      return parse(pages);
    }catch(e){ return {ok:false,msg:/password/i.test(e.name+e.message)?'암호가 걸린 PDF입니다. 암호를 푼 파일을 올려 주세요.':'PDF를 여는 중 문제가 생겼습니다. 다른 파일로 다시 시도해 주세요.'}; }
  }
  g.HantaxReceipt={lines,parse,read};
})(typeof window!=='undefined'?window:globalThis);
