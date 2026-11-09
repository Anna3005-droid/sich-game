// речі з крамниці коваля для козака Quaternius: зброя (у правій руці), щити (на лівому передпліччі), шапки й шоломи (на голові).
// Усе будується з простих форм кодом — без файлів, у стилі моделі. Кольори — як у sRGB (гра так їх і читає).
const COL={steel:[.78,.8,.84],dsteel:[.45,.47,.5],wood:[.5,.31,.16],dwood:[.32,.19,.1],leather:[.36,.21,.11],gold:[.86,.66,.22],
  brass:[.74,.56,.26],red:[.66,.13,.11],fur:[.24,.16,.1],blue:[.14,.32,.66],gem:[.75,.08,.1],chain:[.5,.52,.55]};

export function buildItems(doc,byName,items){
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
    // шапки й шоломи — у системі кістки голови: Y вгору (брови ~0.11, маківка ~0.21), Z уперед; череп ~0.077 завширшки, ~0.096 від центру вперед-назад
    helm1(){const f=G(),r=G(),c=[0,0,.006];   // козацька шапка: хутряний околиш і червоний верх зі шликом
      lathe(f,[[.096,.118],[.11,.12],[.117,.16],[.116,.205],[.1,.215]],1,18,c,0,Math.PI*2,.9,1);
      lathe(r,[[.1,.21],[.098,.24],[.082,.265],[.045,.28],[0,.284]],1,16,c,0,Math.PI*2,.9,1);
      const pts=[[0,.275,-.01],[-.045,.26,-.075],[-.075,.21,-.105],[-.085,.155,-.11]];for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],ra=.032*(1-k/3)+.01,rb=.032*(1-(k+1)/3)+.008;
        const q=(p,rr,s)=>[p[0]+Math.cos(s)*rr,p[1],p[2]+Math.sin(s)*rr];for(let s=0;s<6;s++){const s0=s*Math.PI/3,s1=(s+1)*Math.PI/3;poly(r,[q(a,ra,s0),q(a,ra,s1),q(b,rb,s1),q(b,rb,s0)])}}
      lathe(f,[[0,.155],[.018,.152],[.018,.14],[0,.135]],1,8,[-.085,0,-.11]);return{fur:f,red:r}},
    helm2(){const s=G(),d=G(),c=[0,0,.008];   // залізний шолом-місюрка
      lathe(s,[[.103,.125],[.105,.16],[.1,.195],[.083,.225],[.05,.245],[0,.252]],1,20,c,0,Math.PI*2,.86,1);
      lathe(d,[[.107,.118],[.109,.123],[.109,.142],[.105,.146]],1,20,c,0,Math.PI*2,.86,1);lathe(d,[[0,.262],[.01,.258],[.012,.25]],1,8,c);return{steel:s,dsteel:d}},
    helm3(){const s=G(),d=G(),ch=G(),c=[0,0,.008];   // шишак: гострий, з наносником і бармицею
      lathe(s,[[.103,.125],[.105,.165],[.096,.2],[.07,.23],[.036,.257],[.012,.29],[0,.31]],1,20,c,0,Math.PI*2,.86,1);
      lathe(d,[[.107,.118],[.109,.123],[.109,.142],[.105,.146]],1,20,c,0,Math.PI*2,.86,1);
      box(d,-.011,.011,.045,.135,.108,.12);   // наносник
      lathe(ch,[[.105,.125],[.108,.08],[.112,.035],[.12,0]],1,14,c,Math.PI*.8,Math.PI*2.2,.9,1);   // бармиця: ззаду й з боків
      return{steel:s,dsteel:d,chain:ch}},
  };
  for(const it of items){const bone=byName.get(it.bone);if(!bone)throw 'no bone '+it.bone;
    const grp=doc.createNode(it.name).setTranslation(it.t||[0,0,0]).setRotation(it.r||[0,0,0,1]).setScale([it.s||1,it.s||1,it.s||1]);
    for(const [nm,kind] of it.list){const n=doc.createNode(nm).setMesh(mesh(nm,B[kind]()));grp.addChild(n)}
    bone.addChild(grp)}
}
