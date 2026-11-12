// козацький одяг для моделі Quaternius: вишиванка (інша текстура сорочки), широкі шаровари кількох кольорів, кушак кількох кольорів.
// Шаровари й кушак — з сітки самого тіла/штанів, тому рухаються разом з ним (ті самі кістки й ваги).
import fs from 'fs';

const findPrim=(R,node,mat)=>{const n=R.listNodes().find(x=>x.getName()===node&&x.getMesh());if(!n)throw 'no node '+node;
  return n.getMesh().listPrimitives().find(p=>!mat||(p.getMaterial()&&mat.test(p.getMaterial().getName())))};

// сорочка — вишиванка: свій матеріал із новою текстурою на всіх частинах сорочки
export function shirtSwap(doc,nodes,from,name,png){const R=doc.getRoot();let mat=null;
  for(const nm of nodes)for(const n of R.listNodes().filter(x=>x.getName()===nm&&x.getMesh()))for(const p of n.getMesh().listPrimitives()){const m=p.getMaterial();if(!m||m.getName()!==from)continue;
    if(!mat){mat=m.clone().setName(name);const t=doc.createTexture(name).setImage(new Uint8Array(fs.readFileSync(png))).setMimeType('image/png').setURI(name+'.png');mat.setBaseColorTexture(t);
      const ti=m.getBaseColorTextureInfo(),to=mat.getBaseColorTextureInfo();if(ti&&to)to.setTexCoord(ti.getTexCoord())}
    p.setMaterial(mat)}}

function newPrim(doc,buf,src,P,N,J,W,I){const acc=(type,arr)=>doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const p=doc.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P))).setAttribute('NORMAL',acc('VEC3',new Float32Array(N)))
    .setAttribute('JOINTS_0',acc('VEC4',new Uint16Array(J))).setAttribute('WEIGHTS_0',acc('VEC4',new Float32Array(W))).setIndices(acc('SCALAR',new Uint32Array(I)));
  const uv=src&&src.uv;if(uv)p.setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array(uv)));return p}
// кілька кольорових варіантів однієї сітки: вузли name_0..name_n зі спільною геометрією
function variants(doc,skin,host,name,prim,colors,tex,normalFrom){const R=doc.getRoot();
  colors.forEach((c,i)=>{const m=doc.createMaterial('CL_'+name+'_'+i).setBaseColorFactor([...c,1]).setMetallicFactor(0).setRoughnessFactor(.9).setDoubleSided(true);
    if(tex)m.setBaseColorTexture(tex);if(normalFrom&&normalFrom.getNormalTexture())m.setNormalTexture(normalFrom.getNormalTexture());
    const p=i===0?prim:prim.clone();p.setMaterial(m);const n=doc.createNode(name+'_'+i).setMesh(doc.createMesh(name+'_'+i).addPrimitive(p)).setSkin(skin);host.addChild(n)})}

// шаровари: штани роздуваємо — найширше над коліном, звисають на халяви; між ногами не роздуваємо
export function sharovary(doc,skin,host,src,colors,png){const R=doc.getRoot(),buf=R.listBuffers()[0],sp=findPrim(R,src,/Peasant/);
  const P=sp.getAttribute('POSITION'),N=sp.getAttribute('NORMAL'),cnt=P.getCount(),pos=new Float32Array(cnt*3),v=[0,0,0],n=[0,0,0];
  for(let i=0;i<cnt;i++){P.getElement(i,v);N.getElement(i,n);const y=v[1];let b=.055*Math.exp(-(((y-.6)/.17)**2))+.012*Math.max(0,Math.min(1,(.98-y)/.2));
    if(y<.5)b*=1+.6*Math.max(0,(.5-y)/.08);   // напуск на халяви
    const inner=Math.sign(n[0])!==Math.sign(v[0])&&Math.abs(v[0])<.16?.25:1;b*=inner;
    pos[i*3]=v[0]+n[0]*b;pos[i*3+1]=v[1]+n[1]*b*.4-(y<.5?.012*(.5-y)/.08:0);pos[i*3+2]=v[2]+n[2]*b}
  const prim=sp.clone();prim.setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf));
  const tex=doc.createTexture('T_Shar').setImage(new Uint8Array(fs.readFileSync(png))).setMimeType('image/png').setURI('T_Shar.png');
  variants(doc,skin,host,'Shar',prim,colors,tex,sp.getMaterial())}

