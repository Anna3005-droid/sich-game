// речі з крамниці коваля для козака Quaternius: зброя (у правій руці), щити (на лівому передпліччі), шапки й шоломи (на голові).
// Усе будується з простих форм кодом — без файлів, у стилі моделі. Кольори — як у sRGB (гра так їх і читає).
const COL={steel:[.78,.8,.84],dsteel:[.45,.47,.5],wood:[.5,.31,.16],dwood:[.32,.19,.1],leather:[.36,.21,.11],gold:[.86,.66,.22],
  brass:[.74,.56,.26],red:[.66,.13,.11],fur:[.24,.16,.1],blue:[.14,.32,.66],gem:[.75,.08,.1],chain:[.5,.52,.55],hair:[.17,.11,.07]};

export function buildItems(doc,byName,items,head){
  const buf=doc.getRoot().listBuffers()[0],mats={};
  const mat=n=>mats[n]||(mats[n]=doc.createMaterial('IT_'+n).setBaseColorFactor([...COL[n],1]).setMetallicFactor(0).setRoughnessFactor(.7).setDoubleSided(true));
  // одна сітка = кілька примітивів (по матеріалу)
  function mesh(name,parts){const m=doc.createMesh(name);
    for(const [mn,g] of Object.entries(parts)){if(!g.I.length)continue;
      m.addPrimitive(doc.createPrimitive().setMaterial(mat(mn))
        .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.P)).setBuffer(buf))
        .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.N)).setBuffer(buf))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(g.I)).setBuffer(buf)))}
    return m}
  // геометрія
  const G=()=>({P:[],N:[],I:[]});
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
  function poly(g,vs){const n=nrm(cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]))),i=g.P.length/3;for(const v of vs){g.P.push(...v);g.N.push(...n)}for(let k=1;k<vs.length-1;k++)g.I.push(i,i+k,i+k+1)}
  function box(g,x0,x1,y0,y1,z0,z1){const v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    [[3,2,1,0],[4,5,6,7],[0,4,7,3],[2,6,5,1],[7,6,2,3],[0,1,5,4]].forEach(f=>poly(g,f.map(i=>v[i])))}
  // тіло обертання навколо осі (ax: 0 — X, 1 — Y, 2 — Z); профіль [[r,h],...]; c — центр
  function lathe(g,prof,ax,seg=16,c=[0,0,0],a0=0,a1=Math.PI*2,sx=1,sz=1){const i0=g.P.length/3,full=a1-a0>6.28;
    const put=(r,h,a)=>{const u=Math.cos(a)*r*sx,w=Math.sin(a)*r*sz;return ax===1?[c[0]+u,c[1]+h,c[2]+w]:ax===0?[c[0]+h,c[1]+u,c[2]+w]:[c[0]+u,c[1]+w,c[2]+h]};
    const nput=(nr,nh,a)=>{const u=Math.cos(a)*nr,w=Math.sin(a)*nr;return ax===1?[u,nh,w]:ax===0?[nh,u,w]:[u,w,nh]};
    const cols=full?seg:seg+1;
    for(let k=0;k<prof.length;k++){const p=prof[Math.max(0,k-1)],q=prof[Math.min(prof.length-1,k+1)];const dr=q[0]-p[0],dh=q[1]-p[1];let nr=dh,nh=-dr;const l=Math.hypot(nr,nh)||1;nr/=l;nh/=l;
      for(let s=0;s<cols;s++){const a=a0+(a1-a0)*s/seg;g.P.push(...put(prof[k][0],prof[k][1],a));g.N.push(...nput(nr,nh,a))}}
    for(let k=0;k<prof.length-1;k++)for(let s=0;s<seg;s++){const s1=full?(s+1)%seg:s+1,a=i0+k*cols+s,b=i0+k*cols+s1,c2=i0+(k+1)*cols+s1,d=i0+(k+1)*cols+s;g.I.push(a,b,c2,a,c2,d)}}
  // пласка фігура (опукла) з товщиною t уздовж Z
  function slab(g,pts,z0,z1){const n=pts.length;poly(g,pts.map(p=>[p[0],p[1],z1]));poly(g,pts.slice().reverse().map(p=>[p[0],p[1],z0]));
    for(let k=0;k<n;k++){const a=pts[k],b=pts[(k+1)%n];poly(g,[[a[0],a[1],z0],[b[0],b[1],z0],[b[0],b[1],z1],[a[0],a[1],z1]])}}
  // клинок уздовж +X: ромбоподібний переріз; curve — вигин угору (+Y) на кінці
  function blade(g,x0,L,w,curve,taper=.55,y0=0,t=.004,n=10){for(let i=0;i<n;i++){const xa=x0+L*i/n,xb=x0+L*(i+1)/n,sh=x=>curve*((x-x0)/L)**2,wa=w*(1-taper*i/n),wb=w*(1-taper*(i+1)/n),tip=i===n-1;
      const ya=y0+sh(xa),yb=y0+sh(xb),B0=[xa,ya-wa/2,0],B1=[xb,yb-(tip?0:wb/2),0],E0=[xa,ya+wa/2,0],E1=[xb,yb+(tip?0:wb/2),0],M0=[xa,ya,t],M1=[xb,yb,tip?0:t],N0=[xa,ya,-t],N1=[xb,yb,tip?0:-t];
      poly(g,[B0,B1,M1,M0]);poly(g,[M0,M1,E1,E0]);poly(g,[B1,B0,N0,N1]);poly(g,[N1,N0,E0,E1])}}
  // голова, зварена за положенням (шви текстури не рвуть шолом)
  const HW=head&&(()=>{const map=new Map(),can=[],P=[],N=[],nV=head.P.length/3;
    for(let i=0;i<nV;i++){const k=Math.round(head.P[i*3]*2e3)+','+Math.round(head.P[i*3+1]*2e3)+','+Math.round(head.P[i*3+2]*2e3);let c=map.get(k);
      if(c===undefined){c=P.length/3;map.set(k,c);P.push(head.P[i*3],head.P[i*3+1],head.P[i*3+2]);N.push(0,0,0)}can[i]=c;for(let q=0;q<3;q++)N[c*3+q]+=head.N[i*3+q]}
    for(let c=0;c<P.length/3;c++){const l=Math.hypot(N[c*3],N[c*3+1],N[c*3+2])||1;for(let q=0;q<3;q++)N[c*3+q]/=l}
    const T=[];for(let t=0;t<head.I.length;t+=3)T.push([can[head.I[t]],can[head.I[t+1]],can[head.I[t+2]]]);return{P,N,T}})();
  // лінія, вище якої — шолом: над бровами спереду, нижче ззаду; над вухами плавно вища — вуха відкриті
  const cut=(z,x)=>.1+.3*z+.03*Math.min(1,Math.max(0,(Math.abs(x)-.058)/.016));
  // ділянка голови, де всі fs(x,y,z)>0; трикутники обрізаємо точно по лінії — край рівний, без сходинок
  function region(fs){const P=HW.P.slice(),N=HW.N.slice(),cache=new Map(),val=(f,i)=>f(P[i*3],P[i*3+1],P[i*3+2]);
    const mid=(fi,f,a,b)=>{const k=fi+':'+(a<b?a+'_'+b:b+'_'+a);let i=cache.get(k);if(i!==undefined)return i;const va=val(f,a),vb=val(f,b),t=va/(va-vb);i=P.length/3;
      const n=[0,1,2].map(q=>N[a*3+q]+(N[b*3+q]-N[a*3+q])*t),l=Math.hypot(...n)||1;for(let q=0;q<3;q++){P.push(P[a*3+q]+(P[b*3+q]-P[a*3+q])*t);N.push(n[q]/l)}cache.set(k,i);return i};
    let polys=HW.T.map(t=>t.slice());
    fs.forEach((f,fi)=>{const out=[];for(const pg of polys){const r=[];for(let k=0;k<pg.length;k++){const a=pg[k],b=pg[(k+1)%pg.length],va=val(f,a),vb=val(f,b);if(va>0)r.push(a);if((va>0)!==(vb>0))r.push(mid(fi,f,a,b))}if(r.length>=3)out.push(r)}polys=out});
    const tris=[];for(const pg of polys)for(let k=1;k<pg.length-1;k++)tris.push([pg[0],pg[k],pg[k+1]]);
    const ec=new Map(),key=(a,b)=>a<b?a+'_'+b:b+'_'+a;for(const t of tris)for(let e=0;e<3;e++){const k=key(t[e],t[(e+1)%3]);ec.set(k,(ec.get(k)||0)+1)}
    const edges=[];for(const t of tris)for(let e=0;e<3;e++){const a=t[e],b=t[(e+1)%3];if(ec.get(key(a,b))===1)edges.push([a,b])}
    return{tris,edges,P,N,hp:(c,off,dy=0)=>[P[c*3]+N[c*3]*off,P[c*3+1]+N[c*3+1]*off+dy,P[c*3+2]+N[c*3+2]*off]}}
  const above=d=>(x,y,z)=>y-cut(z,x)-d,below=d=>(x,y,z)=>cut(z,x)+d-y;
  function shell(g,R,off,warp){const idx=new Map(),add=c=>{let i=idx.get(c);if(i===undefined){i=g.P.length/3;idx.set(c,i);const p=R.hp(c,off);g.P.push(...(warp?warp(p):p));g.N.push(R.N[c*3],R.N[c*3+1],R.N[c*3+2])}return i};
    for(const t of R.tris)g.I.push(add(t[0]),add(t[1]),add(t[2]))}
  // обідок по краю: товщина назовні й донизу
  function rim(g,R,off,w,h){for(const [a,b] of R.edges){const A=R.hp(a,off),B=R.hp(b,off),A2=R.hp(a,off+w,-h),B2=R.hp(b,off+w,-h),A3=R.hp(a,off+w,h*.4),B3=R.hp(b,off+w,h*.4);poly(g,[A,B,B2,A2]);poly(g,[A3,B3,B,A]);poly(g,[A2,B2,B3,A3])}}
  const crownY=R=>{let m=-9;for(const t of R.tris)for(const c of t)m=Math.max(m,R.P[c*3+1]);return m};
  const crown=(R,off)=>{let best=null,m=-9;for(const t of R.tris)for(const c of t)if(R.P[c*3+1]>m){m=R.P[c*3+1];best=c}const p=R.hp(best,off);return[0,p[1],p[2]]};
  // чоло над переніссям: найвища передня точка під лінією шолома
  const front=()=>{let z=-9,y=0;for(let c=0;c<HW.P.length/3;c++){const X=HW.P[c*3],Y=HW.P[c*3+1],Z=HW.P[c*3+2];if(Math.abs(X)<.012&&Y<cut(Z,X)+.005&&Y>cut(Z,X)-.03&&Z>z){z=Z;y=Y}}return[0,y,z]};
  // шабля козака: клинок від гарди вгору загинається, гарда, руків'я
  const yc=.013;   // вісь руків'я (центр кулака)
  const B={
    sabre(){const s=G(),w=G(),l=G();blade(s,.06,.78,.034,.045,.55,yc+.0);box(w,.045,.065,-.03,.06,-.012,.012);lathe(l,[[.013,-.095],[.016,-.09],[.014,-.06],[.015,0],[.014,.045]],0,8,[0,yc,0]);return{steel:s,brass:w,leather:l}},
    sword(){const s=G(),d=G(),l=G();blade(s,.065,.74,.05,0,.35,yc,.006);box(d,.045,.065,yc-.1,yc+.1,-.014,.014);lathe(l,[[.014,-.09],[.016,-.06],[.015,0],[.014,.045]],0,8,[0,yc,0]);
      lathe(d,[[0,-.135],[.02,-.125],[.026,-.11],[.02,-.095],[.012,-.09]],0,10,[0,yc,0]);return{steel:s,dsteel:d,leather:l}},
    axe(){const w=G(),s=G();lathe(w,[[0,-.13],[.017,-.13],[.018,0],[.016,.5],[.015,.66],[0,.66]],0,8,[0,yc,0]);
      slab(s,[[.52,yc+.03],[.62,yc+.03],[.70,yc-.17],[.44,yc-.17]],-.012,.012);slab(s,[[.54,yc+.03],[.6,yc+.03],[.59,yc+.07],[.55,yc+.07]],-.009,.009);return{wood:w,steel:s}},
    knight(){const s=G(),b=G(),l=G();blade(s,.065,.92,.055,0,.4,yc,.006);box(b,.045,.07,yc-.13,yc+.13,-.016,.016);box(b,.04,.075,yc-.15,yc-.12,-.02,.02);box(b,.04,.075,yc+.12,yc+.15,-.02,.02);
      lathe(l,[[.015,-.16],[.016,-.12],[.015,0],[.014,.045]],0,8,[0,yc,0]);lathe(b,[[0,-.21],[.024,-.2],[.03,-.18],[.024,-.165],[.014,-.16]],0,10,[0,yc,0]);return{steel:s,brass:b,leather:l}},
    king(){const s=G(),au=G(),r=G(),gm=G();blade(s,.065,.86,.04,.06,.55,yc);box(au,.045,.07,-.045,.075,-.015,.015);
      // дужка, що закриває кулак
      for(let i=0;i<6;i++){const a0=Math.PI*i/6,a1=Math.PI*(i+1)/6,p=a=>[-.02+Math.cos(a)*.075,yc-.05-Math.sin(a)*.03,0];const A=p(a0),Bq=p(a1);box(au,Math.min(A[0],Bq[0])-.004,Math.max(A[0],Bq[0])+.004,Math.min(A[1],Bq[1])-.005,Math.max(A[1],Bq[1])+.005,-.006,.006)}
      lathe(r,[[.014,-.09],[.016,-.06],[.015,0],[.014,.045]],0,8,[0,yc,0]);lathe(gm,[[0,-.122],[.016,-.112],[.02,-.1],[.014,-.09]],0,10,[0,yc,0]);return{steel:s,gold:au,red:r,gem:gm}},
    // довгі козацькі вуса: від носа вбік і донизу, кінці звисають нижче підборіддя
    usy(){const h=G(),path=[[.003,.037,.121,.007],[.017,.033,.116,.009],[.031,.023,.103,.008],[.039,.004,.09,.0065],[.043,-.02,.082,.005],[.042,-.044,.079,.0035],[.039,-.06,.078,.0015]];
      for(const sx of [1,-1]){const pts=path.map(([x,y,z,r])=>[x*sx,y,z,r]);
        for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],ring=(p,s)=>[p[0]+Math.cos(s)*p[3]*1.2,p[1]+Math.sin(s)*p[3]*.6,p[2]+Math.sin(s)*p[3]*.35];
          for(let s=0;s<6;s++){const s0=s*Math.PI/3,s1=(s+1)*Math.PI/3;poly(h,[ring(a,s0),ring(a,s1),ring(b,s1),ring(b,s0)])}}}
      return{hair:h}},
    // спис ополченця: довге ратище, тримають ближче до середини
    spear(){const w=G(),s=G();lathe(w,[[0,-.75],[.016,-.75],[.017,0],[.015,1.15],[0,1.15]],0,8,[0,yc,0]);
      slab(s,[[1.13,yc-.018],[1.22,yc-.035],[1.4,yc],[1.22,yc+.035],[1.13,yc+.018]],-.006,.006);lathe(s,[[.019,1.1],[.019,1.16]],0,8,[0,yc,0]);return{wood:w,steel:s}},
    // щити: лице дивиться в +Z, центр — (0,0,0)
    shield0(){const w=G(),i=G();lathe(w,[[0,.03],[.25,.03],[.27,.02],[.27,0],[0,0]],2,20);lathe(i,[[0,.085],[.03,.08],[.05,.06],[.06,.03]],2,12);
      for(const x of [-.09,0,.09])box(w,x-.002,x+.002,-.25,.25,.03,.032);return{wood:w,dsteel:i}},
    shield1(){const w=G(),i=G();lathe(w,[[0,.03],[.25,.03],[.25,0],[0,0]],2,20);lathe(i,[[.235,.034],[.285,.034],[.285,-.004],[.235,-.004]],2,24);lathe(i,[[0,.09],[.03,.085],[.055,.065],[.065,.03]],2,12);
      for(let k=0;k<8;k++){const a=k*Math.PI/4,x=Math.cos(a)*.2,y=Math.sin(a)*.2;box(i,x-.012,x+.012,y-.012,y+.012,.028,.044)}
      for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;const ca=Math.cos(a),sa=Math.sin(a);poly(i,[[ca*.06-sa*.012,sa*.06+ca*.012,.036],[ca*.06+sa*.012,sa*.06-ca*.012,.036],[ca*.235+sa*.012,sa*.235-ca*.012,.036],[ca*.235-sa*.012,sa*.235+ca*.012,.036]])}
      return{wood:w,dsteel:i}},
    shield2(){const bl=G(),au=G();lathe(bl,[[0,.03],[.25,.03],[.25,0],[0,0]],2,24);lathe(au,[[.235,.036],[.285,.036],[.285,-.004],[.235,-.004]],2,24);
      // тризуб: середній зубець, бічні, основа
      const z0=.03,z1=.042,T=(x0,x1,y0,y1)=>box(au,x0,x1,y0,y1,z0,z1);
      T(-.014,.014,-.12,.13);slab(au,[[0,.19],[.03,.13],[0,.1],[-.03,.13]],z0,z1);
      T(-.15,-.115,-.07,.17);T(.115,.15,-.07,.17);slab(au,[[-.15,.17],[-.115,.17],[-.1,.215],[-.135,.215]],z0,z1);slab(au,[[.115,.17],[.15,.17],[.135,.215],[.1,.215]],z0,z1);
      T(-.15,.15,-.15,-.11);T(-.15,-.115,-.15,-.07);T(.115,.15,-.15,-.07);
      slab(au,[[-.115,-.11],[-.014,-.03],[-.014,0],[-.115,-.08]],z0,z1);slab(au,[[.115,-.08],[.014,0],[.014,-.03],[.115,-.11]],z0,z1);
      T(-.03,.03,-.2,-.15);return{blue:bl,gold:au}},
    // шапки й шоломи шиємо по самій голові: шкіра вище лінії брів, відсунута назовні — сидять щільно в будь-якому русі
    helm1(){const f=G(),r=G(),R1=region([above(0),below(.05)]),R2=region([above(.035)]);   // козацька шапка
      shell(f,R1,.024);rim(f,R1,.024,.012,.012);
      const top=crownY(R2);shell(r,R2,.017,p=>{const k=Math.max(0,(p[1]-(top-.07))/.07);return[p[0]*(1-.12*k),p[1]+.03*k*k,p[2]-.02*k*k]});   // верх — мішком, трохи назад
      const c=crown(R2,.017);const pts=[[c[0],c[1]+.025,c[2]-.02],[c[0]-.04,c[1]+.01,c[2]-.08],[c[0]-.065,c[1]-.04,c[2]-.11],[c[0]-.07,c[1]-.09,c[2]-.115]];
      for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],ra=.03*(1-k/3)+.01,rb=.03*(1-(k+1)/3)+.008,q=(p,rr,s)=>[p[0]+Math.cos(s)*rr,p[1],p[2]+Math.sin(s)*rr];
        for(let s=0;s<6;s++){const s0=s*Math.PI/3,s1=(s+1)*Math.PI/3;poly(r,[q(a,ra,s0),q(a,ra,s1),q(b,rb,s1),q(b,rb,s0)])}}
      lathe(f,[[0,.012],[.017,.009],[.017,-.003],[0,-.006]],1,8,[pts[3][0],pts[3][1],pts[3][2]]);return{fur:f,red:r}},
    helm2(){const s=G(),d=G(),R=region([above(0)]);shell(s,R,.011);rim(d,R,.011,.007,.012);   // залізний шолом-місюрка
      const c=crown(R,.011);lathe(d,[[0,.014],[.01,.01],[.012,0]],1,8,c);return{steel:s,dsteel:d}},
    helm3(){const s=G(),d=G(),ch=G(),R=region([above(0)]);shell(s,R,.012,p=>{const t=crownY(R)+.012,k=Math.max(0,(p[1]-(t-.06))/.06);return[p[0]*(1-.25*k*k),p[1]+.035*k*k,p[2]*(1-.25*k*k)]});   // шишак: верх витягнутий угору
      rim(d,R,.012,.007,.012);const c=crown(R,.012);lathe(d,[[.012,.03],[.008,.06],[.003,.09],[0,.1]],1,8,c);   // шпиль
      const F=front();box(d,-.009,.009,F[1]-.065,F[1]+.012,F[2]+.004,F[2]+.016);   // наносник
      for(const [a,b] of R.edges){const A=R.hp(a,.012),B=R.hp(b,.012);if(A[2]>.035||B[2]>.035)continue;const o=(p,c)=>{const nx=R.N[c*3],nz=R.N[c*3+2],l=Math.hypot(nx,nz)||1;return[p[0]+nx/l*.018,p[1]-.085,p[2]+nz/l*.018]};poly(ch,[A,B,o(B,b),o(A,a)])}   // бармиця ззаду й з боків
      return{steel:s,dsteel:d,chain:ch}},
  };
  for(const it of items){const bone=byName.get(it.bone);if(!bone)throw 'no bone '+it.bone;
    const grp=doc.createNode(it.name).setTranslation(it.t||[0,0,0]).setRotation(it.r||[0,0,0,1]).setScale([it.s||1,it.s||1,it.s||1]);
    for(const [nm,kind] of it.list){const n=doc.createNode(nm).setMesh(mesh(nm,B[kind]()));grp.addChild(n)}
    bone.addChild(grp)}
}
