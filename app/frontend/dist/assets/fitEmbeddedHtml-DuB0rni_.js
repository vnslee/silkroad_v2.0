import{r as i,j as t}from"./index-BZp6DaaI.js";import{I as u}from"./Icon-BVpibPTp.js";function v({options:o,value:a,onChange:s,trigger:r,ariaLabel:c,align:m="left"}){const[l,n]=i.useState(!1),d=i.useRef(null);i.useEffect(()=>{const e=p=>{d.current&&!d.current.contains(p.target)&&n(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[]);const x=o.find(e=>e.value===a);return t.jsxs("div",{ref:d,className:"relative",children:[t.jsxs("button",{type:"button","aria-haspopup":"listbox","aria-expanded":l,"aria-label":c,onClick:()=>n(e=>!e),className:"flex items-center gap-xs rounded-lg px-xs py-0.5 text-left transition-colors hover:bg-surface-variant",children:[r??t.jsx("span",{className:"font-body-md",children:(x==null?void 0:x.label)??a}),t.jsx(u,{name:"expand_more",className:"text-[18px] text-on-surface-variant"})]}),l&&t.jsx("ul",{role:"listbox",className:`absolute top-full z-chrome mt-xs max-h-72 w-56 overflow-auto rounded-lg border border-surface-border bg-surface-container-lowest py-xs shadow-[0_4px_12px_rgba(0,32,78,0.12)] ${m==="right"?"right-0":"left-0"}`,children:o.map(e=>t.jsx("li",{role:"option","aria-selected":e.value===a,children:t.jsxs("button",{className:`flex w-full flex-col px-md py-sm text-left transition-colors hover:bg-surface-variant ${e.value===a?"bg-surface-container":""}`,onClick:()=>{n(!1),e.value!==a&&s(e.value)},children:[t.jsx("span",{className:"font-body-md text-on-surface",children:e.label}),e.sub&&t.jsx("span",{className:"font-label-sm text-label-sm text-text-secondary",children:e.sub})]})},e.value))})]})}const b={EU:{emoji:"🇪🇺",from:"#1a3a8f",to:"#2563c9"},APAC:{emoji:"🌏",from:"#0e7490",to:"#0891b2"},NA:{emoji:"🌎",from:"#9a3412",to:"#c2410c"},SA:{emoji:"🌎",from:"#15803d",to:"#16a34a"}},h={emoji:"🌐",from:"#334155",to:"#475569"};function w({domain:o,code:a,name:s}){const[r,c]=i.useState(!1),m=o==="country",l="flex h-12 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-surface-border shadow-sm";if(m)return r?t.jsx("div",{className:`${l} bg-surface-container`,children:t.jsx(u,{name:"flag",filled:!0,className:"text-primary text-[24px]"})}):t.jsx("div",{className:`${l} bg-surface-container`,children:t.jsx("img",{alt:`${s??a} 국기`,src:`https://flagcdn.com/w160/${a.toLowerCase()}.png`,className:"h-full w-full object-cover",loading:"lazy",onError:()=>c(!0)})});const n=b[a.toUpperCase()]??h;return t.jsx("div",{className:l,style:{background:`linear-gradient(135deg, ${n.from}, ${n.to})`},role:"img","aria-label":`${s??a} 권역`,children:t.jsx("span",{className:"text-[26px] leading-none","aria-hidden":!0,children:n.emoji})})}const f="aisea-embed-fit",g=`
/* 1) 페이지 외곽 패딩 축소 (standalone 48px → embed 16px) */
main[class*="p-margin"],
main[class*="justify-center"],
body > div[class*="p-margin"],
body > div[class*="justify-center"] {
  padding: 16px !important;
}
/* 2) 중앙정렬 max-width 래퍼의 폭 제한 해제 — 컨테이너 꽉 채움.
   콘텐츠 내부 차트/이미지의 max-w(예: max-w-4xl, max-w-[220px])는 건드리지 않도록
   "mx-auto 와 함께 쓰인 페이지 래퍼"로 한정한다. */
div[class*="max-w-7xl"][class*="mx-auto"],
div[class*="max-w-6xl"][class*="mx-auto"],
div[class*="max-w-5xl"][class*="mx-auto"],
div[class*="max-w-5xl"][class*="w-full"] {
  max-width: 100% !important;
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}
/* 3) detail 카드형 래퍼: 중앙정렬(items-start justify-center) flex 해제 → 카드가 폭 확장 */
body > div[class*="justify-center"],
main[class*="justify-center"] {
  display: block !important;
}
`;function N(o){const a=o.currentTarget;try{const s=a.contentDocument;if(!s||s.getElementById(f))return;const r=s.createElement("style");r.id=f,r.textContent=g,s.head.appendChild(r)}catch{}}export{w as H,v as a,N as f};
