// козак для гри з наборів Quaternius (CC0): вбрання частинами + голова (без брів) + вуса/оселедець + шабля в руці + рухи під назви гри
// node qmake.mjs cfg.json out.glb
import fs from 'fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,prune,dedup,weld,textureCompress,simplify,resample} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {buildItems} from './qitems.mjs';
import {shirtSwap,sharovary,sash,faceMorphs,eyeVariants} from './qcossack.mjs';
const [,,cfgP,out]=process.argv;const C=JSON.parse(fs.readFileSync(cfgP,'utf8'));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(C.base),R=doc.getRoot();
const skin=R.listSkins()[0],jName=skin.listJoints().map(j=>j.getName());
const byName=new Map(R.listNodes().map(n=>[n.getName(),n]));
const parentOf=n=>R.listNodes().find(p=>p.listChildren().includes(n))||null;
const host=parentOf(R.listNodes().find(n=>n.getMesh()&&n.getSkin()===skin));
const scene=R.listScenes()[0];

function keepTris(prim,ok){const I=prim.getIndices(),a=I.getArray(),o=[];for(let t=0;t<a.length;t+=3)if(ok(a[t],a[t+1],a[t+2]))o.push(a[t],a[t+1],a[t+2]);I.setArray(new (a.constructor)(o));return o.length/3}
// голова: вершини, що їх тягнуть голова й шия, і відкритий виріз сорочки спереду
// тіло під одягом лишаємо до грудей, але втискаємо всередину на кілька мм — щоб у вирізі не було дірки і шкіра не проступала крізь сорочку
function cutToHead(prim,keep,mode){const J=prim.getAttribute('JOINTS_0'),W=prim.getAttribute('WEIGHTS_0'),P=prim.getAttribute('POSITION'),N=prim.getAttribute('NORMAL');
  const ok=new Uint8Array(J.getCount()),j=[],w=[],p=[0,0,0],n=[0,0,0],ch=C.chest||{};
  const P2=P.clone();prim.setAttribute('POSITION',P2);
  for(let v=0;v<J.getCount();v++){J.getElement(v,j);W.getElement(v,w);P.getElement(v,p);let s=0;for(let k=0;k<4;k++)if(keep.has(j[k]))s+=w[k];
    ok[v]=mode==='chest'?(p[1]>=(ch.yMin??9)?1:0):(s>=.5?1:0);   // chest — груди й плечі під одягом (з шиєю), head — голова з шиєю
    if(s<.5&&ok[v]){N.getElement(v,n);const d=(ch.shrink??0)*(1-s*2);P2.setElement(v,[p[0]-n[0]*d,p[1]-n[1]*d,p[2]-n[2]*d])}}
  return keepTris(prim,(a,b,c)=>ok[a]&&ok[b]&&ok[c])}
// частина зачіски в межах коробок (вуса з бороди, оселедець із довгого волосся)
function cutBox(prim,B){const P=prim.getAttribute('POSITION'),p=[0,0,0],bs=Array.isArray(B)?B:[B];
  const inB=(c,b)=>Math.abs(c[0])<=(b.xMax??9)&&Math.abs(c[0])>=(b.xMin??0)&&c[1]>=(b.yMin??-9)&&c[1]<=(b.yMax??9)&&c[2]>=(b.zMin??-9)&&c[2]<=(b.zMax??9);
  return keepTris(prim,(...vs)=>{const c=[0,0,0];for(const v of vs){P.getElement(v,p);for(let k=0;k<3;k++)c[k]+=p[k]/3}return bs.some(b=>inB(c,b))})}

