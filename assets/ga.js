/* 구글 애널리틱스(GA4) 방문 통계. 계산기에 입력한 금액이나 이름·연락처는 보내지 않습니다 */
(function(){
  var ID='G-5LED4Y7MVY';
  if(!/(^|\.)hantax47\.com$/.test(location.hostname)) return;   // 내 PC·미리보기·캡처 검증은 세지 않습니다
  var s=document.createElement('script');
  s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+ID;
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){dataLayer.push(arguments);};
  gtag('js',new Date());
  gtag('config',ID);
  // 상담으로 이어지는 클릭만 따로 셉니다 (상담 신청 완료는 consult 페이지에서 generate_lead로 보냅니다)
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a,button');
    if(!a) return;
    var h=a.getAttribute('href')||'';
    if(h.indexOf('pf.kakao.com')>=0) gtag('event','kakao_click');
    else if(h.indexOf('tel:')===0) gtag('event','phone_click');
    else if(/(^|\/)consult\/?$/.test(h)) gtag('event','consult_click');
    else if(a.id==='calc') gtag('event','calc_run');
  },true);
})();
