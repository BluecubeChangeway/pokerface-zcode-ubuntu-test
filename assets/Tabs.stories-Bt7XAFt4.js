import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{a as it,r as o}from"./index-Dkd5gcU3.js";import{a as Pe,b as ke,P as E,c as w,u as lt}from"./index-B4_j5Fla.js";import{c as ct,u as De}from"./index-C7Z06p9y.js";import{u as ut,c as _}from"./utils-CRy61Qm3.js";import{a as dt,u as Ge,P as mt}from"./index-B1xjKWS0.js";import{c as Le}from"./createLucideIcon-21GO6skE.js";import{S as M}from"./settings-5Rtugbx0.js";import{C as ft,B as pt}from"./circle-question-mark-BqYvPKxo.js";import{M as vt}from"./mail-DD-zgKBt.js";import"./index-Bg5RRhoj.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bt=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]],O=Le("house",bt);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],K=Le("users",gt);var xt=Object.defineProperty,J=(a,t)=>xt(a,"name",{value:t,configurable:!0}),W=!1;function ze(){const[a,t]=o.useState(W);return o.useEffect(()=>{W||(W=!0,t(!0))},[]),a}J(ze,"useIsHydrated");var qe=it[" useSyncExternalStore ".trim().toString()];function He(){return()=>{}}J(He,"subscribe");function $e(){return qe(He,()=>!0,()=>!1)}J($e,"useIsHydratedModern");var ht=typeof qe=="function"?$e:ze,Tt=Object.defineProperty,F=(a,t)=>Tt(a,"name",{value:t,configurable:!0}),Y="rovingFocusGroup.onEntryFocus",yt={bubbles:!1,cancelable:!0},U="RovingFocusGroup",[Q,Oe,It]=ct(U),[Nt,Ke]=Pe(U,[It]),oe={Vertical:"vertical",Horizontal:"horizontal"},jt={RTL:"rtl"},[wt,Rt]=Nt(U),St=o.forwardRef(F(function(t,i){return e.jsx(Q.Provider,{scope:t.__scopeRovingFocusGroup,children:e.jsx(Q.Slot,{scope:t.__scopeRovingFocusGroup,children:e.jsx(_t,{...t,ref:i})})})},"RovingFocusGroup")),_t=o.forwardRef(F(function(t,i){const{__scopeRovingFocusGroup:s,orientation:n,loop:l=!1,dir:f,currentTabStopId:c,defaultCurrentTabStopId:p,onCurrentTabStopIdChange:T,onEntryFocus:v,preventScrollOnEntryFocus:u=!1,...d}=t,b=o.useRef(null),N=ut(i,b),j=De(f),[V,R]=ke({prop:c,defaultProp:p??null,onChange:T,caller:U}),[m,y]=o.useState(!1),C=dt(v),h=Oe(s),r=o.useRef(!1),[se,ne]=o.useState(0);return o.useEffect(()=>{const g=b.current;if(g)return g.addEventListener(Y,C),()=>g.removeEventListener(Y,C)},[C]),e.jsx(wt,{scope:s,orientation:n,dir:j,loop:l,currentTabStopId:V,onItemFocus:o.useCallback(g=>R(g),[R]),onItemShiftTab:o.useCallback(()=>y(!0),[]),onFocusableItemAdd:o.useCallback(()=>ne(g=>g+1),[]),onFocusableItemRemove:o.useCallback(()=>ne(g=>g-1),[]),children:e.jsx(E.div,{tabIndex:m||se===0?-1:0,"data-orientation":n,...d,ref:N,style:{outline:"none",...t.style},onMouseDown:w(t.onMouseDown,()=>{r.current=!0}),onFocus:w(t.onFocus,g=>{const st=!r.current;if(g.target===g.currentTarget&&st&&!m){const re=new CustomEvent(Y,yt);if(g.currentTarget.dispatchEvent(re),!re.defaultPrevented){const B=h().filter(S=>S.focusable),nt=B.find(S=>S.active),rt=B.find(S=>S.id===V),ot=[nt,rt,...B].filter(Boolean).map(S=>S.ref.current);X(ot,u)}}r.current=!1}),onBlur:w(t.onBlur,()=>y(!1))})})},"RovingFocusGroupImpl")),Ft="RovingFocusGroupItem",Vt=o.forwardRef(F(function(t,i){const{__scopeRovingFocusGroup:s,focusable:n=!0,active:l=!1,tabStopId:f,children:c,...p}=t,T=Ge(),v=f||T,u=Rt(Ft,s),d=u.currentTabStopId===v,b=Oe(s),{onFocusableItemAdd:N,onFocusableItemRemove:j,currentTabStopId:V}=u,R=ht();return lt(()=>{if(!(!R||!n))return N(),()=>j()},[R,n,N,j]),o.useEffect(()=>{if(!(R||!n))return N(),()=>j()},[R,n,N,j]),e.jsx(Q.ItemSlot,{scope:s,id:v,focusable:n,active:l,children:e.jsx(E.span,{tabIndex:d?0:-1,"data-orientation":u.orientation,...p,ref:i,onMouseDown:w(t.onMouseDown,m=>{n?u.onItemFocus(v):m.preventDefault()}),onFocus:w(t.onFocus,()=>u.onItemFocus(v)),onKeyDown:w(t.onKeyDown,m=>{if(m.key==="Tab"&&m.shiftKey){u.onItemShiftTab();return}if(m.target!==m.currentTarget)return;const y=Be(m,u.orientation,u.dir);if(y!==void 0){if(m.metaKey||m.ctrlKey||m.altKey||m.shiftKey)return;m.preventDefault();let h=b().filter(r=>r.focusable).map(r=>r.ref.current);if(y==="last")h.reverse();else if(y==="prev"||y==="next"){y==="prev"&&h.reverse();const r=h.indexOf(m.currentTarget);h=u.loop?We(h,r+1):h.slice(r+1)}setTimeout(()=>X(h))}}),children:typeof c=="function"?c({isCurrentTabStop:d,hasTabStop:V!=null}):c})})},"RovingFocusGroupItem")),Ct={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function Ue(a,t){return t!==jt.RTL?a:a==="ArrowLeft"?"ArrowRight":a==="ArrowRight"?"ArrowLeft":a}F(Ue,"getDirectionAwareKey");function Be(a,t,i){const s=Ue(a.key,i);if(!(t===oe.Vertical&&["ArrowLeft","ArrowRight"].includes(s))&&!(t===oe.Horizontal&&["ArrowUp","ArrowDown"].includes(s)))return Ct[s]}F(Be,"getFocusIntent");function X(a,t=!1){const i=document.activeElement;for(const s of a)if(s===i||(s.focus({preventScroll:t}),document.activeElement!==i))return}F(X,"focusFirst");function We(a,t){return a.map((i,s)=>a[(t+s)%a.length])}F(We,"wrapArray");var Et=Object.defineProperty,A=(a,t)=>Et(a,"name",{value:t,configurable:!0}),Ye={Automatic:"automatic",Manual:"manual"},Z="Tabs",[At,Xt]=Pe(Z,[Ke]),Qe=Ke(),[Mt,ee]=At(Z),Pt=o.forwardRef(A(function(t,i){const{__scopeTabs:s,value:n,onValueChange:l,defaultValue:f,orientation:c="horizontal",dir:p,activationMode:T=Ye.Automatic,...v}=t,u=De(p),[d,b]=ke({prop:n,onChange:l,defaultProp:f??"",caller:Z});return e.jsx(Mt,{scope:s,baseId:Ge(),value:d,onValueChange:b,orientation:c,dir:u,activationMode:T,children:e.jsx(E.div,{dir:u,"data-orientation":c,...v,ref:i})})},"Tabs")),kt="TabsList",Je=o.forwardRef(A(function(t,i){const{__scopeTabs:s,loop:n=!0,...l}=t,f=ee(kt,s),c=Qe(s);return e.jsx(St,{asChild:!0,...c,orientation:f.orientation,dir:f.dir,loop:n,children:e.jsx(E.div,{role:"tablist","aria-orientation":f.orientation,...l,ref:i})})},"TabsList")),Dt="TabsTrigger",Xe=o.forwardRef(A(function(t,i){const{__scopeTabs:s,value:n,disabled:l=!1,...f}=t,c=ee(Dt,s),p=Qe(s),T=te(c.baseId,n),v=ae(c.baseId,n),u=n===c.value;return e.jsx(Vt,{asChild:!0,...p,focusable:!l,active:u,children:e.jsx(E.button,{type:"button",role:"tab","aria-selected":u,"aria-controls":v,"data-state":u?"active":"inactive","data-disabled":l?"":void 0,disabled:l,id:T,...f,ref:i,onMouseDown:w(t.onMouseDown,d=>{!l&&d.button===0&&d.ctrlKey===!1?(d.currentTarget.focus(),c.onValueChange(n)):d.preventDefault()}),onKeyDown:w(t.onKeyDown,d=>{l||d.target!==d.currentTarget||[" ","Enter"].includes(d.key)&&c.onValueChange(n)}),onFocus:w(t.onFocus,()=>{const d=c.activationMode!==Ye.Manual;!u&&!l&&d&&c.onValueChange(n)})})})},"TabsTrigger")),Gt="TabsContent",Ze=o.forwardRef(A(function(t,i){const{__scopeTabs:s,value:n,forceMount:l,children:f,...c}=t,p=ee(Gt,s),T=te(p.baseId,n),v=ae(p.baseId,n),u=n===p.value,d=o.useRef(u);return o.useEffect(()=>{const b=requestAnimationFrame(()=>d.current=!1);return()=>cancelAnimationFrame(b)},[]),e.jsx(mt,{present:l||u,children:({present:b})=>e.jsx(E.div,{"data-state":u?"active":"inactive","data-orientation":p.orientation,role:"tabpanel","aria-labelledby":T,hidden:!b,id:v,tabIndex:0,...c,ref:i,style:{...t.style,animationDuration:d.current?"0s":void 0},children:b&&f})})},"TabsContent"));function te(a,t){return`${a}-trigger-${t}`}A(te,"makeTriggerId");function ae(a,t){return`${a}-content-${t}`}A(ae,"makeContentId");const Lt={line:"bg-transparent",enclosed:"bg-muted rounded-lg p-1",soft:"bg-transparent",pills:"bg-transparent"},ie={line:"bg-transparent hover:bg-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",enclosed:"data-[state=active]:bg-background data-[state=active]:shadow-sm",soft:"data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",pills:"data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"};function x({items:a,value:t,defaultValue:i,variant:s="line",size:n="md",orientation:l="horizontal",onValueChange:f,lazy:c=!1,fullWidth:p=!1,className:T,children:v,...u}){var h;const[d,b]=o.useState(i||((h=a[0])==null?void 0:h.value)||""),N=t!==void 0,j=N?t:d,V=r=>{N||b(r),f==null||f(r)},m=`tabs-${o.useId()}`,y=o.useMemo(()=>({list:Lt[s],trigger:ie[s]}),[s]),C=o.useMemo(()=>({sm:"px-2 py-1.5 text-xs gap-1",md:"px-3 py-2 text-sm gap-2",lg:"px-4 py-2.5 text-base gap-2"}),[]);return e.jsxs(Pt,{value:j,onValueChange:V,orientation:l,dir:"ltr",activationMode:"automatic",className:_("w-full",p&&"w-full",T),...u,children:[e.jsx(Je,{"aria-label":"标签页",className:_("flex items-center gap-1",l==="vertical"&&"flex-col",p&&"w-full",y.list,"relative"),role:"tablist",children:a.map((r,se)=>e.jsxs(Xe,{value:r.value,disabled:r.disabled,className:_("relative flex items-center gap-1.5 font-medium transition-all duration-fast ease-standard","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2","disabled:pointer-events-none disabled:opacity-50","rounded-md",ie[s],C[n],l==="vertical"&&"w-full justify-start",p&&"flex-1 justify-center"),"aria-controls":`${m}-panel-${r.value}`,"aria-selected":j===r.value,children:[r.icon&&e.jsx("span",{className:"flex-shrink-0","aria-hidden":"true",children:r.icon}),e.jsx("span",{className:"truncate",children:r.label}),r.badge!==void 0&&r.badge!==""&&e.jsx("span",{className:"flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-foreground",children:r.badge})]},r.value))}),a.map(r=>e.jsx(Ze,{value:r.value,forceMount:!c,className:_("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2","mt-4",l==="vertical"&&"mt-0 ml-4",c&&"animate-fade-in"),"aria-labelledby":`${m}-trigger-${r.value}`,id:`${m}-panel-${r.value}`,role:"tabpanel",tabIndex:0,children:v},r.value))]})}x.displayName="Tabs";const et=o.forwardRef(({className:a,children:t,...i},s)=>e.jsx(Je,{ref:s,className:_("flex items-center gap-1",a),...i,children:t}));et.displayName="TabsList";const tt=o.forwardRef(({className:a,value:t,disabled:i,icon:s,badge:n,children:l,...f},c)=>e.jsxs(Xe,{ref:c,value:t,disabled:i,className:_("relative flex items-center gap-1.5 font-medium transition-all duration-fast ease-standard","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2","disabled:pointer-events-none disabled:opacity-50","rounded-md px-3 py-2 text-sm",a),...f,children:[s&&e.jsx("span",{className:"flex-shrink-0","aria-hidden":"true",children:s}),e.jsx("span",{className:"truncate",children:l}),n!==void 0&&n!==""&&e.jsx("span",{className:"flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-foreground",children:n})]}));tt.displayName="TabsTrigger";const at=o.forwardRef(({className:a,value:t,forceMount:i,children:s,...n},l)=>e.jsx(Ze,{ref:l,value:t,forceMount:i,className:_("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2","mt-4 p-0",a),...n,children:s}));at.displayName="TabsContent";x.__docgenInfo={description:"",methods:[],displayName:"Tabs",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"TabItem"}],raw:"TabItem[]"},description:"标签项列表"},value:{required:!1,tsType:{name:"string"},description:"当前激活标签（受控）"},defaultValue:{required:!1,tsType:{name:"string"},description:"默认激活标签（非受控）"},variant:{required:!1,tsType:{name:"union",raw:"'line' | 'enclosed' | 'soft' | 'pills'",elements:[{name:"literal",value:"'line'"},{name:"literal",value:"'enclosed'"},{name:"literal",value:"'soft'"},{name:"literal",value:"'pills'"}]},description:"变体",defaultValue:{value:"'line'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"尺寸",defaultValue:{value:"'md'",computed:!1}},orientation:{required:!1,tsType:{name:"union",raw:"'horizontal' | 'vertical' | undefined",elements:[{name:"literal",value:"'horizontal'"},{name:"literal",value:"'vertical'"},{name:"undefined"}]},description:"方向",defaultValue:{value:"'horizontal'",computed:!1}},onValueChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:"激活回调"},lazy:{required:!1,tsType:{name:"boolean"},description:"是否懒加载内容",defaultValue:{value:"false",computed:!1}},fullWidth:{required:!1,tsType:{name:"boolean"},description:"全宽",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"类名"}}};et.__docgenInfo={description:"",methods:[],displayName:"TabsList",props:{children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};tt.__docgenInfo={description:"",methods:[],displayName:"TabsTrigger",props:{value:{required:!0,tsType:{name:"string"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:""},icon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},badge:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};at.__docgenInfo={description:"",methods:[],displayName:"TabsContent",props:{value:{required:!0,tsType:{name:"string"},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},forceMount:{required:!1,tsType:{name:"boolean"},description:""}}};const Zt={title:"UI/Tabs",component:x,parameters:{layout:"centered",docs:{description:{component:"标签页组件，支持多种变体、尺寸、方向和图标。"}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["line","enclosed","soft","pills"],description:"变体"},size:{control:"select",options:["sm","md","lg"],description:"尺寸"},orientation:{control:"select",options:["horizontal","vertical"],description:"方向"},lazy:{control:"boolean",description:"懒加载内容"},fullWidth:{control:"boolean",description:"全宽"},defaultValue:{control:"text",description:"默认激活标签"}}},I=[{value:"home",label:"首页",icon:O},{value:"users",label:"用户",icon:K},{value:"settings",label:"设置",icon:M}],P={args:{items:I,defaultValue:"home"},render:a=>e.jsx("div",{className:"w-96",children:e.jsx(x,{...a,children:e.jsx("div",{className:"p-4 bg-muted rounded-lg",children:e.jsxs("p",{className:"text-sm text-muted-foreground",children:["当前激活: ",a.defaultValue||"home"]})})})})},k={args:{items:I,defaultValue:"home"},render:a=>e.jsx("div",{className:"w-96",children:e.jsx(x,{...a,children:e.jsxs("div",{className:"space-y-2 p-4 bg-muted rounded-lg",children:[e.jsx("h4",{className:"font-medium",children:"首页内容"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"欢迎来到首页！这里展示系统概览和重要信息。"})]})})})},D={render:()=>e.jsxs("div",{className:"space-y-8 w-96",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Line (默认)"}),e.jsx(x,{items:I,variant:"line",defaultValue:"home"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Enclosed"}),e.jsx(x,{items:I,variant:"enclosed",defaultValue:"home"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Soft"}),e.jsx(x,{items:I,variant:"soft",defaultValue:"home"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Pills"}),e.jsx(x,{items:I,variant:"pills",defaultValue:"home"})]})]})},G={args:{items:[{value:"inbox",label:"收件箱",icon:vt,badge:5},{value:"notifications",label:"通知",icon:pt,badge:3},{value:"settings",label:"设置",icon:M}],defaultValue:"inbox"}},L={args:{items:[{value:"home",label:"首页",icon:O},{value:"users",label:"用户",icon:K,disabled:!0},{value:"settings",label:"设置",icon:M}],defaultValue:"home"}},z={render:()=>e.jsxs("div",{className:"space-y-6 w-96",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Small"}),e.jsx(x,{items:I,size:"sm",defaultValue:"home"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Medium"}),e.jsx(x,{items:I,size:"md",defaultValue:"home"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Large"}),e.jsx(x,{items:I,size:"lg",defaultValue:"home"})]})]})},q={args:{items:[{value:"overview",label:"概览",icon:O},{value:"analytics",label:"分析",icon:K},{value:"reports",label:"报表",icon:M},{value:"help",label:"帮助",icon:ft}],orientation:"vertical",defaultValue:"overview"},render:a=>e.jsx("div",{className:"w-96",children:e.jsx(x,{...a,children:e.jsx("div",{className:"p-4 bg-muted rounded-lg",children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"垂直标签页内容"})})})})},H={args:{items:I,fullWidth:!0,defaultValue:"home"}},$={args:{items:[{value:"home",label:"首页",icon:O,tooltip:"返回首页"},{value:"users",label:"用户管理",icon:K,tooltip:"查看用户列表"},{value:"settings",label:"系统设置",icon:M,tooltip:"配置系统参数"}],defaultValue:"home"}};var le,ce,ue;P.parameters={...P.parameters,docs:{...(le=P.parameters)==null?void 0:le.docs,source:{originalSource:`{
  args: {
    items: basicItems,
    defaultValue: 'home'
  },
  render: args => <div className="w-96">
      <Tabs {...args}>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            当前激活: {args.defaultValue || 'home'}
          </p>
        </div>
      </Tabs>
    </div>
}`,...(ue=(ce=P.parameters)==null?void 0:ce.docs)==null?void 0:ue.source}}};var de,me,fe;k.parameters={...k.parameters,docs:{...(de=k.parameters)==null?void 0:de.docs,source:{originalSource:`{
  args: {
    items: basicItems,
    defaultValue: 'home'
  },
  render: args => <div className="w-96">
      <Tabs {...args}>
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <h4 className="font-medium">首页内容</h4>
          <p className="text-sm text-muted-foreground">
            欢迎来到首页！这里展示系统概览和重要信息。
          </p>
        </div>
      </Tabs>
    </div>
}`,...(fe=(me=k.parameters)==null?void 0:me.docs)==null?void 0:fe.source}}};var pe,ve,be;D.parameters={...D.parameters,docs:{...(pe=D.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  render: () => <div className="space-y-8 w-96">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Line (默认)</p>
        <Tabs items={basicItems} variant="line" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Enclosed</p>
        <Tabs items={basicItems} variant="enclosed" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Soft</p>
        <Tabs items={basicItems} variant="soft" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Pills</p>
        <Tabs items={basicItems} variant="pills" defaultValue="home" />
      </div>
    </div>
}`,...(be=(ve=D.parameters)==null?void 0:ve.docs)==null?void 0:be.source}}};var ge,xe,he;G.parameters={...G.parameters,docs:{...(ge=G.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    items: [{
      value: 'inbox',
      label: '收件箱',
      icon: Mail,
      badge: 5
    }, {
      value: 'notifications',
      label: '通知',
      icon: Bell,
      badge: 3
    }, {
      value: 'settings',
      label: '设置',
      icon: Settings
    }],
    defaultValue: 'inbox'
  }
}`,...(he=(xe=G.parameters)==null?void 0:xe.docs)==null?void 0:he.source}}};var Te,ye,Ie;L.parameters={...L.parameters,docs:{...(Te=L.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  args: {
    items: [{
      value: 'home',
      label: '首页',
      icon: Home
    }, {
      value: 'users',
      label: '用户',
      icon: Users,
      disabled: true
    }, {
      value: 'settings',
      label: '设置',
      icon: Settings
    }],
    defaultValue: 'home'
  }
}`,...(Ie=(ye=L.parameters)==null?void 0:ye.docs)==null?void 0:Ie.source}}};var Ne,je,we;z.parameters={...z.parameters,docs:{...(Ne=z.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  render: () => <div className="space-y-6 w-96">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Small</p>
        <Tabs items={basicItems} size="sm" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Medium</p>
        <Tabs items={basicItems} size="md" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Large</p>
        <Tabs items={basicItems} size="lg" defaultValue="home" />
      </div>
    </div>
}`,...(we=(je=z.parameters)==null?void 0:je.docs)==null?void 0:we.source}}};var Re,Se,_e;q.parameters={...q.parameters,docs:{...(Re=q.parameters)==null?void 0:Re.docs,source:{originalSource:`{
  args: {
    items: [{
      value: 'overview',
      label: '概览',
      icon: Home
    }, {
      value: 'analytics',
      label: '分析',
      icon: Users
    }, {
      value: 'reports',
      label: '报表',
      icon: Settings
    }, {
      value: 'help',
      label: '帮助',
      icon: HelpCircle
    }],
    orientation: 'vertical',
    defaultValue: 'overview'
  },
  render: args => <div className="w-96">
      <Tabs {...args}>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">垂直标签页内容</p>
        </div>
      </Tabs>
    </div>
}`,...(_e=(Se=q.parameters)==null?void 0:Se.docs)==null?void 0:_e.source}}};var Fe,Ve,Ce;H.parameters={...H.parameters,docs:{...(Fe=H.parameters)==null?void 0:Fe.docs,source:{originalSource:`{
  args: {
    items: basicItems,
    fullWidth: true,
    defaultValue: 'home'
  }
}`,...(Ce=(Ve=H.parameters)==null?void 0:Ve.docs)==null?void 0:Ce.source}}};var Ee,Ae,Me;$.parameters={...$.parameters,docs:{...(Ee=$.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  args: {
    items: [{
      value: 'home',
      label: '首页',
      icon: Home,
      tooltip: '返回首页'
    }, {
      value: 'users',
      label: '用户管理',
      icon: Users,
      tooltip: '查看用户列表'
    }, {
      value: 'settings',
      label: '系统设置',
      icon: Settings,
      tooltip: '配置系统参数'
    }],
    defaultValue: 'home'
  }
}`,...(Me=(Ae=$.parameters)==null?void 0:Ae.docs)==null?void 0:Me.source}}};const ea=["Default","WithContent","AllVariants","WithBadges","WithDisabled","Sizes","Vertical","FullWidth","WithTooltips"];export{D as AllVariants,P as Default,H as FullWidth,z as Sizes,q as Vertical,G as WithBadges,k as WithContent,L as WithDisabled,$ as WithTooltips,ea as __namedExportsOrder,Zt as default};
