import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as i,R as I}from"./index-Dkd5gcU3.js";import{b as _t,P as kt,c as D,u as Ot,a as At}from"./index-B4_j5Fla.js";import{u as oe,b as It,c as R}from"./utils-CRy61Qm3.js";import{c as lt,d as Lt,P as qt,a as Mt,u as Ht,D as zt,b as Vt,e as Ft,f as Gt}from"./index-a3M0GD22.js";import{u as $t,P as ct}from"./index-B1xjKWS0.js";import{B as C,b as dt}from"./Button-BW0SOSmN.js";import{T as pt,D as ut}from"./trash-2-kxIYYWi0.js";import{S as mt}from"./settings-5Rtugbx0.js";import{C as ee,B as Ut}from"./circle-question-mark-BqYvPKxo.js";import{c as k}from"./createLucideIcon-21GO6skE.js";import{E as Wt}from"./ellipsis-DYbXsnve.js";import"./index-Bg5RRhoj.js";import"./index-imM4MU5P.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],Xt=k("copy",Yt);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],Qt=k("external-link",Kt);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],Zt=k("heart",Jt);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]],tr=k("share-2",er);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],nr=k("star",rr);var or=Object.defineProperty,T=(o,t)=>or(o,"name",{value:t,configurable:!0}),[ae,Dr]=At("Tooltip",[lt]),te=lt(),ar="TooltipProvider",sr=700,re="tooltip.open",[ir,se]=ae(ar),lr=T(o=>{const{__scopeTooltip:t,delayDuration:r=sr,skipDelayDuration:n=300,disableHoverableContent:s=!1,children:a}=o,l=i.useRef(!0),x=i.useRef(!1),m=i.useRef(0);return i.useEffect(()=>{const u=m.current;return()=>window.clearTimeout(u)},[]),e.jsx(ir,{scope:t,isOpenDelayedRef:l,delayDuration:r,onOpen:i.useCallback(()=>{n<=0||(window.clearTimeout(m.current),l.current=!1)},[n]),onClose:i.useCallback(()=>{n<=0||(window.clearTimeout(m.current),m.current=window.setTimeout(()=>l.current=!0,n))},[n]),isPointerInTransitRef:x,onPointerInTransitChange:i.useCallback(u=>{x.current=u},[]),disableHoverableContent:s,children:a})},"TooltipProvider"),ne="Tooltip",[cr,O]=ae(ne),dr=T(o=>{const{__scopeTooltip:t,children:r,open:n,defaultOpen:s,onOpenChange:a,disableHoverableContent:l,delayDuration:x}=o,m=se(ne,o.__scopeTooltip),u=te(t),[h,g]=i.useState(null),[f,v]=i.useState(void 0),N=$t(),p=i.useRef(0),b=l??m.disableHoverableContent,y=x??m.delayDuration,w=i.useRef(!1),[B,j]=_t({prop:n,defaultProp:s??!1,onChange:T(ce=>{ce?(m.onOpen(),document.dispatchEvent(new CustomEvent(re))):m.onClose(),a==null||a(ce)},"onChange"),caller:ne}),S=i.useMemo(()=>B?w.current?"delayed-open":"instant-open":"closed",[B]),P=i.useCallback(()=>{window.clearTimeout(p.current),p.current=0,w.current=!1,j(!0)},[j]),E=i.useCallback(()=>{window.clearTimeout(p.current),p.current=0,j(!1)},[j]),le=i.useCallback(()=>{window.clearTimeout(p.current),p.current=window.setTimeout(()=>{w.current=!0,j(!0),p.current=0},y)},[y,j]);i.useEffect(()=>()=>{p.current&&(window.clearTimeout(p.current),p.current=0)},[]);const St=f??N;return e.jsx(Lt,{...u,children:e.jsx(cr,{scope:t,contentId:St,setContentId:v,open:B,stateAttribute:S,trigger:h,onTriggerChange:g,onTriggerEnter:i.useCallback(()=>{m.isOpenDelayedRef.current?le():P()},[m.isOpenDelayedRef,le,P]),onTriggerLeave:i.useCallback(()=>{b?E():(window.clearTimeout(p.current),p.current=0)},[E,b]),onOpen:P,onClose:E,disableHoverableContent:b,children:r})})},"Tooltip"),de="TooltipTrigger",gt=i.forwardRef(T(function(t,r){const{__scopeTooltip:n,"aria-describedby":s,...a}=t,l=O(de,n),x=se(de,n),m=te(n),u=i.useRef(null),h=oe(r,u,l.onTriggerChange),g=i.useRef(!1),f=i.useRef(!1),v=i.useCallback(()=>g.current=!1,[]);return i.useEffect(()=>()=>document.removeEventListener("pointerup",v),[v]),e.jsx(qt,{asChild:!0,...m,children:e.jsx(kt.button,{"aria-describedby":l.open?Nt(s,l.contentId):s,"data-state":l.stateAttribute,...a,ref:h,onPointerMove:D(t.onPointerMove,N=>{N.pointerType!=="touch"&&!f.current&&!x.isPointerInTransitRef.current&&(l.onTriggerEnter(),f.current=!0)}),onPointerLeave:D(t.onPointerLeave,()=>{l.onTriggerLeave(),f.current=!1}),onPointerDown:D(t.onPointerDown,()=>{l.open&&l.onClose(),g.current=!0,document.addEventListener("pointerup",v,{once:!0})}),onFocus:D(t.onFocus,()=>{g.current||l.onOpen()}),onBlur:D(t.onBlur,l.onClose),onClick:D(t.onClick,l.onClose)})})},"TooltipTrigger")),ft="TooltipPortal",[pr,ur]=ae(ft,{forceMount:void 0}),mr=T(o=>{const{__scopeTooltip:t,forceMount:r,children:n,container:s}=o,a=O(ft,t);return e.jsx(pr,{scope:t,forceMount:r,children:e.jsx(ct,{present:r||a.open,children:e.jsx(Mt,{asChild:!0,container:s,children:n})})})},"TooltipPortal"),_="TooltipContent",ht=i.forwardRef(T(function(t,r){const n=ur(_,t.__scopeTooltip),{forceMount:s=n.forceMount,side:a="top",...l}=t,x=O(_,t.__scopeTooltip);return e.jsx(ct,{present:s||x.open,children:x.disableHoverableContent?e.jsx(xt,{side:a,...l,ref:r}):e.jsx(gr,{side:a,...l,ref:r})})},"TooltipContent")),gr=i.forwardRef(T(function(t,r){const n=O(_,t.__scopeTooltip),s=se(_,t.__scopeTooltip),a=i.useRef(null),l=oe(r,a),[x,m]=i.useState(null),{trigger:u,onClose:h}=n,g=a.current,{onPointerInTransitChange:f}=s,v=i.useCallback(()=>{m(null),f(!1)},[f]),N=i.useCallback((p,b)=>{const y=p.currentTarget,w={x:p.clientX,y:p.clientY},B=Tt(w,y.getBoundingClientRect()),j=vt(w,B),S=bt(b.getBoundingClientRect()),P=wt([...j,...S]);m(P),f(!0)},[f]);return i.useEffect(()=>()=>v(),[v]),i.useEffect(()=>{if(u&&g){const p=T(y=>N(y,g),"handleTriggerLeave"),b=T(y=>N(y,u),"handleContentLeave");return u.addEventListener("pointerleave",p),g.addEventListener("pointerleave",b),()=>{u.removeEventListener("pointerleave",p),g.removeEventListener("pointerleave",b)}}},[u,g,N,v]),i.useEffect(()=>{if(x){const p=T(b=>{const y=b.target,w={x:b.clientX,y:b.clientY},B=(u==null?void 0:u.contains(y))||(g==null?void 0:g.contains(y)),j=!yt(w,x);B?v():j&&(v(),h())},"handleTrackPointerGrace");return document.addEventListener("pointermove",p),()=>document.removeEventListener("pointermove",p)}},[u,g,x,h,v]),e.jsx(xt,{...t,ref:l})},"TooltipContentHoverable")),fr=It("TooltipContent"),xt=i.forwardRef(T(function(t,r){const{__scopeTooltip:n,children:s,"aria-label":a,id:l,onEscapeKeyDown:x,onPointerDownOutside:m,...u}=t,h=O(_,n),g=te(n),{onClose:f}=h,[v,N]=i.useState(null),p=oe(r,N);Ht(v),i.useEffect(()=>(document.addEventListener(re,f),()=>document.removeEventListener(re,f)),[f]),i.useEffect(()=>{if(h.trigger){const y=T(w=>{w.target instanceof Node&&w.target.contains(h.trigger)&&f()},"handleScroll");return window.addEventListener("scroll",y,{capture:!0}),()=>window.removeEventListener("scroll",y,{capture:!0})}},[h.trigger,f]);const{setContentId:b}=h;return Ot(()=>(b(l),()=>{b(void 0)}),[l,b]),e.jsx(zt,{asChild:!0,disableOutsidePointerEvents:!1,onEscapeKeyDown:x,onPointerDownOutside:m,onFocusOutside:y=>y.preventDefault(),onDismiss:f,children:e.jsxs(Vt,{"data-state":h.stateAttribute,role:a?void 0:"tooltip",id:a?void 0:h.contentId,...g,...u,ref:p,style:{...u.style,"--radix-tooltip-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-tooltip-content-available-width":"var(--radix-popper-available-width)","--radix-tooltip-content-available-height":"var(--radix-popper-available-height)","--radix-tooltip-trigger-width":"var(--radix-popper-anchor-width)","--radix-tooltip-trigger-height":"var(--radix-popper-anchor-height)"},children:[e.jsx(fr,{children:s}),a?e.jsx(Ft,{id:h.contentId,role:"tooltip",children:a}):null]})})},"TooltipContentImpl")),ie=i.forwardRef(T(function(t,r){const{__scopeTooltip:n,...s}=t,a=te(n);return e.jsx(Gt,{...a,...s,ref:r})},"TooltipArrow"));function Tt(o,t){const r=Math.abs(t.top-o.y),n=Math.abs(t.bottom-o.y),s=Math.abs(t.right-o.x),a=Math.abs(t.left-o.x);switch(Math.min(r,n,s,a)){case a:return"left";case s:return"right";case r:return"top";case n:return"bottom";default:throw new Error("unreachable")}}T(Tt,"getExitSideFromRect");function vt(o,t,r=5){const n=[];switch(t){case"top":n.push({x:o.x-r,y:o.y+r},{x:o.x+r,y:o.y+r});break;case"bottom":n.push({x:o.x-r,y:o.y-r},{x:o.x+r,y:o.y-r});break;case"left":n.push({x:o.x+r,y:o.y-r},{x:o.x+r,y:o.y+r});break;case"right":n.push({x:o.x-r,y:o.y-r},{x:o.x-r,y:o.y+r});break}return n}T(vt,"getPaddedExitPoints");function bt(o){const{top:t,right:r,bottom:n,left:s}=o;return[{x:s,y:t},{x:r,y:t},{x:r,y:n},{x:s,y:n}]}T(bt,"getPointsFromRect");function yt(o,t){const{x:r,y:n}=o;let s=!1;for(let a=0,l=t.length-1;a<t.length;l=a++){const x=t[a],m=t[l],u=x.x,h=x.y,g=m.x,f=m.y;h>n!=f>n&&r<(g-u)*(n-h)/(f-h)+u&&(s=!s)}return s}T(yt,"isPointInPolygon");function wt(o){const t=o.slice();return t.sort((r,n)=>r.x<n.x?-1:r.x>n.x?1:r.y<n.y?-1:r.y>n.y?1:0),jt(t)}T(wt,"getHull");function jt(o){if(o.length<=1)return o.slice();const t=[];for(let n=0;n<o.length;n++){const s=o[n];for(;t.length>=2;){const a=t[t.length-1],l=t[t.length-2];if((a.x-l.x)*(s.y-l.y)>=(a.y-l.y)*(s.x-l.x))t.pop();else break}t.push(s)}t.pop();const r=[];for(let n=o.length-1;n>=0;n--){const s=o[n];for(;r.length>=2;){const a=r[r.length-1],l=r[r.length-2];if((a.x-l.x)*(s.y-l.y)>=(a.y-l.y)*(s.x-l.x))r.pop();else break}r.push(s)}return r.pop(),t.length===1&&r.length===1&&t[0].x===r[0].x&&t[0].y===r[0].y?t:t.concat(r)}T(jt,"getHullPresorted");function Nt(...o){const t=new Set;for(const r of o)if(typeof r=="string")for(const n of String(r).trim().split(/\s+/))n&&t.add(n);return t.size>0?Array.from(t).join(" "):void 0}T(Nt,"concatAriaDescribedby");const Bt={default:"bg-popover-bg text-popover-text border border-popover-border shadow-popover",success:"bg-success text-success-foreground border border-success",warning:"bg-warning text-warning-foreground border border-warning",danger:"bg-danger text-danger-foreground border border-danger",info:"bg-primary text-primary-foreground border border-primary"},Ct={top:"bottom-full mb-2",bottom:"top-full mt-2",left:"right-full mr-2",right:"left-full ml-2"},Pt={start:"items-start",center:"items-center",end:"items-end"};function A({children:o,delayDuration:t=200,skipDelayDuration:r=100}){return e.jsx(lr,{delayDuration:t,skipDelayDuration:r,children:o})}const d=i.forwardRef(({className:o,content:t,children:r,side:n="top",align:s="center",variant:a="default",sideOffset:l=6,alignOffset:x=0,delayDuration:m=200,skipDelayDuration:u=100,disabled:h=!1,open:g,defaultOpen:f=!1,onOpenChange:v,tooltipId:N},p)=>{const[b,y]=I.useState(f),w=g!==void 0,B=w?g:b,j=i.useId(),S=N||j,P=E=>{w||y(E),v==null||v(E)};return I.Children.only(r),h?e.jsx(e.Fragment,{children:I.Children.only(r)}):e.jsxs(dr,{ref:p,open:B,onOpenChange:P,delayDuration:m,skipDelayDuration:u,className:R("relative inline-block"),children:[e.jsx(gt,{asChild:!0,children:I.Children.only(r)}),e.jsx(mr,{children:e.jsxs(ht,{id:S,side:n,align:s,sideOffset:l,alignOffset:x,className:R("relative z-50 rounded-lg px-3 py-2 text-sm font-medium","animate-fade-in slide-up",Bt[a],Ct[n],Pt[s]),style:{"--radix-tooltip-trigger-area":"var(--radix-tooltip-trigger-area)"},children:[e.jsx(ie,{className:R("fill-current",a==="default"&&"fill-popover-bg",a==="success"&&"fill-success",a==="warning"&&"fill-warning",a==="danger"&&"fill-danger",a==="info"&&"fill-primary"),width:8,height:4}),t]})})]})});d.displayName="Tooltip";const Rt=i.forwardRef(({className:o,asChild:t=!1,children:r,...n},s)=>e.jsx(gt,{ref:s,asChild:t,className:R("",o),...n,children:r}));Rt.displayName="TooltipTrigger";const Et=i.forwardRef(({className:o,side:t="top",align:r="center",variant:n="default",children:s,...a},l)=>e.jsxs(ht,{ref:l,side:t,align:r,className:R("relative z-50 rounded-lg px-3 py-2 text-sm font-medium","animate-fade-in slide-up",Bt[n],Ct[t],Pt[r],o),...a,children:[e.jsx(ie,{className:R("fill-current",n==="default"&&"fill-popover-bg",n==="success"&&"fill-success",n==="warning"&&"fill-warning",n==="danger"&&"fill-danger",n==="info"&&"fill-primary"),width:8,height:4}),s]}));Et.displayName="TooltipContent";const Dt=i.forwardRef(({className:o,width:t=8,height:r=4,...n},s)=>e.jsx(ie,{ref:s,width:t,height:r,className:R("fill-current",o),...n}));Dt.displayName="TooltipArrow";A.__docgenInfo={description:"",methods:[],displayName:"TooltipProvider",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},delayDuration:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"200",computed:!1}},skipDelayDuration:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"100",computed:!1}}}};d.__docgenInfo={description:"",methods:[],displayName:"Tooltip",props:{content:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"提示内容"},children:{required:!0,tsType:{name:"ReactReactElement",raw:"React.ReactElement"},description:"触发元素"},side:{required:!1,tsType:{name:"union",raw:"'top' | 'bottom' | 'left' | 'right'",elements:[{name:"literal",value:"'top'"},{name:"literal",value:"'bottom'"},{name:"literal",value:"'left'"},{name:"literal",value:"'right'"}]},description:"位置",defaultValue:{value:"'top'",computed:!1}},align:{required:!1,tsType:{name:"union",raw:"'start' | 'center' | 'end'",elements:[{name:"literal",value:"'start'"},{name:"literal",value:"'center'"},{name:"literal",value:"'end'"}]},description:"对齐",defaultValue:{value:"'center'",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'success' | 'warning' | 'danger' | 'info'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'info'"}]},description:"变体",defaultValue:{value:"'default'",computed:!1}},sideOffset:{required:!1,tsType:{name:"number"},description:"偏移距离",defaultValue:{value:"6",computed:!1}},alignOffset:{required:!1,tsType:{name:"number"},description:"对齐偏移",defaultValue:{value:"0",computed:!1}},delayDuration:{required:!1,tsType:{name:"number"},description:"显示延迟（ms）",defaultValue:{value:"200",computed:!1}},skipDelayDuration:{required:!1,tsType:{name:"number"},description:"隐藏延迟（ms）",defaultValue:{value:"100",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"是否禁用",defaultValue:{value:"false",computed:!1}},open:{required:!1,tsType:{name:"boolean"},description:"是否打开（受控）"},defaultOpen:{required:!1,tsType:{name:"boolean"},description:"默认打开（非受控）",defaultValue:{value:"false",computed:!1}},onOpenChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(open: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"open"}],return:{name:"void"}}},description:"打开/关闭回调"},tooltipId:{required:!1,tsType:{name:"string"},description:"提示框 ID"},className:{required:!1,tsType:{name:"string"},description:"类名"}}};Rt.__docgenInfo={description:"",methods:[],displayName:"TooltipTrigger",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};Et.__docgenInfo={description:"",methods:[],displayName:"TooltipContent",props:{children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},side:{required:!1,tsType:{name:"union",raw:"'top' | 'bottom' | 'left' | 'right'",elements:[{name:"literal",value:"'top'"},{name:"literal",value:"'bottom'"},{name:"literal",value:"'left'"},{name:"literal",value:"'right'"}]},description:"",defaultValue:{value:"'top'",computed:!1}},align:{required:!1,tsType:{name:"union",raw:"'start' | 'center' | 'end'",elements:[{name:"literal",value:"'start'"},{name:"literal",value:"'center'"},{name:"literal",value:"'end'"}]},description:"",defaultValue:{value:"'center'",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'success' | 'warning' | 'danger' | 'info'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'info'"}]},description:"",defaultValue:{value:"'default'",computed:!1}}}};Dt.__docgenInfo={description:"",methods:[],displayName:"TooltipArrow",props:{width:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"8",computed:!1}},height:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"4",computed:!1}}}};const Sr={title:"UI/Tooltip",component:d,parameters:{layout:"centered",docs:{description:{component:"提示框组件，鼠标悬停或聚焦时显示提示信息。支持多种位置、变体和动画。"}}},tags:["autodocs"],argTypes:{content:{control:"text",description:"提示内容"},side:{control:"select",options:["top","bottom","left","right"],description:"位置"},align:{control:"select",options:["start","center","end"],description:"对齐方式"},variant:{control:"select",options:["default","success","warning","danger","info"],description:"变体"},sideOffset:{control:"number",description:"侧边偏移"},alignOffset:{control:"number",description:"对齐偏移"},delayDuration:{control:"number",description:"显示延迟(ms)"},skipDelayDuration:{control:"number",description:"隐藏延迟(ms)"},disabled:{control:"boolean",description:"禁用"},defaultOpen:{control:"boolean",description:"默认打开"}}},c=({children:o,...t})=>e.jsx(C,{variant:"ghost",size:"sm",...t,children:o}),L={args:{content:"这是一个默认提示框",children:e.jsx(c,{children:"悬停查看"})}},q={args:{content:"顶部提示",side:"top",children:e.jsx(c,{children:"顶部"})}},M={args:{content:"底部提示",side:"bottom",children:e.jsx(c,{children:"底部"})}},H={args:{content:"左侧提示",side:"left",children:e.jsx(c,{children:"左侧"})}},z={args:{content:"右侧提示",side:"right",children:e.jsx(c,{children:"右侧"})}},V={render:()=>e.jsxs("div",{className:"flex flex-wrap items-center gap-4",children:[e.jsx(d,{content:"顶部居中",side:"top",align:"center",children:e.jsx(c,{children:"上"})}),e.jsx(d,{content:"底部居中",side:"bottom",align:"center",children:e.jsx(c,{children:"下"})}),e.jsx(d,{content:"左侧居中",side:"left",align:"center",children:e.jsx(c,{children:"左"})}),e.jsx(d,{content:"右侧居中",side:"right",align:"center",children:e.jsx(c,{children:"右"})})]})},F={render:()=>e.jsx(A,{children:e.jsxs("div",{className:"flex flex-wrap items-center gap-4",children:[e.jsx(d,{content:"默认提示",variant:"default",children:e.jsx(c,{children:"默认"})}),e.jsx(d,{content:"成功提示",variant:"success",children:e.jsx(c,{className:"text-success",children:"成功"})}),e.jsx(d,{content:"警告提示",variant:"warning",children:e.jsx(c,{className:"text-warning",children:"警告"})}),e.jsx(d,{content:"危险提示",variant:"danger",children:e.jsx(c,{className:"text-destructive",children:"危险"})}),e.jsx(d,{content:"信息提示",variant:"info",children:e.jsx(c,{className:"text-primary",children:"信息"})})]})})},G={render:()=>e.jsx(A,{children:e.jsxs("div",{className:"flex flex-wrap items-center gap-4",children:[e.jsx(d,{content:"编辑此项",side:"top",children:e.jsx(c,{"aria-label":"编辑",children:e.jsx(dt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"删除此项",side:"top",variant:"danger",children:e.jsx(c,{"aria-label":"删除",children:e.jsx(pt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"复制链接",side:"top",children:e.jsx(c,{"aria-label":"复制",children:e.jsx(Xt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"分享",side:"top",children:e.jsx(c,{"aria-label":"分享",children:e.jsx(tr,{className:"h-4 w-4"})})}),e.jsx(d,{content:"下载",side:"top",children:e.jsx(c,{"aria-label":"下载",children:e.jsx(ut,{className:"h-4 w-4"})})}),e.jsx(d,{content:"收藏",side:"top",children:e.jsx(c,{"aria-label":"收藏",children:e.jsx(nr,{className:"h-4 w-4"})})}),e.jsx(d,{content:"点赞",side:"top",children:e.jsx(c,{"aria-label":"点赞",children:e.jsx(Zt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"通知",side:"top",children:e.jsx(c,{"aria-label":"通知",children:e.jsx(Ut,{className:"h-4 w-4"})})}),e.jsx(d,{content:"更多操作",side:"top",children:e.jsx(c,{"aria-label":"更多",children:e.jsx(Wt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"设置",side:"top",children:e.jsx(c,{"aria-label":"设置",children:e.jsx(mt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"外部链接",side:"top",children:e.jsx(c,{"aria-label":"外部链接",children:e.jsx(Qt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"帮助信息",side:"top",variant:"info",children:e.jsx(c,{"aria-label":"帮助",children:e.jsx(ee,{className:"h-4 w-4"})})})]})})},$={args:{content:e.jsxs("div",{className:"space-y-1",children:[e.jsx("p",{className:"font-medium",children:"标题内容"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"这是详细的描述信息，可以包含多行文本。"}),e.jsxs("div",{className:"flex gap-1 pt-1",children:[e.jsx("span",{className:"px-2 py-0.5 text-xs bg-primary/10 text-primary rounded",children:"标签1"}),e.jsx("span",{className:"px-2 py-0.5 text-xs bg-success/10 text-success rounded",children:"标签2"})]})]}),children:e.jsx(c,{children:"富文本提示"})}},U={args:{content:"延迟 500ms 显示",delayDuration:500,skipDelayDuration:200,children:e.jsx(c,{children:"延迟显示"})}},W={args:{content:"这个提示不会显示",disabled:!0,children:e.jsx(c,{disabled:!0,children:"禁用的触发器"})}},Y={args:{content:"默认打开的提示框",defaultOpen:!0,children:e.jsx(c,{children:"默认打开"})}},X={args:{content:"左对齐",side:"top",align:"start",children:e.jsx(c,{className:"w-32",children:"左对齐 (start)"})}},K={args:{content:"右对齐",side:"top",align:"end",children:e.jsx(c,{className:"w-32",children:"右对齐 (end)"})}},Q={args:{content:"偏移 16px",sideOffset:16,children:e.jsx(c,{children:"偏移距离"})}},J={render:()=>e.jsx(A,{children:e.jsxs("form",{className:"space-y-4 w-80",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("label",{className:"w-24 text-sm font-medium",children:"用户名"}),e.jsx("div",{className:"flex-1",children:e.jsx("input",{type:"text",className:"w-full px-3 py-2 border border-input-border rounded-lg text-sm",placeholder:"请输入用户名"})}),e.jsx(d,{content:"用户名长度 3-20 字符，仅支持字母数字下划线",variant:"info",children:e.jsx(c,{"aria-label":"帮助",children:e.jsx(ee,{className:"h-4 w-4"})})})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("label",{className:"w-24 text-sm font-medium",children:"密码"}),e.jsx("div",{className:"flex-1",children:e.jsx("input",{type:"password",className:"w-full px-3 py-2 border border-input-border rounded-lg text-sm",placeholder:"请输入密码"})}),e.jsx(d,{content:"密码需包含大小写字母、数字，长度 8-32 位",variant:"info",children:e.jsx(c,{"aria-label":"帮助",children:e.jsx(ee,{className:"h-4 w-4"})})})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("label",{className:"w-24 text-sm font-medium",children:"邮箱"}),e.jsx("div",{className:"flex-1",children:e.jsx("input",{type:"email",className:"w-full px-3 py-2 border border-input-border rounded-lg text-sm",placeholder:"example@email.com"})}),e.jsx(d,{content:"用于接收验证码和重要通知",variant:"info",children:e.jsx(c,{"aria-label":"帮助",children:e.jsx(ee,{className:"h-4 w-4"})})})]})]})})},Z={render:()=>e.jsx(A,{children:e.jsxs("div",{className:"flex items-center gap-1 p-2 bg-muted rounded-lg",children:[e.jsx(d,{content:"新建",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"新建",children:e.jsx(Plus,{className:"h-4 w-4"})})}),e.jsx(d,{content:"编辑",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"编辑",children:e.jsx(dt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"查看",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"查看",children:e.jsx(Eye,{className:"h-4 w-4"})})}),e.jsx(d,{content:"删除",side:"top",variant:"danger",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"删除",children:e.jsx(pt,{className:"h-4 w-4"})})}),e.jsx(d,{content:"下载",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"下载",children:e.jsx(ut,{className:"h-4 w-4"})})}),e.jsx(d,{content:"上传",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"上传",children:e.jsx(Upload,{className:"h-4 w-4"})})}),e.jsx(d,{content:"搜索",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"搜索",children:e.jsx(Search,{className:"h-4 w-4"})})}),e.jsx(d,{content:"设置",side:"top",children:e.jsx(C,{variant:"ghost",size:"sm","aria-label":"设置",children:e.jsx(mt,{className:"h-4 w-4"})})})]})})};var pe,ue,me;L.parameters={...L.parameters,docs:{...(pe=L.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    content: '这是一个默认提示框',
    children: <TriggerButton>悬停查看</TriggerButton>
  }
}`,...(me=(ue=L.parameters)==null?void 0:ue.docs)==null?void 0:me.source}}};var ge,fe,he;q.parameters={...q.parameters,docs:{...(ge=q.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    content: '顶部提示',
    side: 'top',
    children: <TriggerButton>顶部</TriggerButton>
  }
}`,...(he=(fe=q.parameters)==null?void 0:fe.docs)==null?void 0:he.source}}};var xe,Te,ve;M.parameters={...M.parameters,docs:{...(xe=M.parameters)==null?void 0:xe.docs,source:{originalSource:`{
  args: {
    content: '底部提示',
    side: 'bottom',
    children: <TriggerButton>底部</TriggerButton>
  }
}`,...(ve=(Te=M.parameters)==null?void 0:Te.docs)==null?void 0:ve.source}}};var be,ye,we;H.parameters={...H.parameters,docs:{...(be=H.parameters)==null?void 0:be.docs,source:{originalSource:`{
  args: {
    content: '左侧提示',
    side: 'left',
    children: <TriggerButton>左侧</TriggerButton>
  }
}`,...(we=(ye=H.parameters)==null?void 0:ye.docs)==null?void 0:we.source}}};var je,Ne,Be;z.parameters={...z.parameters,docs:{...(je=z.parameters)==null?void 0:je.docs,source:{originalSource:`{
  args: {
    content: '右侧提示',
    side: 'right',
    children: <TriggerButton>右侧</TriggerButton>
  }
}`,...(Be=(Ne=z.parameters)==null?void 0:Ne.docs)==null?void 0:Be.source}}};var Ce,Pe,Re;V.parameters={...V.parameters,docs:{...(Ce=V.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-4">
      <Tooltip content="顶部居中" side="top" align="center">
        <TriggerButton>上</TriggerButton>
      </Tooltip>
      <Tooltip content="底部居中" side="bottom" align="center">
        <TriggerButton>下</TriggerButton>
      </Tooltip>
      <Tooltip content="左侧居中" side="left" align="center">
        <TriggerButton>左</TriggerButton>
      </Tooltip>
      <Tooltip content="右侧居中" side="right" align="center">
        <TriggerButton>右</TriggerButton>
      </Tooltip>
    </div>
}`,...(Re=(Pe=V.parameters)==null?void 0:Pe.docs)==null?void 0:Re.source}}};var Ee,De,Se;F.parameters={...F.parameters,docs:{...(Ee=F.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  render: () => <TooltipProvider>
      <div className="flex flex-wrap items-center gap-4">
        <Tooltip content="默认提示" variant="default">
          <TriggerButton>默认</TriggerButton>
        </Tooltip>
        <Tooltip content="成功提示" variant="success">
          <TriggerButton className="text-success">成功</TriggerButton>
        </Tooltip>
        <Tooltip content="警告提示" variant="warning">
          <TriggerButton className="text-warning">警告</TriggerButton>
        </Tooltip>
        <Tooltip content="危险提示" variant="danger">
          <TriggerButton className="text-destructive">危险</TriggerButton>
        </Tooltip>
        <Tooltip content="信息提示" variant="info">
          <TriggerButton className="text-primary">信息</TriggerButton>
        </Tooltip>
      </div>
    </TooltipProvider>
}`,...(Se=(De=F.parameters)==null?void 0:De.docs)==null?void 0:Se.source}}};var _e,ke,Oe;G.parameters={...G.parameters,docs:{...(_e=G.parameters)==null?void 0:_e.docs,source:{originalSource:`{
  render: () => <TooltipProvider>
      <div className="flex flex-wrap items-center gap-4">
        <Tooltip content="编辑此项" side="top">
          <TriggerButton aria-label="编辑"><Edit className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="删除此项" side="top" variant="danger">
          <TriggerButton aria-label="删除"><Trash2 className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="复制链接" side="top">
          <TriggerButton aria-label="复制"><Copy className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="分享" side="top">
          <TriggerButton aria-label="分享"><Share2 className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="下载" side="top">
          <TriggerButton aria-label="下载"><Download className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="收藏" side="top">
          <TriggerButton aria-label="收藏"><Star className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="点赞" side="top">
          <TriggerButton aria-label="点赞"><Heart className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="通知" side="top">
          <TriggerButton aria-label="通知"><Bell className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="更多操作" side="top">
          <TriggerButton aria-label="更多"><MoreHorizontal className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="设置" side="top">
          <TriggerButton aria-label="设置"><Settings className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="外部链接" side="top">
          <TriggerButton aria-label="外部链接"><ExternalLink className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="帮助信息" side="top" variant="info">
          <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
        </Tooltip>
      </div>
    </TooltipProvider>
}`,...(Oe=(ke=G.parameters)==null?void 0:ke.docs)==null?void 0:Oe.source}}};var Ae,Ie,Le;$.parameters={...$.parameters,docs:{...(Ae=$.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
  args: {
    content: <div className="space-y-1">
        <p className="font-medium">标题内容</p>
        <p className="text-xs text-muted-foreground">这是详细的描述信息，可以包含多行文本。</p>
        <div className="flex gap-1 pt-1">
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">标签1</span>
          <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">标签2</span>
        </div>
      </div>,
    children: <TriggerButton>富文本提示</TriggerButton>
  }
}`,...(Le=(Ie=$.parameters)==null?void 0:Ie.docs)==null?void 0:Le.source}}};var qe,Me,He;U.parameters={...U.parameters,docs:{...(qe=U.parameters)==null?void 0:qe.docs,source:{originalSource:`{
  args: {
    content: '延迟 500ms 显示',
    delayDuration: 500,
    skipDelayDuration: 200,
    children: <TriggerButton>延迟显示</TriggerButton>
  }
}`,...(He=(Me=U.parameters)==null?void 0:Me.docs)==null?void 0:He.source}}};var ze,Ve,Fe;W.parameters={...W.parameters,docs:{...(ze=W.parameters)==null?void 0:ze.docs,source:{originalSource:`{
  args: {
    content: '这个提示不会显示',
    disabled: true,
    children: <TriggerButton disabled>禁用的触发器</TriggerButton>
  }
}`,...(Fe=(Ve=W.parameters)==null?void 0:Ve.docs)==null?void 0:Fe.source}}};var Ge,$e,Ue;Y.parameters={...Y.parameters,docs:{...(Ge=Y.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
  args: {
    content: '默认打开的提示框',
    defaultOpen: true,
    children: <TriggerButton>默认打开</TriggerButton>
  }
}`,...(Ue=($e=Y.parameters)==null?void 0:$e.docs)==null?void 0:Ue.source}}};var We,Ye,Xe;X.parameters={...X.parameters,docs:{...(We=X.parameters)==null?void 0:We.docs,source:{originalSource:`{
  args: {
    content: '左对齐',
    side: 'top',
    align: 'start',
    children: <TriggerButton className="w-32">左对齐 (start)</TriggerButton>
  }
}`,...(Xe=(Ye=X.parameters)==null?void 0:Ye.docs)==null?void 0:Xe.source}}};var Ke,Qe,Je;K.parameters={...K.parameters,docs:{...(Ke=K.parameters)==null?void 0:Ke.docs,source:{originalSource:`{
  args: {
    content: '右对齐',
    side: 'top',
    align: 'end',
    children: <TriggerButton className="w-32">右对齐 (end)</TriggerButton>
  }
}`,...(Je=(Qe=K.parameters)==null?void 0:Qe.docs)==null?void 0:Je.source}}};var Ze,et,tt;Q.parameters={...Q.parameters,docs:{...(Ze=Q.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
  args: {
    content: '偏移 16px',
    sideOffset: 16,
    children: <TriggerButton>偏移距离</TriggerButton>
  }
}`,...(tt=(et=Q.parameters)==null?void 0:et.docs)==null?void 0:tt.source}}};var rt,nt,ot;J.parameters={...J.parameters,docs:{...(rt=J.parameters)==null?void 0:rt.docs,source:{originalSource:`{
  render: () => <TooltipProvider>
      <form className="space-y-4 w-80">
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">用户名</label>
          <div className="flex-1">
            <input type="text" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="请输入用户名" />
          </div>
          <Tooltip content="用户名长度 3-20 字符，仅支持字母数字下划线" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">密码</label>
          <div className="flex-1">
            <input type="password" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="请输入密码" />
          </div>
          <Tooltip content="密码需包含大小写字母、数字，长度 8-32 位" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">邮箱</label>
          <div className="flex-1">
            <input type="email" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="example@email.com" />
          </div>
          <Tooltip content="用于接收验证码和重要通知" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
      </form>
    </TooltipProvider>
}`,...(ot=(nt=J.parameters)==null?void 0:nt.docs)==null?void 0:ot.source}}};var at,st,it;Z.parameters={...Z.parameters,docs:{...(at=Z.parameters)==null?void 0:at.docs,source:{originalSource:`{
  render: () => <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-muted rounded-lg">
        <Tooltip content="新建" side="top">
          <Button variant="ghost" size="sm" aria-label="新建"><Plus className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="编辑" side="top">
          <Button variant="ghost" size="sm" aria-label="编辑"><Edit className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="查看" side="top">
          <Button variant="ghost" size="sm" aria-label="查看"><Eye className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="删除" side="top" variant="danger">
          <Button variant="ghost" size="sm" aria-label="删除"><Trash2 className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="下载" side="top">
          <Button variant="ghost" size="sm" aria-label="下载"><Download className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="上传" side="top">
          <Button variant="ghost" size="sm" aria-label="上传"><Upload className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="搜索" side="top">
          <Button variant="ghost" size="sm" aria-label="搜索"><Search className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="设置" side="top">
          <Button variant="ghost" size="sm" aria-label="设置"><Settings className="h-4 w-4" /></Button>
        </Tooltip>
      </div>
    </TooltipProvider>
}`,...(it=(st=Z.parameters)==null?void 0:st.docs)==null?void 0:it.source}}};const _r=["Default","Top","Bottom","Left","Right","AllPositions","Variants","WithIcons","WithRichContent","Delayed","Disabled","DefaultOpen","AlignStart","AlignEnd","Offset","FormFieldExample","ButtonToolbar"];export{K as AlignEnd,X as AlignStart,V as AllPositions,M as Bottom,Z as ButtonToolbar,L as Default,Y as DefaultOpen,U as Delayed,W as Disabled,J as FormFieldExample,H as Left,Q as Offset,z as Right,q as Top,F as Variants,G as WithIcons,$ as WithRichContent,_r as __namedExportsOrder,Sr as default};
