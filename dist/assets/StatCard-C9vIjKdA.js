import{r as x,j as e}from"./index-CQ2L4Iz7.js";const h=(n,t=1e3)=>{const[o,f]=x.useState(0);return x.useEffect(()=>{if(n==null||isNaN(n))return;const r=Number(n),l=Date.now(),s=()=>{const d=Date.now()-l,a=Math.min(d/t,1),u=1-Math.pow(1-a,3);f(Math.round(r*u)),a<1&&requestAnimationFrame(s)};requestAnimationFrame(s)},[n,t]),o},c={cyan:"text-[#00d4ff]",green:"text-[#00ff88]",red:"text-[#ff3366]",amber:"text-[#ffaa00]",purple:"text-[#a855f7]"},g={cyan:"hover:border-[#00d4ff]/40 hover:shadow-[0_0_20px_rgba(0,212,255,0.12)]",green:"hover:border-[#00ff88]/40 hover:shadow-[0_0_20px_rgba(0,255,136,0.12)]",red:"hover:border-[#ff3366]/40 hover:shadow-[0_0_20px_rgba(255,51,102,0.12)]",amber:"hover:border-[#ffaa00]/40 hover:shadow-[0_0_20px_rgba(255,170,0,0.12)]",purple:"hover:border-[#a855f7]/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]"},_={cyan:"bg-[#00d4ff]/10",green:"bg-[#00ff88]/10",red:"bg-[#ff3366]/10",amber:"bg-[#ffaa00]/10",purple:"bg-[#a855f7]/10"};function v({label:n,value:t,unit:o="",prefix:f="",trend:r=null,trendValue:l="",accentColor:s="cyan",icon:d=null,subtitle:a=null,animate:u=!0,rawValue:m=null,onClick:i=null}){const p=h(u&&typeof t=="number"?typeof t=="number"?t:0:0,900),b=m||(typeof t=="number"?p:t);return e.jsxs("button",{type:"button",onClick:i||void 0,disabled:!i,className:`
        w-full text-left
        bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-5
        transition-all duration-300 group
        ${i?"cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40":"cursor-default"}
        ${g[s]}
      `,children:[e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("span",{className:"text-[#6b6b8a] text-[10px] font-sans uppercase tracking-[0.15em]",children:n}),d&&e.jsx("span",{className:`
            w-7 h-7 rounded-md flex items-center justify-center text-sm
            ${_[s]} ${c[s]}
            transition-transform duration-200 group-hover:scale-110
          `,children:d})]}),e.jsxs("div",{className:"flex items-end gap-1.5",children:[f&&e.jsx("span",{className:`font-['JetBrains_Mono'] text-xl font-semibold mb-0.5 ${c[s]}`,children:f}),e.jsx("span",{className:`
          font-['JetBrains_Mono'] text-[2rem] font-bold leading-none
          animate-count-up ${c[s]}
        `,children:b}),o&&e.jsx("span",{className:"text-[#6b6b8a] text-xs mb-1 font-sans",children:o})]}),a&&e.jsx("p",{className:"text-[#6b6b8a] text-[11px] mt-1 font-sans",children:a}),r&&e.jsxs("div",{className:`
          mt-2.5 text-[11px] font-['JetBrains_Mono'] flex items-center gap-1
          ${r==="up"?"text-[#00ff88]":"text-[#ff3366]"}
        `,children:[e.jsx("span",{children:r==="up"?"↑":"↓"}),e.jsx("span",{children:l})]})]})}export{v as S};