async function addPart(o){const d2=await io.read(o.path),R2=d2.getRoot();
  const s2=R2.listSkins()[0];if(s2.listJoints().map(j=>j.getName()).join()!==jName.join())throw 'skeleton mismatch '+o.path;
  for(const m of R2.listMeshes()){for(const p of m.listPrimitives()){const mat=p.getMaterial(),mn=mat?mat.getName():'';
      if(o.dropMat&&new RegExp(o.dropMat).test(mn)){p.dispose();continue}
      if(o.head&&/Superhero|Regular/.test(mn)){const mode=o.head==='chest'?'chest':'head';const keep=new Set(jName.map((n,i)=>/^(Head|neck_01)$/.test(n)?i:-1).filter(i=>i>=0));console.log(mode,'tris',cutToHead(p,keep,mode))}
      if(o.box)console.log(o.name,'tris',cutBox(p,o.box))
      if(o.shrink){const P=p.getAttribute('POSITION').clone(),N=p.getAttribute('NORMAL'),v=[0,0,0],n=[0,0,0];p.setAttribute('POSITION',P);   // підсорочка — трохи менша, щоб не лізла крізь верхній одяг
        for(let i=0;i<P.getCount();i++){P.getElement(i,v);N.getElement(i,n);P.setElement(i,[v[0]-n[0]*o.shrink,v[1]-n[1]*o.shrink,v[2]-n[2]*o.shrink])}}}
    if(o.name)m.setName(o.name)}
  // інша текстура для частини (кольчуга з сорочки): власний матеріал, щоб не зачепити оригінал
  if(o.tex)for(const m of R2.listMaterials())if(m.getName()===o.texMat){m.setName(o.matName);const t=m.getBaseColorTexture();if(t)t.setImage(new Uint8Array(fs.readFileSync(o.tex))).setMimeType('image/png').setURI(o.matName+'.png').setName(o.matName)}
  const before=new Set(R.listNodes());mergeDocuments(doc,d2);
  const added=R.listNodes().filter(n=>!before.has(n));
  for(const n of added)if(n.getMesh()&&n.getSkin()){if(!n.getMesh().listPrimitives().length){n.dispose();continue}
    n.setSkin(skin);parentOf(n)?.removeChild(n);(host||scene).addChild(n);n.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);if(o.name)n.setName(o.name)}
  for(const sc of R.listScenes())if(sc!==scene)sc.dispose();
  for(const n of added)if(!n.getMesh()&&!n.isDisposed?.())n.dispose();
  for(const s of R.listSkins())if(s!==skin)s.dispose()}
for(const p of C.parts)await addPart(p);
// назви сіток: без префікса статі
for(const n of R.listNodes())if(n.getMesh()){const nm=n.getName().replace(/^Male_/,'');n.setName(nm);n.getMesh().setName(nm)}

// речі з крамниці: зброя в правій руці, щит на лівому передпліччі, шапки й шоломи на голові (див. qitems.mjs)
// козацький одяг: вишиванка, шаровари, кушак (на сорочку й на жупан)
if(C.cossack){const k=C.cossack,h=host||scene;shirtSwap(doc,['Peasant_Body','Peasant_Arms','Undershirt'],'MI_Peasant','MI_Shirt',k.shirt);
  sharovary(doc,skin,h,'Peasant_Legs',k.pants,k.shar);sash(doc,skin,h,'Peasant_Body','SashS',.955,1.035,.014,k.sash);sash(doc,skin,h,'Ranger_Body','SashV',.955,1.035,.012,k.sash)}
if(C.morphs)console.log('morphs',faceMorphs(doc,skin,jName).join(','));
if(C.eyes)eyeVariants(doc,C.eyes);
// голова в системі кістки голови (через обернену матрицю прив'язки) — по ній шиємо шоломи, щоб сиділи щільно
function headSpace(){const ji=jName.indexOf('Head'),m=[];skin.getInverseBindMatrices().getElement(ji,m);let prim=null;
  for(const n of R.listNodes()){const me=n.getMesh();if(!me||n.getName()!=='Head')continue;for(const p of me.listPrimitives())if(/Superhero|Regular/.test(p.getMaterial()?.getName()||''))prim=p}
  const P=prim.getAttribute('POSITION'),N=prim.getAttribute('NORMAL'),I=Array.from(prim.getIndices().getArray()),v=[0,0,0],n=[0,0,0],pos=[],nor=[];
  for(let i=0;i<P.getCount();i++){P.getElement(i,v);N.getElement(i,n);
    pos.push(m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]);
    const a=m[0]*n[0]+m[4]*n[1]+m[8]*n[2],b=m[1]*n[0]+m[5]*n[1]+m[9]*n[2],c=m[2]*n[0]+m[6]*n[1]+m[10]*n[2],l=Math.hypot(a,b,c)||1;nor.push(a/l,b/l,c/l)}
  return{P:pos,N:nor,I}}
if(C.items)buildItems(doc,byName,C.items,headSpace());

