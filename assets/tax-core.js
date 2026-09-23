/* 한택스 세금 계산기 공용 계산식 (연봉·배당 관련)
   여러 계산기가 함께 씁니다. 세법이 바뀌면 이 파일만 고치면 됩니다.
   쓰는 곳: tools/income-transfer.html, tools/pay-mix.html
   DEDUCT(소득공제), CREDIT(세액공제), OTHER(다른 소득), INS_MODE(4대보험 반영), CIT_MODE(법인세 유형)는
   화면에서 값을 넣어 주는 설정값입니다. */
let DEDUCT=0, CREDIT=0, OTHER=0;

/* ── 세금 계산 ─────────────────────────────── */
const PIT=[[14000000,.06,0],[50000000,.15,1260000],[88000000,.24,5760000],[150000000,.35,15440000],
           [300000000,.38,19940000],[500000000,.40,25940000],[1000000000,.42,35940000],[Infinity,.45,65940000]];
const LOCAL=1.1;          // 지방소득세 10%
const DIV_LIMIT=20000000; // 금융소득종합과세 기준
const GROSS_UP=0.10;      // 배당가산율
const SEP_RATE=0.14;      // 배당 원천징수(지방세 제외)
/* 2026년 4대보험 요율 (대표이사: 국민연금·건강보험·장기요양만, 고용·산재 제외) */
const NP_RATE=0.095, NP_MAX_M=6370000, NP_MIN_M=400000;  // 국민연금 9.5%, 기준소득월액 상한 637만·하한 40만
const HI_RATE=0.0719, LTC_RATE=0.009448, HI_MAX_M=120080000; // 건강보험 7.19%, 장기요양 0.9448%
let INS_MODE=false;       // 4대보험 반영 여부

function salaryInsurance(salary){
  if(salary<=0) return {np:0,hi:0,ltc:0,total:0,company:0,self:0};
  const m=salary/12;
  const npBase=Math.min(Math.max(m,NP_MIN_M),NP_MAX_M);
  const hiBase=Math.min(m,HI_MAX_M);
  const np=npBase*NP_RATE*12, hi=hiBase*HI_RATE*12, ltc=hiBase*LTC_RATE*12;
  const total=np+hi+ltc;
  return {np,hi,ltc,total,company:total/2,self:total/2,npBase,hiBase};
}
function dividendInsurance(dividend){
  const ex=Math.max(0,dividend-DIV_LIMIT);
  return {ex, hi:ex*HI_RATE, ltc:ex*LTC_RATE, total:ex*(HI_RATE+LTC_RATE)};
}
function pitRaw(b){ if(b<=0)return 0; for(const[lim,r,d]of PIT) if(b<=lim) return Math.max(0,b*r-d); return 0; }
function pitInfo(b){ if(b<=0) return {tax:0,rate:0,ded:0}; for(const[lim,r,d]of PIT) if(b<=lim) return {tax:Math.max(0,b*r-d),rate:r,ded:d}; }
function earnedDeduct(s){
  if(s<=5000000) return s*.7;
  if(s<=15000000) return 3500000+(s-5000000)*.4;
  if(s<=45000000) return 7500000+(s-15000000)*.15;
  if(s<=100000000) return 12000000+(s-45000000)*.05;
  return Math.min(20000000,14750000+(s-100000000)*.02);
}
let MIN_TAX=false;        // 공제·감면이 많은 회사(최저한세 7%) 여부
let CIT_MODE='0';         // 0 일반, 1 최저한세, 2 이월결손금으로 법인세 없음, 3 연구비 세액공제로 법인세 없음
const MIN_RATE=0.07;
function citNormal(b){ if(b<=0)return 0; return b<=200000000 ? b*.1 : 20000000+(b-200000000)*.2; }
function citParts(b){
  if(b<=0) return {main:0,local:0,total:0,normal:0};
  const normal=citNormal(b);
  if(CIT_MODE==='2') return {main:0,local:0,total:0,normal};   // 결손금이 과세표준을 없애 지방소득세도 없습니다
  const main = CIT_MODE==='1' ? b*MIN_RATE : CIT_MODE==='3' ? 0 : normal;
  const local = normal*0.1;   // 지방소득세는 국세 공제·감면 전 세액 기준
  return {main, local, total:main+local, normal};
}
function cit(b){ return citParts(b).total; }
const won=n=>Math.round(n).toLocaleString('ko-KR');
const num=s=>Number(String(s).replace(/[^0-9]/g,''))||0;