// кушак: смуга з поверхні сорочки чи жупана на поясі, відсунута назовні, і два кінці, що звисають на лівому боці
export function sash(doc,skin,host,src,name,y0,y1,off,colors){const R=doc.getRoot(),buf=R.listBuffers()[0],sp=findPrim(R,src,null);
  const P=sp.getAttribute('POSITION'),N=sp.getAttribute('NORMAL'),J=sp.getAttribute('JOINTS_0'),W=sp.getAttribute('WEIGHTS_0'),I=sp.getIndices().getArray();
  const get=(A,i)=>A.getElement(i,[]);
  const vs=[],key=new Map();   // вершини смуги: [pos,nrm,j,w]
  const vert=i=>{const p=get(P,i),n=get(N,i);return{p,n,j:get(J,i),w:get(W,i)}};
  const add=(V)=>{vs.push(V);return vs.length-1};
  const cache=new Map(),mid=(A,B,yc)=>{const k=[A.key,B.key].sort().join('|')+'|'+yc;if(cache.has(k))return cache.get(k);const a=A.V,b=B.V,t=(yc-a.p[1])/(b.p[1]-a.p[1]);
    const q=t<.5?a:b,V={p:a.p.map((x,k)=>x+(b.p[k]-x)*t),n:a.n.map((x,k)=>x+(b.n[k]-x)*t),j:q.j,w:q.w};const r=add(V);cache.set(k,r);return r};
  const tris=[],own=new Map(),idx=i=>{if(!own.has(i))own.set(i,add(vert(i)));return own.get(i)};
  for(let t=0;t<I.length;t+=3){let poly=[I[t],I[t+1],I[t+2]].map(i=>({i,V:vert(i),id:null,key:'v'+i}));
    for(const [yc,keepAbove] of [[y0,true],[y1,false]]){const out=[];for(let k=0;k<poly.length;k++){const A=poly[k],Bq=poly[(k+1)%poly.length],ina=keepAbove?A.V.p[1]>=yc:A.V.p[1]<=yc,inb=keepAbove?Bq.V.p[1]>=yc:Bq.V.p[1]<=yc;
        if(ina)out.push(A);if(ina!==inb){const id=mid(A,Bq,yc);out.push({i:null,V:vs[id],id,key:'m'+id})}}poly=out;if(poly.length<3)break}
    if(poly.length<3)continue;const ids=poly.map(q=>q.id!==null&&q.id!==undefined?q.id:idx(q.i));for(let k=1;k<ids.length-1;k++)tris.push(ids[0],ids[k],ids[k+1])}
  // відступ назовні й трохи ширше по краях (товщина тканини)
  const Pp=[],Nn=[],Jj=[],Ww=[];for(const V of vs){const l=Math.hypot(...V.n)||1,nn=V.n.map(x=>x/l);Pp.push(...V.p.map((x,k)=>x+nn[k]*off));Nn.push(...nn);Jj.push(...V.j);Ww.push(...V.w)}
  // кінці: дві стрічки від лівого боку донизу
  const anchor=(()=>{let best=0,bs=1e9;vs.forEach((V,i)=>{const d=(V.p[0]-.13)**2+(V.p[2]-.06)**2+(V.p[1]-(y0+y1)/2)**2;if(d<bs){bs=d;best=i}});return vs[best]})();
  for(const [dx,len,w] of [[0,.24,.05],[.03,.19,.045]]){const base=Pp.length/3,x0=anchor.p[0]+off+.004+dx*.3,z0=anchor.p[2]+.02-dx;
    for(let s=0;s<=6;s++){const f=s/6,y=(y0+y1)/2-f*len,ww=w*(1-.35*f),xx=x0+.02*f+dx,zz=z0+.012*Math.sin(f*3);
      Pp.push(xx,y,zz-ww/2,xx,y,zz+ww/2);Nn.push(1,0,0,1,0,0);Jj.push(...anchor.j,...anchor.j);Ww.push(...anchor.w,...anchor.w)}
    for(let s=0;s<6;s++){const a=base+s*2;tris.push(a,a+1,a+3,a,a+3,a+2)}}
  const prim=newPrim(doc,buf,null,Pp,Nn,Jj,Ww,tris);variants(doc,skin,host,name,prim,colors,null,null)}