// рухи під назви гри; частини послідовності зшиваються (між ними — коротке перетікання)
const buf=R.listBuffers()[0],libs={};
async function lib(p){return libs[p]||(libs[p]=await io.read(p))}
for(const [name,segs] of Object.entries(C.anims)){const tr={};let t0=0;
  for(const [L,from,reps=1,tc0=0,tc1] of segs){const src=(await lib(L)).getRoot().listAnimations().find(a=>a.getName()===from);if(!src)throw 'no anim '+from;
    let dur=0;for(const s of src.listSamplers()){const a=s.getInput().getArray();dur=Math.max(dur,a[a.length-1])}
    const c0=tc0,c1=tc1??dur,len=c1-c0;
    for(let r=0;r<reps;r++){for(const ch of src.listChannels()){const tn=ch.getTargetNode().getName(),path=ch.getTargetPath();if(!byName.has(tn)||path==='scale')continue;
        if(path==='translation'&&!/^(pelvis|root)$/.test(tn))continue;
        const s=ch.getSampler(),I=s.getInput().getArray(),O=s.getOutput(),k=O.getElementSize(),V=O.getArray();const key=tn+'|'+path;
        const T=tr[key]||(tr[key]={node:byName.get(tn),path,type:O.getType(),k,t:[],v:[]});
        for(let i=0;i<I.length;i++){if(I[i]<c0-1e-4||I[i]>c1+1e-4)continue;T.t.push(t0+I[i]-c0);for(let q=0;q<k;q++)T.v.push(V[i*k+q])}}
      t0+=len+(segs.length>1||reps>1?.12:0)}}
  const an=doc.createAnimation(name);
  for(const T of Object.values(tr)){// часи мають зростати
    const ia=doc.createAccessor().setType('SCALAR').setArray(new Float32Array(T.t)).setBuffer(buf),oa=doc.createAccessor().setType(T.type).setArray(new Float32Array(T.v)).setBuffer(buf);
    const ns=doc.createAnimationSampler().setInput(ia).setOutput(oa).setInterpolation('LINEAR');an.addSampler(ns).addChannel(doc.createAnimationChannel().setTargetNode(T.node).setTargetPath(T.path).setSampler(ns))}}
for(const b of R.listBuffers().slice(1)){for(const a of R.listAccessors())if(a.getBuffer()===b)a.setBuffer(buf);b.dispose()}

// текстури: інший колір для матеріалу; волосся — фарбуємо
for(const [mn,png] of Object.entries(C.texSwap||{}))for(const m of R.listMaterials())if(m.getName()===mn){const t=m.getBaseColorTexture();if(t)t.setImage(new Uint8Array(fs.readFileSync(png))).setMimeType('image/png')}
if(C.hair){const done=new Set();for(const m of R.listMaterials())if(/Hair/.test(m.getName())){const t=m.getBaseColorTexture();if(!t||done.has(t))continue;done.add(t);
  t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).removeAlpha().linear(C.hair,[0,0,0]).png().toBuffer())).setMimeType('image/png')}}
for(const m of R.listMeshes())for(const p of m.listPrimitives())for(const k of p.listSemantics())if(!/^(POSITION|NORMAL|TEXCOORD_0|JOINTS_0|WEIGHTS_0)$/.test(k))p.setAttribute(k,null);
// у грі світло Ламберта — потрібна лише кольорова текстура
for(const m of R.listMaterials())if(!C.keepNormal||!m.getBaseColorTexture())m.setNormalTexture(null);
for(const m of R.listMaterials())m.setOcclusionTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null).setMetallicFactor(0).setRoughnessFactor(1);
const tf=[resample({tolerance:C.resTol||1e-4}),prune(),dedup(),weld()];
if(C.simplify)tf.push(simplify({simplifier:MeshoptSimplifier,ratio:C.simplify,error:C.simplifyErr||.002,lockBorder:false}));
tf.push(textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[C.tex||1024,C.tex||1024],quality:C.q||80,pattern:/^(?!.*(Hair|Eye))/}));
tf.push(textureCompress({encoder:sharp,targetFormat:'jpeg',resize:[C.texSmall||256,C.texSmall||256],quality:80,pattern:/Hair|Eye/}));
await MeshoptSimplifier.ready;await doc.transform(...tf);
await io.write(out,doc);
let tris=0;const per={};for(const m of R.listMeshes()){let t=0;for(const p of m.listPrimitives())t+=p.getIndices().getCount()/3;per[m.getName()]=t;tris+=t}
console.log('ok',out,(fs.statSync(out).size/1e6).toFixed(2)+'MB','tris',tris,JSON.stringify(per));
console.log('anims',R.listAnimations().map(a=>{let d=0;for(const s of a.listSamplers()){const x=s.getInput().getArray();d=Math.max(d,x[x.length-1])}return a.getName()+':'+d.toFixed(1)}).join(' '));