/* 대표님 개인 세금 (근로소득 + 배당소득) */
function personTax(salary,dividend,selfIns){
  selfIns=selfIns||0;
  const edu = salary>0 ? earnedDeduct(salary) : 0;
  const earned = Math.max(0, salary-edu-selfIns+OTHER-DEDUCT);   // 회사 밖 소득도 합산해 과세표준을 잡습니다
  if(dividend<=DIV_LIMIT){
    const salRaw0=pitRaw(earned), salInfo=pitInfo(earned), divRaw=dividend*SEP_RATE;
    const otherCr=Math.min(CREDIT, salRaw0);   // 산출세액을 넘겨 돌려받지는 못합니다
    const salRaw=salRaw0-otherCr;
    return {total:(salRaw+divRaw)*LOCAL, mode:'분리과세', selfIns,
            edu, earned, salRaw0, otherCr, salRaw, salInfo, divRaw,
            salLocal:salRaw*0.1, divLocal:divRaw*0.1,
            salTax:salRaw*LOCAL, divTax:divRaw*LOCAL};
  }
  const excess=dividend-DIV_LIMIT, gross=excess*GROSS_UP;
  const baseA=Math.max(0,earned+excess+gross);
  const infoA=pitInfo(baseA), rawA=infoA.tax, credit=Math.min(gross,rawA);
  const sepPart=DIV_LIMIT*SEP_RATE;
  const taxA=rawA-credit+sepPart;
  const infoB=pitInfo(earned), rawB=infoB.tax, divB=dividend*SEP_RATE;
  const taxB=rawB+divB;
  const pick=Math.max(taxA,taxB);
  // 세액공제는 종합과세되는 산출세액에서만 뺍니다. 분리과세 원천징수분은 대상이 아닙니다.
  const compBase = taxA>=taxB ? rawA-credit : rawB;
  const otherCr = Math.min(CREDIT, Math.max(0,compBase));
  const finalTax = pick-otherCr;
  return {total:finalTax*LOCAL, mode: taxA>=taxB?'종합과세':'비교과세', selfIns,
          edu, earned, excess, gross, baseA, infoA, rawA, credit, sepPart, taxA,
          infoB, rawB, divB, taxB, pick, otherCr, finalTax, local:finalTax*0.1};
}

/* 한 가지 배분안 계산 */
function scenario(profit,salary,dividendWant){
  const ins = INS_MODE ? salaryInsurance(salary) : {np:0,hi:0,ltc:0,total:0,company:0,self:0};
  const cBase=Math.max(0,profit-salary-ins.company);
  const cTax=cit(cBase);
  const cTaxFull=cit(profit);      // 대표님 연봉을 한 푼도 주지 않았을 때의 법인세
  const cSaved=cTaxFull-cTax;      // 연봉(과 회사부담 보험료)이 비용이 되어 줄인 법인세
  const after=Math.max(0,cBase-cTax);
  const dividend=Math.min(dividendWant,after);
  const dIns = INS_MODE ? dividendInsurance(dividend) : {ex:0,hi:0,ltc:0,total:0};
  const pt=personTax(salary,dividend,ins.self);
  const total=pt.total+ins.total+dIns.total;   // 대표님 쪽에 붙는 세금·보험료
  return {salary,dividend,cTax,cTaxFull,cSaved,pTax:pt.total,ins,dIns,total,
          net:total-cSaved,     // 연봉도 배당도 가져가지 않았을 때와 비교한 세금
          gross:cTax+total,                    // 법인세까지 더한 전체
          cash:salary+dividend-pt.total-ins.self-dIns.total,
          left:after-dividend, mode:pt.mode, short:Math.max(0,dividendWant-dividend), after, cBase, pt};
}

function marginal(profit,sal,div,mode){   // 여기서 100만 원을 더 가져가면 얼마가 더 붙나
  const step=1000000;
  const base=scenario(profit,sal,div);
  const next= mode==='sal' ? scenario(profit,sal+step,div) : scenario(profit,sal,div+step);
  if(next.short>0) return null;            // 배당 재원이 모자라면 비교할 수 없습니다
  return next.gross-base.gross;
}