// форма обличчя: цілі морфінгу на сітці голови (у грі — повзунки). Зсуви задаємо в системі кістки голови й переводимо в простір сітки
export function faceMorphs(doc,skin,jName){const R=doc.getRoot(),buf=R.listBuffers()[0],m=[];skin.getInverseBindMatrices().getElement(jName.indexOf('Head'),m);
  let mesh=null,prim=null;for(const n of R.listNodes()){const me=n.getMesh();if(!me||n.getName()!=='Head')continue;for(const p of me.listPrimitives())if(/Superhero/.test(p.getMaterial()?.getName()||'')){mesh=me;prim=p}}
  const P=prim.getAttribute('POSITION'),N=prim.getAttribute('NORMAL'),cnt=P.getCount(),v=[0,0,0],n=[0,0,0],B=[],BN=[];
  for(let i=0;i<cnt;i++){P.getElement(i,v);N.getElement(i,n);B.push([m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]);
    const a=m[0]*n[0]+m[4]*n[1]+m[8]*n[2],b=m[1]*n[0]+m[5]*n[1]+m[9]*n[2],c=m[2]*n[0]+m[6]*n[1]+m[10]*n[2],l=Math.hypot(a,b,c)||1;BN.push([a/l,b/l,c/l])}
  const g=(p,c,r)=>Math.exp(-((p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2)/(r*r)),cl=x=>Math.max(0,Math.min(1,x));
  const shapes={
    Width:(p)=>{const k=cl((.11-p[1])/.1)*cl((p[2]+.02)/.06);return[p[0]*.16*k,0,0]},   // ширше обличчя внизу
    Nose:(p)=>{const k=g(p,[0,.065,.122],.026);return[p[0]*.3*k,-.004*k,.017*k]},      // більший, довший ніс
    Chin:(p)=>{const k=g(p,[0,-.018,.098],.026);return[0,-.01*k,.013*k]},             // підборіддя вперед
    Cheek:(p)=>{const k=g(p,[.045,.072,.085],.026)+g(p,[-.045,.072,.085],.026);return[Math.sign(p[0])*.011*k,.002*k,.004*k]},   // вилиці
    Brow:(p)=>{if(p[1]<.104)return[0,0,0];const k=g(p,[0,.118,.104],.04)*cl((p[1]-.104)/.012);return[0,.002*k,.011*k]},   // надбрівні дуги
    Full:(p,nn)=>{const k=g(p,[.05,.03,.072],.032)+g(p,[-.05,.03,.072],.032);return nn.map(x=>x*.012*k)}};   // повні щоки
  const names=Object.keys(shapes);
  for(const nm of names){const d=new Float32Array(cnt*3);for(let i=0;i<cnt;i++){const db=shapes[nm](B[i],BN[i]);   // назад у простір сітки (транспонована обертальна частина)
      for(let q=0;q<3;q++)d[i*3+q]=m[q*4]*db[0]+m[q*4+1]*db[1]+m[q*4+2]*db[2]}
    prim.addTarget(doc.createPrimitiveTarget(nm).setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(d).setBuffer(buf)))}
  mesh.setWeights(names.map(()=>0));mesh.setExtras({targetNames:names});
  // друга сітка «Head» (очі) — теж мусить мати стільки ж цілей, якщо в одному меші; тут очі — окремий меш, тож нічого
  return names}

// кольори очей: вузли Eyes_0 (як є) … Eyes_n — та сама сітка, інша текстура райдужки
export function eyeVariants(doc,pngs){const R=doc.getRoot();
  const node=R.listNodes().find(n=>n.getMesh()&&n.getMesh().listPrimitives().some(p=>p.getMaterial()&&p.getMaterial().getName()==='MI_Eyes'));if(!node)throw 'no eyes';
  const parent=R.listNodes().find(p=>p.listChildren().includes(node))||R.listScenes()[0],prim=node.getMesh().listPrimitives()[0],mat=prim.getMaterial();
  node.setName('Eyes_0');node.getMesh().setName('Eyes_0');
  pngs.forEach((f,i)=>{const nm=f.replace(/^.*T_Eye_|\.png$/g,''),t=doc.createTexture('T_Eye_'+nm).setImage(new Uint8Array(fs.readFileSync(f))).setMimeType('image/png').setURI('T_Eye_'+nm+'.png');
    const m=mat.clone().setName('MI_Eyes').setBaseColorTexture(t),p=prim.clone().setMaterial(m);
    const n=doc.createNode('Eyes_'+(i+1)).setMesh(doc.createMesh('Eyes_'+(i+1)).addPrimitive(p)).setSkin(node.getSkin());parent.addChild(n)})}
