/* Individually composed 80px pixel illustrations for the two highest tiers. */
(() => {
  'use strict';
  function draw(pet,species,p) {
    const {box,ellipse,polygon,facet,curve,star,ring}=p;
    const cat=species==='cats',ink='#252432',gold='#d0b16e',ivory='#eee5cf';
    const violet='#8e79b7',deep='#423952',cyan='#a2d4d8',blue='#597e9e';
    const line=(a,b,width,color)=>curve([a,a,b,b],width,color,width);
    const gem=(x,y,r,color)=>{polygon([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],color);box(x,y-r+2,1,Math.max(1,r-2),ivory);};
    function rune(x,y,color,variant=0) {
      const shapes=[[[0,0],[3,2],[0,4],[0,0],[3,0]],[[0,4],[0,0],[3,4],[3,0]],[[0,0],[3,0],[0,4],[3,4]],[[0,0],[3,2],[0,4],[3,4]]];
      const points=shapes[variant%4];for(let i=1;i<points.length;i++)line([x+points[i-1][0],y+points[i-1][1]],[x+points[i][0],y+points[i][1]],1,color);
    }
    function seal(x,y,r,color,dark=deep,ticks=12) {
      ring(x,y,r,r,color,1);ring(x,y,r-3,r-3,dark,1);
      for(let i=0;i<ticks;i++){const a=i/ticks*Math.PI*2;line([x+Math.cos(a)*(r-2),y+Math.sin(a)*(r-2)],[x+Math.cos(a)*(r-5),y+Math.sin(a)*(r-5)],1,color);}
    }
    function gear(x,y,r,color,dark) {
      const points=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2,rad=i%4<2?r:r-2;points.push([Math.round(x+Math.cos(a)*rad),Math.round(y+Math.sin(a)*rad)]);}
      polygon(points,color);ellipse(x,y,r-4,r-4,dark);ellipse(x,y,2,2,color);
      for(let i=0;i<4;i++){const a=i/2*Math.PI;line([x+Math.cos(a)*3,y+Math.sin(a)*3],[x+Math.cos(a)*(r-3),y+Math.sin(a)*(r-3)],1,color);}
    }
    function feathers(x,y,side,span,lift,base=ivory,shadow='#afa9bb') {
      for(let i=4;i>=0;i--){
        const tipX=x+side*(span-i*3),tipY=y-lift+i*7;
        polygon([[x,y+5],[x+side*7,y-9],[tipX,tipY],[tipX-side*2,tipY+10],[x+side*(10+i),y+10]],shadow);
        polygon([[x,y],[x+side*7,y-9],[tipX,tipY],[tipX-side*3,tipY+7],[x+side*8,y+5]],base);
        line([x+side*5,y],[tipX-side*3,tipY+6],1,shadow);
      }
    }
    function crown(x,y,width=9) {
      polygon([[x-width,y+3],[x-width-1,y-5],[x-4,y-2],[x,y-9],[x+4,y-2],[x+width+1,y-5],[x+width,y+3]],gold);
      box(x-width,y+2,width*2,2,'#8f744a');gem(x,y-1,2,'#a56b87');
    }
    function leg(x,y,length,width,color,shadow,paw=ivory) {
      polygon([[x-width/2,y],[x+width/2,y],[x+width/2-1,y+length-3],[x+width/2+2,y+length],[x-width/2-2,y+length],[x-width/2,y+length-4]],color);
      box(x-width/2,y,2,length-2,shadow);box(x-width/2-1,y+length-2,width+2,3,paw);
      box(x-2,y+length-1,1,2,shadow);box(x+1,y+length-1,1,2,shadow);
    }
    function face(x,y,{feline=cat,w=11,h=11,color=ivory,shadow='#aca5b2',muzzle='#ded9ce',ears='point',eye=gold,profile=0,mane=false}={}) {
      if(mane){for(let i=0;i<12;i++){const a=i/12*Math.PI*2;polygon([[x+Math.cos(a)*11,y+Math.sin(a)*11],[x+Math.cos(a+.18)*18,y+Math.sin(a+.18)*18],[x+Math.cos(a+.4)*11,y+Math.sin(a+.4)*11]],shadow);}}
      for(const side of[-1,1]){
        if(ears==='drop'){
          polygon([[x+side*(w-3),y-h+2],[x+side*(w+5),y-h+5],[x+side*(w+5),y+9],[x+side*(w-1),y+12]],shadow);
          line([x+side*(w+2),y-h+7],[x+side*(w+2),y+6],2,color);
        }else{
          polygon([[x+side*3,y-h+4],[x+side*(w+1),y-h-9],[x+side*(w+1),y-2]],color);
          polygon([[x+side*6,y-h+3],[x+side*(w-1),y-h-4],[x+side*(w-2),y-3]],shadow);
        }
      }
      facet(x,y,w,h,color);polygon([[x-w+2,y+3],[x+w-1,y+3],[x+w-4,y+h],[x-w+4,y+h]],shadow);
      facet(x,y-2,w-1,h-3,color);
      if(profile){
        polygon([[x+profile*3,y+2],[x+profile*(w+8),y+4],[x+profile*(w+7),y+9],[x+profile*2,y+10]],muzzle);
        box(x+profile*(w+5)-1,y+3,3,3,ink);
        box(x+profile*3-2,y-1,5,2,ink);box(x+profile*3,y-1,2,1,eye);
        box(x+profile*(w+1)-2,y+8,4,1,ink);
        if(feline)for(let k=0;k<2;k++)line([x+profile*(w+1),y+6+k*3],[x+profile*(w+7),y+4+k*5],1,shadow);
      }else{
        facet(x,y+6,feline?6:8,4,muzzle);
        for(const side of[-1,1]){const ex=x+side*Math.max(4,Math.round(w*.45));box(ex-2,y-2,4,3,ink);box(ex,y-1,1,2,eye);}
        box(x-2,y+4,4,2,feline?'#a07a88':ink);box(x,y+6,1,3,ink);box(x-2,y+9,5,1,ink);
        if(feline)for(const side of[-1,1])for(let k=0;k<2;k++)line([x+side*(w-2),y+5+k*3],[x+side*(w+4),y+4+k*4],1,shadow);
      }
    }
    function beast({x=43,y=51,wide=22,high=12,hx=24,hy=31,headW=11,headH=12,color='#a7b7bd',shadow='#627185',muzzle=ivory,ears='point',feline=cat,profile=0,pose='stand',eye=gold,mane=false}={}) {
      if(pose==='sit'){
        polygon([[x-8,y-15],[x+8,y-15],[x+wide*.7,y+14],[x-wide*.7,y+14]],color);
        facet(x,y+8,wide,high,shadow);polygon([[x-6,y-10],[x+6,y-10],[x+8,y+15],[x-8,y+15]],muzzle);
        leg(x-7,y-1,20,6,color,shadow,muzzle);leg(x+7,y-1,20,6,color,shadow,muzzle);
      }else{
        leg(x-wide+5,y+3,17,5,shadow,ink,muzzle);leg(x+wide-5,y+3,17,5,shadow,ink,muzzle);
        facet(x,y,wide,high,color);polygon([[x-wide+4,y+3],[x+wide-2,y+2],[x+wide-5,y+high],[x-wide+8,y+high]],shadow);
        polygon([[hx-7,hy+7],[hx+8,hy+7],[x+8,y+7],[x-14,y+8]],color);
        leg(x-wide+1,y+6,17,7,color,shadow,muzzle);leg(x+wide-3,y+5,18,7,color,shadow,muzzle);
      }
      face(hx,hy,{feline,w:headW,h:headH,color,shadow,muzzle,ears,eye,profile,mane});
      return {x,y,hx,hy};
    }
    function stone(color='#454657',edge='#7a7992') {
      polygon([[12,71],[24,65],[58,65],[70,71],[61,76],[22,76]],color);
      line([13,71],[69,71],1,edge);for(let i=0;i<5;i++)rune(25+i*7,71,edge,i);
    }
    function stars(color=ivory) {for(const[x,y]of[[8,26],[68,15],[73,48],[14,57]])star(x,y,color);}

    if(pet.secret){
      switch(pet.name){
        case 'Void Cerberus': {
          seal(40,34,30,'#756494','#393342',16);stone();
          curve([[56,58],[73,60],[74,35],[68,31]],6,deep,2);
          beast({x:40,y:53,wide:23,high:14,hx:40,hy:26,headW:12,headH:12,color:'#5c5073',shadow:'#302b41',muzzle:'#b7a6ca',feline:false});
          face(17,38,{w:10,h:11,color:'#77658c',shadow:'#393144',muzzle:'#a894b5',feline:false});
          face(63,38,{w:10,h:11,color:'#554a6d',shadow:'#302b41',muzzle:'#a894b5',feline:false});
          for(const x of[17,40,63]){line([x-6,48],[x+6,48],2,gold);gem(x,49,2,'#aa7aab');}
          curve([[18,49],[24,64],[56,63],[63,49]],2,gold,2);gem(40,60,4,'#a88aca');
          for(const x of[12,68])polygon([[x,70],[x-4,59],[x,62],[x+2,54],[x+5,69]],violet);
          break;
        }
        case 'Pixel Glitch': {
          for(let i=0;i<12;i++){const x=5+(i*19)%68,y=10+(i*13)%57;box(x,y,3+i%3,2,i%2?'#5e8eb7':'#6faf92');}
          curve([[59,54],[75,44],[67,21],[76,19]],4,'#76ba9c',2);
          beast({x:46,y:49,wide:19,high:11,hx:25,hy:30,headW:12,headH:11,color:'#8eb7b0',shadow:'#405f6d',muzzle:'#cbdacb',ears:'point',feline:false,profile:-1});
          polygon([[33,34],[47,31],[58,42],[48,51],[35,47]],'#536f83');
          polygon([[35,37],[46,35],[54,42],[47,47],[38,45]],'#a7dcc1');
          box(40,39,9,5,ink);box(42,40,5,2,'#9cd9b8');
          for(const x of[29,59]){box(x,58,7,8,'#344653');box(x-1,64,9,3,'#99dcc2');}
          line([29,20],[29,9],2,'#6ab99e');box(25,8,8,3,'#bedbc3');
          box(10,31,15,2,'#82b4ba');box(45,51,29,2,'#74ad9d');
          for(let i=0;i<4;i++)box(13+i*13,74,8,1,'#577b79');break;
        }
        case 'Astral Leviapup': {
          seal(41,35,29,'#686581','#333448',9);stars('#c1badb');
          curve([[18,68],[91,79],[79,31],[37,48]],15,'#5d547e',8);
          curve([[18,68],[83,72],[78,40],[42,48]],6,'#b8accf',4);
          for(let i=0;i<7;i++){const x=24+i*7,y=67-Math.max(0,i-3)*4;polygon([[x,y],[x+3,y-10],[x+7,y-2]],'#8a8eb6');box(x,y-2,2,2,gold);}
          polygon([[14,68],[5,56],[17,59],[17,48],[27,61]],'#8f93be');
          curve([[45,49],[32,50],[30,38],[32,29]],17,'#9287b4',12);
          face(32,26,{w:12,h:12,color:'#aaa1cb',shadow:'#5b5279',muzzle:'#d9d0e4',feline:false,profile:-1});
          leg(36,47,19,7,'#9489b9','#5d547e','#ded8e6');leg(53,49,17,7,'#79729b','#514b70','#ccc5dc');
          line([23,34],[9,41],1,gold);line([25,36],[12,47],1,gold);gem(32,13,3,gold);break;
        }
        case 'The Goodest One': {
          seal(40,29,24,gold,'#766545',16);
          for(const side of[-1,1]){feathers(40+side*8,39,side,29,28,ivory,'#b5a784');feathers(40+side*9,50,side,28,15,'#d9cda8','#9d8b66');feathers(40+side*8,59,side,23,2,'#f0e5c9','#b8a373');}
          stone('#a69a7a','#dfcf98');
          beast({x:40,y:51,wide:15,high:12,hx:40,hy:31,headW:12,headH:12,color:'#ede5cb',shadow:'#bdab7c',muzzle:'#f7efdc',ears:'drop',feline:false,pose:'sit'});
          crown(40,17,9);polygon([[29,48],[40,53],[51,48],[47,58],[33,58]],gold);gem(40,53,3,'#9e8eae');
          for(const x of[16,64])star(x,21,ivory);break;
        }
        case 'Singularity Shiba': {
          ellipse(29,29,23,23,'#534360');ellipse(29,29,18,18,'#272431');
          curve([[4,34],[20,12],[53,45],[69,18]],3,'#b18baf',1);curve([[4,37],[24,52],[44,9],[68,23]],2,'#6c698a',1);
          polygon([[22,72],[33,64],[60,65],[66,73],[48,78],[32,76]],'#4d475b');line([25,72],[62,73],1,violet);
          curve([[51,54],[21,65],[17,48],[27,46]],8,'#51465d',4);
          beast({x:46,y:52,wide:17,high:10,hx:51,hy:32,headW:11,headH:12,color:'#63546f',shadow:'#322f43',muzzle:'#b1a0ba',feline:false,profile:1});
          polygon([[34,40],[43,33],[47,46],[39,54]],'#9680a8');
          for(const[x,y]of[[12,58],[71,46],[61,10],[13,13]])gem(x,y,2,'#ae8fb8');
          line([51,21],[55,27],1,'#d2abc2');break;
        }
        case 'Chrono Canine': {
          seal(40,33,29,gold,'#74644b',12);for(let i=0;i<4;i++)rune(13+i*17,30,gold,i);
          gear(19,55,10,'#b79a61','#4e4b46');gear(64,53,11,'#baa272','#4e4b46');
          beast({x:41,y:51,wide:22,high:15,hx:39,hy:29,headW:14,headH:13,color:'#b59a72',shadow:'#695c50',muzzle:'#e1cfaa',ears:'drop',feline:false});
          polygon([[25,42],[38,46],[54,42],[59,54],[49,61],[31,58]],'#6f716d');
          gear(41,52,10,'#e1c387','#55545a');line([41,52],[41,46],1,ivory);line([41,52],[46,54],1,ivory);
          for(const x of[25,57]){box(x,62,8,8,'#d1b47d');box(x,64,8,2,'#80705b');}
          polygon([[32,15],[39,8],[46,15],[42,20],[36,20]],gold);gem(39,15,3,'#72999c');break;
        }
        case 'Aurora Kitsune': {
          const tips=[[7,28],[10,13],[23,7],[38,5],[53,6],[68,14],[74,30],[72,48],[9,49]],colors=['#cc9aab','#b29ec7','#8ba9cc','#87c1c4','#a8c9b1'];
          tips.forEach(([x,y],i)=>{curve([[41,64],[x+(x<40?-7:7),68],[x,y+17],[x,y]],9,'#57788c',3);curve([[41,63],[x,64],[x,y+14],[x,y]],6,colors[i%5],2);line([x,y+1],[x,y+7],1,ivory);});
          beast({x:40,y:53,wide:12,high:11,hx:40,hy:34,headW:10,headH:12,color:'#dae6e1',shadow:'#84aab7',muzzle:'#f1ece0',feline:false,pose:'sit'});
          for(const side of[-1,1])polygon([[40+side*3,31],[40+side*12,33],[40+side*6,39]],'#a27f99');
          gem(40,24,2,gold);line([30,47],[50,47],2,'#a87f9d');gem(40,49,3,gold);break;
        }
        case 'Origami Oracle': {
          polygon([[35,44],[8,30],[5,13],[32,26],[39,19],[48,45]],'#d8d0d0');
          polygon([[43,44],[64,13],[75,8],[68,35],[73,45],[49,58]],'#efeadb');
          polygon([[6,14],[28,31],[35,44],[17,35]],'#a7a6ba');polygon([[65,15],[53,43],[73,44]],'#b8a5b1');
          polygon([[30,39],[51,35],[65,56],[47,64],[28,57]],'#e8e4d8');polygon([[31,40],[50,46],[47,64],[28,57]],'#b8bac5');
          polygon([[47,44],[61,49],[47,61]],'#d1a3aa');
          for(const[x,y]of[[29,53],[46,57],[58,54]])polygon([[x,y],[x+6,y+2],[x+3,73],[x-3,73]],ivory);
          polygon([[21,26],[22,9],[32,23],[42,18],[38,43],[21,45],[10,36]],'#f1ede2');
          polygon([[22,10],[29,27],[21,34]],'#aaaabc');polygon([[29,28],[38,23],[34,42],[21,44]],'#c3b2bd');
          polygon([[11,35],[24,33],[28,42],[15,40]],ivory);box(11,35,3,3,ink);box(24,29,3,2,ink);
          polygon([[62,52],[72,33],[75,50],[65,61]],'#ded4d2');
          for(const[x,y]of[[10,58],[68,64]]){polygon([[x-4,y],[x,y-5],[x+5,y],[x,y+3]],gold);line([x,y-5],[x,y+3],1,ivory);}break;
        }
        case 'Nine Lives Oracle': {
          seal(40,36,31,'#8673aa','#4b435e',9);
          for(let i=0;i<9;i++){const a=(-160+i*40)/180*Math.PI,x=Math.round(40+Math.cos(a)*30),y=Math.round(36+Math.sin(a)*29);facet(x,y,4,4,'#bba6ce');polygon([[x-4,y-1],[x-4,y-6],[x,y-3],[x+4,y-6],[x+4,y]],'#c8b6d8');box(x-2,y,1,1,deep);box(x+1,y,1,1,deep);line([x,y+5],[x+(i%2?2:-2),y+10],1,gold);}
          polygon([[28,34],[51,34],[63,68],[40,74],[18,68]],'#62527e');
          for(let i=0;i<5;i++)line([23+i*8,65],[30+i*5,47],1,'#8b75a5');
          beast({x:40,y:53,wide:13,high:12,hx:40,hy:32,headW:11,headH:12,color:'#b1a5c8',shadow:'#746687',muzzle:'#e3dce7',feline:true,pose:'sit'});
          polygon([[31,46],[40,52],[49,46],[46,59],[34,59]],gold);gem(40,53,3,'#8b73ac');gem(40,23,2,gold);break;
        }
        case 'Void Panther': {
          ellipse(58,24,17,17,'#65527b');ellipse(60,22,13,13,'#222532');
          curve([[60,51],[82,51],[72,15],[51,14]],5,'#6a5a80',2);
          stone('#373744','#6e6681');
          beast({x:44,y:50,wide:24,high:11,hx:20,hy:40,headW:11,headH:10,color:'#50455f',shadow:'#292c3c',muzzle:'#81758e',feline:true,profile:-1,eye:'#b5a074'});
          polygon([[29,38],[43,37],[64,46],[39,48]],'#685978');
          for(const[x,y]of[[32,44],[40,40],[48,46],[56,43],[60,53]]){box(x,y,1,1,ivory);if(x<56)line([x,y],[x+7,y-3],1,'#89759b');}
          for(const x of[19,64]){box(x,71,2,3,ivory);box(x+3,71,2,3,ivory);}break;
        }
        case 'Glitch Kitten': {
          for(let i=0;i<11;i++){const x=7+(i*17)%66,y=10+(i*11)%61;box(x,y,6,2,i%2?'#6e9eaa':'#88be9c');if(i%3===0)box(x+3,y-3,3,3,'#47586a');}
          curve([[51,57],[83,62],[71,28],[60,28]],4,'#83c0a9',2);
          polygon([[28,39],[52,39],[56,56],[43,64],[26,56]],'#71999d');
          polygon([[28,41],[42,47],[52,41],[49,58],[35,58]],'#b4d8c5');
          box(35,48,14,9,'#2c424e');rune(39,50,'#a4d9ac',1);
          for(const side of[-1,1]){const x=40+side*19;facet(x,48,4,8,'#89b7b1');box(x-3,61,7,6,'#b7d9c4');box(x-3,53,7,2,'#354858');}
          face(40,27,{w:12,h:10,color:'#aed3bf',shadow:'#588591',muzzle:'#d5e6d6',feline:true});
          polygon([[27,19],[23,12],[32,15],[34,23]],'#6ca3ae');box(48,29,15,2,'#9bc9b7');box(19,34,18,2,'#54808e');
          for(const x of[31,46])box(x,70,6,2,'#7ab69e');break;
        }
        case 'The Purrfect One': {
          polygon([[17,70],[17,33],[24,15],[40,7],[56,15],[63,33],[63,70]],'#8c7852');
          polygon([[21,65],[21,34],[27,20],[40,13],[53,20],[59,34],[59,65]],'#45434a');
          for(const side of[-1,1])feathers(40+side*9,46,side,28,24,'#e1d3a7','#a18a57');
          stone('#c3b185','#f1e5bf');
          beast({x:40,y:53,wide:18,high:12,hx:40,hy:32,headW:12,headH:11,color:'#d7ba7c',shadow:'#92734d',muzzle:'#f3e7c6',feline:true,pose:'sit',mane:true});
          crown(40,14,10);polygon([[29,48],[40,52],[51,48],[47,59],[33,59]],'#dfca96');gem(40,54,4,'#8578a5');
          for(const x of[13,67]){box(x-3,59,6,13,gold);gem(x,57,3,ivory);}break;
        }
        case 'Astral Saber': {
          curve([[24,45],[4,27],[16,9],[40,10]],4,blue,2);
          for(const[x,y,r]of[[12,54,9],[26,68,6],[69,57,8],[56,13,6]])polygon([[x,y-r],[x+4,y],[x,y+r],[x-4,y]],cyan);
          polygon([[15,38],[31,32],[52,37],[58,49],[44,56],[24,50]],'#8bb9c6');
          polygon([[24,43],[47,43],[51,51],[37,57],[21,50]],'#527892');
          for(let i=0;i<4;i++)polygon([[25+i*6,35],[28+i*6,35],[25+i*6,47]],'#4b6985');
          line([24,48],[12,62],7,'#6c94ac');line([34,49],[29,68],6,'#b3d6d5');
          line([51,43],[66,61],7,'#99c5ce');line([46,47],[52,68],6,'#709bab');
          face(56,29,{w:10,h:10,color:'#b3d8da',shadow:'#678ca6',muzzle:'#e0e5de',feline:true,profile:1});
          polygon([[64,37],[67,37],[65,48],[62,41]],ivory);polygon([[69,36],[72,36],[70,45],[68,40]],ivory);
          stars('#bcd8df');break;
        }
        case 'Chrono Cheshire': {
          seal(39,37,30,'#98835d','#57525a',12);
          curve([[52,60],[78,65],[73,28],[58,40]],6,'#a38d67',2);gear(64,39,8,gold,'#494751');
          facet(40,49,14,16,'#a28b76');box(25,46,30,3,null);box(30,58,24,2,null);
          ellipse(40,48,10,10,'#d7c194');ellipse(40,48,8,8,'#4b4954');
          for(let i=0;i<8;i++){const a=i/4*Math.PI;box(40+Math.round(Math.cos(a)*6),48+Math.round(Math.sin(a)*6),1,1,gold);}
          line([40,48],[40,42],1,ivory);line([40,48],[45,50],1,ivory);
          facet(26,58,5,3,'#bba185');facet(54,39,5,3,'#bba185');facet(35,70,5,3,'#c4ad8e');facet(49,66,5,3,'#c4ad8e');
          face(40,25,{w:13,h:11,color:'#b8a18c',shadow:'#746175',muzzle:'#d7c4ac',feline:true});
          box(32,31,17,4,'#dfd5bc');for(let x=34;x<48;x+=3)box(x,31,1,3,'#655365');
          gem(40,13,2,gold);break;
        }
        case 'Origami Omen': {
          polygon([[42,44],[7,18],[20,10],[44,25],[56,12],[61,39]],'#c5c5cf');
          polygon([[9,18],[38,32],[43,43],[13,32]],'#ede7df');polygon([[22,12],[42,27],[54,14],[42,38]],'#9a9eaf');
          polygon([[29,41],[49,38],[62,53],[48,62],[25,56]],'#ece8de');polygon([[30,43],[43,51],[48,62],[25,56]],'#a5a9b8');
          polygon([[31,54],[37,55],[32,73],[26,73]],ivory);polygon([[53,53],[59,53],[64,69],[56,70]],'#ccc7cb');
          polygon([[47,28],[47,11],[56,22],[67,17],[64,39],[52,44],[43,36]],'#f2ece1');
          polygon([[49,13],[54,27],[47,31]],'#a4a8bb');polygon([[56,26],[65,20],[62,38],[53,42]],'#c6abb6');
          box(58,29,3,2,ink);polygon([[62,33],[72,35],[67,40],[59,39]],ivory);box(69,35,3,2,ink);
          polygon([[28,51],[13,47],[8,36],[8,61],[23,63]],'#d5c8cc');line([10,48],[23,59],1,'#8f8ba1');
          for(const[x,y]of[[13,68],[68,58]]){polygon([[x,y-6],[x+3,y],[x,y+7],[x-3,y]],'#b47e86');box(x,y-3,1,5,ivory);}break;
        }
        case 'Aurora Lynx': {
          for(let i=0;i<4;i++)curve([[5,28+i*4],[24,2+i*5],[55,17+i*4],[75,9+i*6]],3,['#739baf','#85b5b3','#a6b6b9','#aa96b9'][i],2);
          stone('#5c7388','#b4d2d7');
          curve([[61,50],[80,55],[72,35],[64,42]],5,'#789aaf',2);
          beast({x:45,y:51,wide:21,high:12,hx:29,hy:31,headW:12,headH:12,color:'#afced1',shadow:'#688a9d',muzzle:'#dfe8df',feline:true});
          for(const side of[-1,1]){line([29+side*12,15],[29+side*15,6],2,'#4b6c83');polygon([[29+side*8,38],[29+side*17,43],[29+side*9,47]],'#91b7c7');}
          for(let i=0;i<4;i++){const x=40+i*6;polygon([[x,42],[x+1,24-i%2*6],[x+7,43]],i%2?'#82b6c2':'#c0dbd9');line([x+2,30],[x+4,42],1,'#5b8da5');}
          for(const[x,y]of[[16,24],[68,64],[10,53]])gem(x,y,2,'#c4b5d4');break;
        }
        default:return false;
      }
      return true;
    }

    // Legendary compositions are individually posed, with a restrained themed backdrop.
    switch(pet.name){
      case 'Forest Guardian': {
        for(const side of[-1,1]){line([28+side*6,24],[28+side*14,9],3,'#9b9171');line([28+side*12,13],[28+side*20,14],2,'#9b9171');line([28+side*10,16],[28+side*10,7],2,'#9b9171');}
        curve([[63,51],[78,60],[72,31],[63,38]],8,'#708878',3);
        beast({hx:28,hy:32,x:45,y:52,wide:23,color:'#8ca38b',shadow:'#526c65',muzzle:'#d5d6b6',feline:false});
        for(let i=0;i<5;i++)polygon([[33+i*5,43],[37+i*5,36],[42+i*5,45]],'#738765');gem(28,23,2,gold);
        for(const x of[10,70]){line([x,72],[x,58],1,'#698570');polygon([[x,65],[x-5,58],[x+1,60],[x+5,55],[x+3,67]],'#9cad83');}break;
      }
      case 'Starlight Akita': {
        seal(41,33,24,'#9b8c68','#4c4a46',8);curve([[32,61],[12,62],[13,46],[23,48]],9,'#bda878',6);
        beast({x:42,y:52,wide:17,high:12,hx:42,hy:30,headW:14,headH:13,color:'#d1b680',shadow:'#8e7757',muzzle:'#f0dfb7',feline:false,pose:'sit'});
        polygon([[30,44],[42,49],[54,44],[51,54],[33,54]],'#726b79');gem(42,49,3,gold);star(42,19,ivory);break;
      }
      case 'Royal Retriever': {
        polygon([[30,34],[55,33],[68,70],[33,70]],'#74566e');line([56,36],[66,68],2,gold);
        curve([[61,54],[76,56],[75,38],[68,39]],7,'#b99a64',3);
        beast({x:45,y:52,wide:22,hx:27,hy:31,headW:12,headH:13,color:'#d1ad70',shadow:'#93784e',muzzle:'#eddbb0',ears:'drop',feline:false});
        crown(27,18,9);curve([[27,45],[32,55],[48,57],[56,49]],2,gold,2);gem(35,52,3,'#a585ad');break;
      }
      case 'Clockwork Schnauzer': {
        gear(62,43,15,'#aa915d','#46454d');curve([[60,55],[74,62],[73,42],[66,41]],3,gold,2);
        beast({x:43,y:52,wide:20,hx:28,hy:32,headW:12,headH:14,color:'#b9a381',shadow:'#756657',muzzle:'#ded1b3',ears:'drop',feline:false});
        polygon([[20,38],[35,38],[33,51],[27,55],[21,48]],'#ded1b3');box(20,25,6,2,ivory);box(30,25,6,2,ivory);
        gear(43,49,7,gold,'#585659');box(22,63,8,5,'#8e835f');break;
      }
      case 'Dragon Chow': {
        for(const side of[-1,1])polygon([[40+side*8,48],[40+side*31,20],[40+side*30,45],[40+side*22,39],[40+side*17,55]],'#985d65');
        beast({x:40,y:53,wide:19,high:13,hx:40,hy:34,headW:15,headH:14,color:'#c48b73',shadow:'#845868',muzzle:'#e4c09a',feline:false,pose:'sit',mane:true});
        for(const side of[-1,1])polygon([[40+side*8,22],[40+side*13,8],[40+side*15,23]],gold);for(let i=0;i<3;i++)gem(40,47+i*6,2,gold);break;
      }
      case 'Phoenix Setter': {
        for(const side of[-1,1])feathers(42,46,side,30,26,'#c28b75','#865f77');
        curve([[60,52],[84,48],[68,18],[69,14]],7,'#bb7a69',2);curve([[61,52],[77,46],[69,25],[69,21]],3,gold,1);
        beast({x:43,y:52,wide:21,hx:28,hy:31,headW:11,headH:14,color:'#d1a38b',shadow:'#986b79',muzzle:'#f1d1ad',ears:'drop',feline:false});
        polygon([[22,18],[25,9],[28,18],[32,12],[33,22]],gold);break;
      }
      case 'Lunar Wolf': {
        ellipse(55,23,18,18,'#9cabbc');ellipse(61,19,15,15,null);
        polygon([[8,74],[20,62],[38,64],[47,76]],'#68788c');
        curve([[61,51],[81,45],[67,32],[66,41]],10,'#819fb4',3);
        beast({x:44,y:51,wide:22,hx:25,hy:29,headW:11,headH:14,color:'#bfd2d5',shadow:'#7792ac',muzzle:'#e5e7df',feline:false,profile:-1});
        polygon([[29,40],[40,42],[35,57],[26,51]],'#d8e1dc');gem(29,23,2,'#b7b1d0');star(12,17,ivory);break;
      }
      case 'Prism Papillon': {
        for(const side of[-1,1]){
          polygon([[40,41],[40+side*30,13],[40+side*33,35],[40+side*22,47],[40+side*29,63],[40+side*10,58]],'#756c93');
          polygon([[40+side*5,38],[40+side*28,17],[40+side*28,33],[40+side*11,45]],'#bc9ebf');
          polygon([[40+side*10,47],[40+side*21,45],[40+side*25,58],[40+side*12,54]],'#8dbcc2');
          line([40+side*7,41],[40+side*25,24],1,gold);
        }
        beast({x:40,y:54,wide:11,high:10,hx:40,hy:35,headW:10,headH:11,color:'#d4b5c2',shadow:'#9b829e',muzzle:'#eaddd4',feline:false,pose:'sit'});gem(40,27,2,gold);break;
      }
      case 'Celestial Hound': {
        ring(32,14,12,4,gold,1);for(const side of[-1,1])feathers(44,46,side,27,16,'#d2dce0','#8796ae');
        beast({x:45,y:50,wide:20,high:10,hx:28,hy:30,headW:10,headH:14,color:'#dce1de',shadow:'#8d9bb2',muzzle:'#f2e9d2',ears:'drop',feline:false});
        line([29,44],[37,49],2,gold);gem(36,49,2,'#ad9bb9');for(const x of[10,69])star(x,27,ivory);break;
      }
      case 'Moonlight Maine Coon': {
        ellipse(58,23,18,18,'#8ca4b9');ellipse(64,20,15,15,null);
        curve([[51,61],[75,73],[74,40],[64,40]],10,'#8aaebc',3);
        beast({x:36,y:53,wide:18,high:14,hx:36,hy:28,headW:13,headH:14,color:'#bad3d3',shadow:'#7694ad',muzzle:'#e5e6dd',feline:true,pose:'sit',mane:true});
        for(const side of[-1,1])line([36+side*13,15],[36+side*16,8],2,'#7390aa');gem(36,22,2,gold);break;
      }
      case 'Clockwork Rex': {
        gear(20,35,15,'#a48c60','#47464d');curve([[51,55],[74,67],[70,33],[59,31]],3,gold,2);gear(60,31,6,gold,'#4e4d55');
        beast({x:43,y:53,wide:12,high:12,hx:44,hy:29,headW:10,headH:12,color:'#c0ad89',shadow:'#827260',muzzle:'#e3d7b9',feline:true,pose:'sit'});
        polygon([[34,43],[49,43],[52,55],[34,55]],'#747978');gear(43,50,6,gold,'#4e4d55');line([48,39],[57,51],2,gold);break;
      }
      case 'Royal British': {
        polygon([[24,66],[24,25],[40,13],[56,25],[56,66]],'#746574');polygon([[28,63],[28,28],[40,20],[52,28],[52,63]],'#3c3c49');
        beast({x:40,y:54,wide:19,high:12,hx:40,hy:36,headW:15,headH:12,color:'#cbb47f',shadow:'#917c60',muzzle:'#edddba',feline:true,pose:'sit'});
        crown(40,22,11);line([28,49],[52,49],2,gold);gem(40,51,3,'#8f7ca0');stone('#807056','#b5a277');break;
      }
      case 'Forest Lynx': {
        for(const side of[-1,1]){line([28+side*8,24],[28+side*16,12],2,'#a09475');line([28+side*13,16],[28+side*21,17],2,'#a09475');}
        beast({x:45,y:52,wide:22,hx:28,hy:33,headW:12,headH:12,color:'#9aaa89',shadow:'#607865',muzzle:'#dcdbbb',feline:true});
        for(const side of[-1,1])line([28+side*13,19],[28+side*15,10],1,'#425d54');
        for(let i=0;i<4;i++){const x=38+i*7;polygon([[x,43],[x+3,36],[x+7,43],[x+2,47]],'#748969');}gem(28,25,2,gold);break;
      }
      case 'Prism Ragdoll': {
        for(const side of[-1,1])feathers(40+side*8,48,side,28,28,'#bfa5c4','#7d789b');
        for(const side of[-1,1])for(let i=0;i<3;i++)polygon([[40+side*(17+i*4),37+i*6],[40+side*(25+i*4),24+i*7],[40+side*(23+i*4),43+i*6]],['#a7c5cb','#c6b8d0','#c7cda9'][i]);
        beast({x:40,y:54,wide:17,high:12,hx:40,hy:34,headW:13,headH:12,color:'#d2bdce',shadow:'#9b8cae',muzzle:'#eee1dd',feline:true,pose:'sit'});gem(40,25,2,gold);gem(40,49,3,'#8ba8bf');break;
      }
      default:return false;
    }
    return true;
  }
  globalThis.PetMythicArt=Object.freeze({draw});
})();
