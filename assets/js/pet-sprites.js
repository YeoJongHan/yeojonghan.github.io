/* Hand-built pixel anatomy shared by the dog and cat collections. */
(() => {
  'use strict';
  const palettes={
    tan:['#d9ac79','#b18159','#f8e3bd'],red:['#cb986f','#9e694e','#f5d9b4'],gold:['#dfbd7e','#b18c56','#f9e8bd'],
    black:['#73747e','#4c4c59','#c4c2c8'],chocolate:['#b28a72','#805d50','#ead0b1'],cream:['#e4d6b9','#b9a68c','#fff0d3'],
    tricolor:['#cfa47c','#6a5c58','#fff0d8'],fawn:['#d3b895','#aa8c71','#f6e4c8'],white:['#ede8de','#c1bfb7','#fff7e8'],
    orange:['#dfae75','#b47f52','#ffe4b5'],silver:['#b1b9c7','#8793a6','#e7edf0'],merle:['#a4b1bf','#6c7d96','#edf0ea'],
    chestnut:['#c3977b','#946b58','#f9e5ca'],liver:['#ac8b7c','#7c615b','#eedfce'],steel:['#a3acb6','#75808e','#e4e6e1'],
    gray:['#b8bcb5','#8b978f','#ecece0'],brown:['#bea386','#94765e','#f3dfbd'],pink:['#dcbbb1','#b18d87','#fae4d5'],
    lavender:['#beb1da','#9587b1','#f1e4f3'],cloud:['#e0e7ea','#a6b9c7','#fff5df'],moss:['#abbc97','#7c9578','#e8e8c5'],
    rose:['#ddb5c2','#b288a7','#ffe6df'],ice:['#c0e0e7','#88b5c9','#f3fff5'],ember:['#dfa28a','#ae7380','#ffe0b5'],
    cosmic:['#a4a0c8','#746f9f','#e6e3fa'],sunset:['#e4b6a3','#b78fa7','#ffe2b5'],neon:['#b2d9bd','#7fae9f','#eeffd9'],
    bronze:['#cdb483','#a08665','#ffe8b7'],void:['#9e8db7','#6d608e','#e2ceee'],apricot:['#e5bd93','#ba8e6b','#ffe8c9']
  };
  const cache=new Map();
  const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function makePetSVG(pet,species) {
    const key=species+pet.id;
    if(cache.has(key))return cache.get(key);
    const cat=species==='cats',size=80;
    const grid=Array.from({length:size},()=>Array(size).fill(null));
    const overlays=[];
    const [coat,shade,cream]=palettes[pet.palette]||palettes.tan;
    const ink='#302d34',nose='#4d3d42',pink='#b4868e',gold='#cfb579';
    let seed=[...pet.name+pet.id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,101);
    const signature=seed;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function box(x,y,w,h,color) {
      for(let b=Math.max(0,Math.round(y));b<Math.min(size,Math.round(y+h));b++)for(let a=Math.max(0,Math.round(x));a<Math.min(size,Math.round(x+w));a++)grid[b][a]=color;
    }
    function ellipse(cx,cy,rx,ry,color) {
      for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(79,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(79,Math.ceil(cx+rx));x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)grid[y][x]=color;
    }
    function polygon(points,color) {
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<=Math.min(79,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<=Math.min(79,Math.ceil(Math.max(...xs)));x++){
        let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
          const[a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
        }if(inside)grid[y][x]=color;
      }
    }
    // Broad, flat planes and clipped corners give the sprites a stepped silhouette.
    function facet(x,y,rx,ry,color) {
      const cutX=Math.max(2,Math.round(rx*.3/2)*2),cutY=Math.max(2,Math.round(ry*.3/2)*2);
      polygon([[x-rx+cutX,y-ry],[x+rx-cutX,y-ry],[x+rx,y-ry+cutY],[x+rx,y+ry-cutY],[x+rx-cutX,y+ry],[x-rx+cutX,y+ry],[x-rx,y+ry-cutY],[x-rx,y-ry+cutY]],color);
    }
    function curve(points,thickness,color,end=thickness) {
      for(let i=0;i<=48;i++){
        const t=i/48,u=1-t,[a,b,c,d]=points;
        const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
        const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
        const r=(thickness+(end-thickness)*t)/2;
        box(Math.round(x/2)*2-r,Math.round(y/2)*2-r,r*2,r*2,color);
      }
    }
    function star(x,y,color=gold){box(x-2,y,5,1,color);box(x,y-2,1,5,color);box(x-1,y-1,3,3,color);}
    function ring(x,y,rx,ry,color,width=1){ellipse(x,y,rx,ry,color);ellipse(x,y,rx-width,ry-width,null);}
    function furPixel(x,y,color,w=2,h=1){for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)if(grid[b]?.[a]===coat)grid[b][a]=color;}

    // The highest tiers have their own compositions, rather than accessories on a common body.
    if(['secret','legendary'].includes(pet.rarity)&&PetMythicArt.draw(pet,species,{box,ellipse,polygon,facet,curve,star,ring}))return finishArt();

    const dogProfiles={
      corgi:[28,42,18,15,'point',24,9,'short'],spitz:[43,30,17,16,'point',14,16,'curly'],retriever:[30,32,17,18,'drop',20,14,'feather'],
      wolf:[27,29,16,18,'point',23,13,'fluffy'],malamute:[32,34,20,19,'point',23,15,'fluffy'],beagle:[30,36,17,16,'long',21,12,'short'],
      pug:[40,43,21,15,'fold',17,10,'curly'],bulldog:[38,41,21,15,'bat',21,11,'short'],boxer:[35,31,19,19,'fold',19,15,'short'],
      dalmatian:[29,29,16,18,'drop',21,14,'short'],poodle:[43,29,15,17,'poof',12,18,'pom'],chihuahua:[43,36,16,16,'wide',10,12,'curly'],
      pom:[42,39,23,18,'small',19,11,'fluffy'],collie:[29,30,16,20,'tip',22,15,'feather'],shepherd:[28,26,16,19,'tall',21,16,'fluffy'],
      longhair:[41,42,20,14,'silky',20,11,'feather'],spaniel:[30,36,17,17,'silky',21,12,'feather'],terrier:[30,35,16,17,'tip',20,12,'short'],scottie:[28,39,18,18,'small',22,10,'short'],
      schnauzer:[32,31,17,19,'fold',19,16,'short'],guard:[32,27,16,20,'tall',17,17,'short'],giant:[34,30,22,21,'drop',24,16,'fluffy'],
      chow:[42,36,20,17,'small',19,11,'fluffy'],cloud:[42,36,20,17,'small',17,11,'fluffy'],flatfluff:[42,38,20,15,'silky',18,10,'fluffy'],
      papillon:[42,35,16,16,'butterfly',12,12,'feather'],crested:[42,34,16,17,'wide',11,14,'pom'],sheepdog:[42,35,21,17,'silky',19,14,'feather'],
      sausage:[23,43,15,15,'long',26,8,'long'],sighthound:[27,25,13,19,'fold',20,12,'long'],borzoi:[26,25,14,21,'silky',21,14,'feather'],
      dane:[29,24,16,21,'drop',23,16,'long'],weimaraner:[28,28,15,19,'long',22,14,'long'],setter:[28,29,16,19,'silky',23,13,'feather'],
      afghan:[37,33,17,18,'silky',17,14,'feather'],basset:[33,39,18,16,'basset',22,9,'long'],bullterrier:[38,35,17,19,'small',17,11,'short'],
      cerberus:[40,32,18,17,'point',19,13,'fluffy'],robot:[42,35,18,17,'point',15,13,'short'],serpent:[36,34,17,17,'drop',18,11,'long'],
      kitsune:[42,34,17,16,'point',15,12,'many'],origami:[42,35,17,16,'point',15,12,'short']
    };
    let model;
    const catProfiles={
      round:[42,38,21,17,'cat',19,13,'cat'],slim:[42,26,15,16,'cat',11,19,'cat'],
      fluffy:[40,40,23,16,'cat',21,13,'cat'],forest:[41,27,19,19,'cat',20,20,'cat'],
      bald:[43,29,14,16,'cat',11,18,'cat'],wild:[26,32,16,17,'cat',24,14,'cat'],
      fold:[32,45,21,14,'fold-cat',24,10,'cat'],longhair:[40,32,17,17,'cat',20,20,'cat'],
      oriental:[43,24,14,17,'cat',10,20,'cat'],rex:[41,34,16,15,'cat',14,15,'cat'],
      bobtail:[32,37,19,17,'cat',22,13,'bob'],short:[27,45,18,14,'cat',24,9,'cat']
    };
    if(cat)model=catProfiles[pet.shape]||catProfiles.round;
    else model=dogProfiles[pet.shape]||dogProfiles.retriever;
    let[cx,cy,rx,ry,ear,bodyRx,bodyRy,tail]=model;
    if(pet.name==='Rottweiler'){rx=22;bodyRx=23;bodyRy=15;cy=34;ear='fold';}
    if(pet.name==='Doberman Pinscher'){rx=14;bodyRx=16;bodyRy=18;cy=25;}
    if(pet.name==='Shar Pei'){rx=20;ry=19;cy=38;bodyRy=12;}
    if(pet.name==='Devon Rex'){rx=17;ry=14;bodyRx=12;cy=31;}
    if(pet.name==='Cornish Rex'){rx=14;ry=17;bodyRy=18;cy=26;}
    if(pet.detail==='wizard')cy=Math.max(cy,ry+18);
    rx+=signature%3===0?1:0;
    rx-=2;ry-=2;bodyRy+=1;
    const longBody=cat?['wild','short','fold','bobtail'].includes(pet.shape):['corgi','retriever','wolf','malamute','beagle','dalmatian','collie','shepherd','spaniel','terrier','scottie','schnauzer','guard','giant','sausage','basset','sighthound','borzoi','dane','weimaraner','setter','serpent','afghan'].includes(pet.shape);
    const bx=longBody?46:42,by=Math.min(longBody?59:60,75-bodyRy);
    const fluffy=cat?['fluffy','forest','longhair'].includes(pet.shape):['pom','cloud','chow','giant','flatfluff','sheepdog','malamute'].includes(pet.shape);
    const eyeY=cy,eyeGap=Math.round(rx*.43),headTop=cy-ry;
    const d=pet.detail;

    // All tails and wings attach behind the animal's hips and shoulders.
    if(tail==='many'||d==='nine-tails'){
      for(let i=0;i<7;i++){
        const x=10+i*10,y=44+Math.abs(3-i)*2;
        curve([[bx,by+4],[x,72],[x-4,47],[x,y]],8,i%2?cream:coat,5);
        ellipse(x,y,3,4,i%2?'#bcdccc':'#d6cae9');
      }
    }else if(tail==='bob')ellipse(bx-bodyRx-3,by+3,4,4,coat);
    else if(longBody)curve([[bx+bodyRx-3,by],[72,59],[74,42],[68,46]],7,coat,3);
    else if(cat||tail==='curly'){
      curve([[bx-bodyRx+3,by+5],[8,70],[11,40],[19,47]],8,coat,5);
      curve([[bx-bodyRx+2,by+4],[11,66],[14,44],[19,47]],2,cream,1);
    }else{
      curve([[bx-bodyRx+3,by+3],[16,63],[13,49],[17,48]],fluffy?11:7,coat,4);
      if(tail==='pom')ellipse(17,48,5,5,cream);
      if(tail==='fluffy'||tail==='feather')ellipse(15,54,5,7,cream);
    }
    if(['angel','wings','halo','phoenix','dragon','bee','prism'].includes(d)){
      const wing=['dragon','phoenix'].includes(d)?shade:cream;
      for(const side of[-1,1]){
        const root=bx+side*9;
        for(let feather=0;feather<3;feather++)curve([[root,58],[root+side*12,56],[root+side*(15+feather*3),48],[root+side*(13+feather*3),42+feather*5]],6,wing,3);
      }
    }
    // Blocked torso, shaded haunches, and squared-off foreground paws.
    polygon([[cx-6,cy+ry-4],[cx+6,cy+ry-4],[bx+9,by],[bx-9,by]],coat);
    facet(bx,by,bodyRx,bodyRy,coat);
    facet(bx+2,by+4,bodyRx-2,bodyRy-4,shade);
    facet(bx,by-2,bodyRx-3,bodyRy-3,coat);
    const low=['corgi','pug','bulldog','sausage','basset','flatfluff','short','fold'].includes(pet.shape);
    const feetY=73,front1=longBody?35:bx-8,front2=longBody?62:bx+8;
    for(const x of[front1,front2]){
      box(x-(cat?3:4),low?60:57,cat?6:8,feetY-(low?60:57),coat);
      facet(x,feetY,cat?4:5,3,cream);
      box(x-2,feetY,1,2,shade);box(x+1,feetY,1,2,shade);
    }
    if(longBody){ellipse(51,72,4,3,shade);box(50,62,3,10,shade);}
    polygon([[bx-6,by-bodyRy+3],[bx+6,by-bodyRy+3],[bx+8,by-1],[bx+4,by+6],[bx-4,by+6],[bx-8,by-1]],cream);
    if(d==='saddle'){ellipse(bx+7,by-5,bodyRx-5,5,shade);}
    if(fluffy){for(const side of[-1,1])for(let k=0;k<3;k++)ellipse(bx+side*(bodyRx-1),by-5+k*4,3,3,coat);}
    if(!cat&&pet.shape==='poodle')for(const x of[front1,front2])ellipse(x,70,6,5,coat);

    function dogEars(x,y,r,type){
      if(['point','tall','small','tip'].includes(type)){
        const h=type==='small'?8:type==='tall'?16:12;
        for(const side of[-1,1]){
          const ex=x+side*(r-7);
          polygon([[ex-side*7,y-6],[ex+side*5,y-r-h+5],[ex+side*9,y-4]],coat);
          polygon([[ex-side*2,y-11],[ex+side*4,y-r-h+10],[ex+side*5,y-6]],pink);
          if(type==='tip')ellipse(ex+side*5,y-r-h+10,3,4,shade);
        }
      }else if(['wide','bat','butterfly'].includes(type)){
        for(const side of[-1,1]){
          const ex=x+side*(r-1);
          facet(ex,y-11,type==='bat'?8:9,type==='butterfly'?13:12,coat);
          facet(ex+side,y-12,4,7,type==='butterfly'?shade:pink);
          if(type==='butterfly')box(ex-side*2,y-13,2,7,cream);
        }
      }else if(type==='fold'){
        for(const side of[-1,1]){facet(x+side*(r-4),y-r+5,7,6,shade);facet(x+side*(r-4),y-r+3,5,4,coat);}
      }else{
        const length=type==='basset'?19:type==='long'?17:type==='silky'?18:14;
        for(const side of[-1,1]){
          const ex=x+side*(r-1);
          polygon([[ex-5,y-12],[ex+4,y-12],[ex+7,y+4],[ex+5,y+length],[ex-3,y+length],[ex-7,y+7]],shade);
          polygon([[ex-4,y-11],[ex+3,y-11],[ex+5,y+5],[ex+3,y+length-2],[ex-2,y+length-2],[ex-5,y+6]],coat);
          curve([[ex-side*2,y-7],[ex-side*4,y+1],[ex-side*3,y+10],[ex-side*2,y+length-3]],2,cream,1);
          if(type==='poof')for(let i=0;i<4;i++)ellipse(ex+(i%2?2:-2),y-5+i*5,6,5,coat);
        }
      }
    }
    function catEars(x,y,r){
      if(ear==='fold-cat'){
        facet(x-r+4,y-ry+4,7,5,shade);facet(x+r-4,y-ry+4,7,5,shade);
        facet(x-r+4,y-ry+2,6,4,coat);facet(x+r-4,y-ry+2,6,4,coat);return;
      }
      const tall=['oriental','rex','bald'].includes(pet.shape),height=tall?15:11;
      for(const side of[-1,1]){
        const ex=x+side*(r-7);
        polygon([[ex-side*7,y-9],[ex+side*5,headTop-height+3],[ex+side*8,y-8]],coat);
        polygon([[ex-side*1,y-13],[ex+side*4,headTop-height+8],[ex+side*4,y-9]],pink);
        if(pet.shape==='forest')box(ex+side*5,headTop-height+1,1,4,shade);
      }
    }
    if(!cat&&pet.shape==='cerberus'){
      for(const x of[17,65]){
        facet(x,48,9,9,coat);polygon([[x-7,44],[x-8,35],[x-1,40]],coat);polygon([[x+1,40],[x+8,35],[x+7,44]],coat);
        box(x-5,47,3,2,ink);box(x+2,47,3,2,ink);
        facet(x,53,5,3,cream);box(x-1,51,3,2,nose);box(x,54,1,2,nose);
      }
    }
    if(cat)catEars(cx,cy,rx);else dogEars(cx,cy,rx,ear);
    // Flat forehead, stepped cheek planes, and small angular fur tufts.
    facet(cx,cy,rx,ry,coat);
    facet(cx+1,cy+4,rx-2,ry-4,shade);
    facet(cx,cy-2,rx-1,ry-2,coat);
    if(fluffy){for(const side of[-1,1])for(let i=0;i<3;i++)polygon([[cx+side*(rx-2),cy+i*3],[cx+side*(rx+3),cy+2+i*3],[cx+side*(rx-1),cy+5+i*3]],coat);}
    if(['blaze','tuxedo','butterfly','bicolor'].includes(d)){
      polygon([[cx-2,headTop+2],[cx+2,headTop+2],[cx+4,cy+2],[cx+9,cy+12],[cx-9,cy+12],[cx-4,cy+2]],cream);
    }
    if(['mask','husky','points','bicolor'].includes(d)||pet.shape==='guard'){
      if(cat){ellipse(cx,cy+2,rx-4,ry-3,shade);if(d==='bicolor')polygon([[cx,headTop+4],[cx+9,cy+12],[cx-9,cy+12]],cream);}
      else if(d==='husky'){
        ellipse(cx,cy-5,rx-3,ry-5,shade);
        polygon([[cx-15,cy-6],[cx-3,cy-3],[cx-4,cy+11],[cx-15,cy+7]],cream);
        polygon([[cx+15,cy-6],[cx+3,cy-3],[cx+4,cy+11],[cx+15,cy+7]],cream);box(cx-1,headTop+3,3,18,cream);
      }else ellipse(cx,cy+6,rx-5,ry-7,shade);
    }
    if(d==='eyepatch')ellipse(cx-eyeGap,eyeY-1,6,7,shade);
    if(d==='patches'){ellipse(cx-rx+7,headTop+5,6,5,'#bd8e70');ellipse(cx+eyeGap+2,eyeY-3,6,7,shade);}
    if(['tabby','ticked','rosettes','urajiro'].includes(d)){
      for(let i=-1;i<=1;i++){box(cx+i*5-1,headTop+3+Math.abs(i)*2,2,4,shade);}
      if(cat){box(cx-rx+2,cy+5,4,1,shade);box(cx+rx-5,cy+5,4,1,shade);}
    }
    if(['tanpoints','spectacles'].includes(d)){
      ellipse(cx-eyeGap,eyeY-6,4,2,cream);ellipse(cx+eyeGap,eyeY-6,4,2,cream);
    }
    if(d==='wrinkles'||pet.shape==='pug'){
      box(cx-6,headTop+5,12,1,shade);box(cx-4,headTop+8,8,1,shade);
      if(cat)box(bx-3,by-3,6,1,shade);
    }
    if(pet.shape==='poodle'||!cat&&pet.name==='Bichon Frise'){
      for(const[x,y,r]of[[cx-9,headTop+1,7],[cx,headTop-2,9],[cx+9,headTop+2,7]])ellipse(x,y,r,r,coat);
      box(cx-6,headTop-3,5,1,cream);box(cx+2,headTop-5,3,1,cream);
    }
    // Controlled coat texture is clipped to fur and never placed over a face.
    for(let i=0;i<12;i++){
      const x=Math.round(bx-bodyRx+4+random()*(bodyRx*2-8)),y=53+Math.floor(random()*15);
      furPixel(x,y,i%3===0?cream:shade,1+i%2,1);
    }
    if(['spots','flecks','merle','rosettes','cookie'].includes(d)){
      for(let i=0;i<22;i++){
        const x=Math.round(bx-bodyRx+3+random()*(bodyRx*2-6)),y=51+Math.floor(random()*19);
        if(grid[y]?.[x]!==coat)continue;
        const color=d==='spots'?ink:shade;
        box(x,y,d==='flecks'?1:3,d==='flecks'?1:2,color);
        if(d==='rosettes')box(x+1,y,1,1,coat);
      }
      if(!cat&&d==='spots'){ellipse(cx-rx+5,cy-7,3,3,ink);ellipse(cx+rx-3,cy+3,2,3,ink);}
    }
    if(['scruff','silk','fluff','curls','feather','waves','ruff'].includes(d)||fluffy){
      for(let i=0;i<10;i++){const x=Math.round(cx-rx+5+random()*(rx*2-10)),y=headTop+4+Math.floor(random()*7);furPixel(x,y,i%2?cream:shade,1,2);}
    }
    // Stepped muzzles, restrained expressions, and breed-specific facial detail.
    if(!cat){
      const flat=['pug','bulldog','boxer','flatfluff'].includes(pet.shape);
      const longFace=['sighthound','borzoi','afghan','dane','weimaraner','collie','guard','shepherd'].includes(pet.shape);
      const muzzle=flat?shade:cream;
      facet(cx,cy+(longFace?10:8),flat?9:longFace?7:10,flat?5:longFace?8:6,muzzle);
      if(flat){box(cx-7,cy+9,5,3,cream);box(cx+2,cy+9,5,3,cream);}
      if(['scottie','schnauzer','terrier'].includes(pet.shape)){
        facet(cx,cy+11,10,5,cream);box(cx-5,cy+11,1,4,shade);box(cx+5,cy+12,1,3,shade);
      }
      const snoutY=cy+(longFace?9:5);
      box(cx-3,snoutY,6,3,nose);box(cx-2,snoutY+3,4,1,nose);
      box(cx,snoutY+4,1,3,ink);box(cx-3,snoutY+7,7,1,ink);
    }else{
      facet(cx,cy+8,7,4,cream);
      polygon([[cx-2,cy+6],[cx+3,cy+6],[cx,cy+9]],pink);
      box(cx,cy+9,1,2,nose);box(cx-3,cy+11,3,1,nose);box(cx+1,cy+11,3,1,nose);
      for(const side of[-1,1])for(let row=0;row<2;row++)overlays.push([cx+side*(rx+1)-(side<0?5:0),cy+6+row*3,5,1,shade]);
    }
    for(const side of[-1,1]){
      const ex=cx+side*eyeGap;
      if(cat){
        polygon([[ex-4,eyeY],[ex-2,eyeY-3],[ex+2,eyeY-3],[ex+4,eyeY],[ex+2,eyeY+3],[ex-2,eyeY+3]],ink);
        box(ex-2,eyeY-2,4,4,['points','bicolor'].includes(d)?'#7893a1':'#85917b');
        box(ex,eyeY-2,1,4,ink);
      }else{
        box(ex-2,eyeY-2,5,4,ink);
        box(ex+1,eyeY,1,2,d==='husky'?'#7e9aa8':'#846b53');
      }
    }
    if(['schnauzer','scottie'].includes(pet.shape)){ellipse(cx-eyeGap,eyeY-6,5,1,cream);ellipse(cx+eyeGap,eyeY-6,5,1,cream);}
    if(pet.shape==='sheepdog'){box(cx-4,headTop+3,2,8,cream);box(cx+2,headTop+4,2,7,cream);}
    if(pet.shape==='crested'){for(let i=0;i<3;i++)curve([[cx-3+i*3,headTop+3],[cx-5+i*3,headTop-2],[cx-4+i*3,headTop-5],[cx-2+i*3,headTop-7]],2,cream,1);}

    // Accessories are anchored to the head/body landmarks, away from eyes and paws.
    if(d==='barrel'){
      ellipse(bx,by-1,9,5,'#bd986a');box(bx-8,by-4,16,7,'#c9a677');box(bx-6,by-5,2,9,'#818993');box(bx+4,by-5,2,9,'#818993');box(bx-1,by-4,1,7,'#a78157');
    }
    if(['moon','lunar','sun'].includes(d)){ellipse(cx,headTop-7,5,5,gold);if(d!=='sun')ellipse(cx+3,headTop-9,4,4,null);}
    if(['halo','angel'].includes(d))ring(cx,headTop-6,10,3,gold,1);
    if(['crown','angel'].includes(d)){
      polygon([[cx-10,headTop],[cx-11,headTop-7],[cx-5,headTop-4],[cx,headTop-11],[cx+5,headTop-4],[cx+11,headTop-7],[cx+10,headTop]],gold);
      box(cx-9,headTop,18,2,'#b79a62');box(cx-1,headTop-4,3,3,'#dca7ae');
    }
    if(d==='wizard'){
      polygon([[cx-12,headTop],[cx-2,headTop-17],[cx+5,headTop-13],[cx+10,headTop]],'#a193c3');box(cx-15,headTop,30,3,'#cabade');star(cx-1,headTop-7,gold);
    }
    if(d==='sushi'){box(cx-10,headTop-4,20,7,cream);box(cx-9,headTop-7,18,5,'#dba398');box(cx-2,headTop-7,5,10,'#658675');box(cx-7,headTop-5,4,1,'#f8d3ba');}
    if(['flowers','leaves','berry','tea'].includes(d)){
      for(let i=0;i<3;i++){
        const x=cx-9+i*9;
        ellipse(x,headTop,3,2,d==='flowers'?'#e2b5ca':'#9ab68d');if(d==='flowers')box(x,headTop,1,1,gold);
      }
      if(d==='berry'){ellipse(bx+bodyRx-1,by,4,5,'#d99da7');box(bx+bodyRx-2,by-3,3,1,'#9ab68d');box(bx+bodyRx,by,1,1,cream);}
      if(d==='tea'){box(bx+10,by-1,9,8,cream);box(bx+11,by-1,7,2,'#9aaf82');curve([[bx+19,by],[bx+24,by-2],[bx+24,by+5],[bx+19,by+5]],2,cream,2);}
    }
    if(d==='pumpkin'){ellipse(cx,headTop-1,9,5,'#e0ab70');box(cx-1,headTop-8,3,4,'#89a580');box(cx-4,headTop-4,1,5,'#bf8c55');box(cx+4,headTop-4,1,5,'#bf8c55');}
    if(d==='pirate'){ellipse(cx,headTop-2,12,5,ink);box(cx-14,headTop+1,28,2,gold);box(cx-2,headTop-4,4,3,cream);}
    if(['clockwork','chrono'].includes(d)){
      for(const ex of[cx-eyeGap,cx+eyeGap]){
        // Goggles rest on the forehead instead of obscuring the pet's eyes.
        ring(ex,headTop+3,5,3,gold,1);
      }
      box(cx-eyeGap+5,headTop+2,eyeGap*2-10,1,shade);
      ellipse(bx,by+1,5,5,gold);ellipse(bx,by+1,3,3,cream);box(bx,by-2,1,4,shade);box(bx,by+1,3,1,shade);
    }
    if(d==='armor'){ellipse(bx-10,by-7,6,4,'#a7b7c5');ellipse(bx+10,by-7,6,4,'#a7b7c5');box(bx-4,by-4,9,8,'#d2dbe1');star(bx,by,gold);}
    if(['antlers','dragon'].includes(d)){
      for(const side of[-1,1]){const x=cx+side*(rx-8);curve([[x,headTop+1],[x+side*3,headTop-3],[x+side*3,headTop-8],[x+side,headTop-11]],2,shade,1);box(x+side*3-(side<0?3:0),headTop-6,4,1,cream);}
    }
    if(['flame','phoenix'].includes(d)){
      polygon([[13,61],[8,54],[13,56],[14,46],[18,53],[22,51],[20,62]],'#e5ab7f');polygon([[14,60],[14,54],[17,57],[19,54],[18,61]],gold);
    }
    if(d==='bee'){box(bx-bodyRx+3,by-4,bodyRx*2-6,3,shade);box(bx-bodyRx+4,by+2,bodyRx*2-8,3,shade);}
    if(d==='ice'||d==='crystal'){for(const[x,y]of[[12,61],[68,61]])polygon([[x,y-8],[x+4,y-2],[x+1,y+4],[x-3,y]],'#b5dde4');star(66,20,cream);}
    if(['stars','astral','lunar','singularity','void','saber'].includes(d)){star(12,25,cream);star(67,21,gold);star(66,61,cream);}
    if(d==='saber'){box(cx-4,cy+11,2,4,cream);box(cx+4,cy+11,2,4,cream);}
    if(['prism','aurora','wings'].includes(d)){
      ['#dab5d1','#c6c1e3','#add3dc','#bedfc4'].forEach((color,i)=>{ellipse(16+i*2,53+i*3,2,4,color);ellipse(67-i*2,53+i*3,2,4,color);});star(65,17,cream);
    }
    if(['glitch','neon'].includes(d)||pet.shape==='robot'){
      // Small tech accents preserve a normal puppy/kitten face.
      box(bx-4,by-3,8,5,'#6c9687');box(bx-2,by-2,4,2,'#d9f4bf');box(12,26,4,1,'#b5e0bd');box(65,47,4,1,'#b5e0bd');
      ellipse(cx-rx+2,cy-7,2,2,'#a6cdbd');ellipse(cx+rx-2,cy-7,2,2,'#a6cdbd');
    }
    if(['origami','folds'].includes(d)){
      // Paper-fold shading, rather than an abstract polygon animal.
      polygon([[bx+2,by-7],[bx+11,by-3],[bx+3,by+4]],cream);box(bx+4,by-1,3,3,'#cf9d9f');
      polygon([[cx+rx-8,headTop+5],[cx+rx-1,cy-7],[cx+rx-7,cy-1]],cream);star(66,24,gold);
    }
    if(d==='bubbles'||d==='pearls'||d==='cloud'){
      for(const[x,y,r]of[[13,25,3],[66,26,4],[67,56,3]]){
        if(d==='bubbles')ring(x,y,r,r,cream,1);else ellipse(x,y,r,r,cream);
      }
      if(d==='pearls')for(let i=0;i<6;i++)ellipse(bx-7+i*3,by-8,1,1,cream);
    }
    return finishArt();

    function finishArt() {
    // A one-pixel warm outline follows the pixel illustration.
    const outlined=grid.map(row=>[...row]);
    const outline=['black','void'].includes(pet.palette)?'#5c5369':'#76646a';
    for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!grid[y][x]&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>grid[b]?.[a]))outlined[y][x]=outline;
    for(const[x,y,w,h,color]of overlays)for(let b=Math.max(0,y);b<Math.min(size,y+h);b++)for(let a=Math.max(0,x);a<Math.min(size,x+w);a++)outlined[b][a]=color;
    let rectangles='';
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const color=outlined[y][x];if(!color)continue;let run=1;while(x+run<size&&outlined[y][x+run]===color)run++;
      rectangles+=`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${color}"/>`;x+=run-1;
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="Pixel art of ${escape(pet.name)}" shape-rendering="crispEdges">${rectangles}</svg>`;
    cache.set(key,svg);return svg;
    }
  }
  globalThis.PetSpriteArt=Object.freeze({makePetSVG});
})();
