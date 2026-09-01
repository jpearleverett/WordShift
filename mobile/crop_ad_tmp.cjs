const {Jimp} = require('jimp');
(async()=>{
 const s = await Jimp.read('/tmp/claude-0/-home-user-WordShift/618d7246-f011-56d6-987d-bcf49e6fc580/scratchpad/store_sheet3.png');
 console.log(s.bitmap.width, s.bitmap.height);
 const cw = Math.floor(s.bitmap.width/5), ch = Math.floor(s.bitmap.height/3);
 const groups = [[1,2,3],[4,5,6],[7,8,9],[10,11,12],[13]];
 for (const g of groups){
   const w = cw*g.length, h = ch;
   const out = new Jimp({width:w,height:h,color:0xff00ffff});
   g.forEach((n,i)=>{ const r=Math.floor((n-1)/5), c=(n-1)%5;
     out.blit(s.clone().crop({x:c*cw,y:r*ch,w:cw,h:ch}), i*cw, 0); });
   out.scale(2, Jimp.RESIZE_NEAREST_NEIGHBOR);
   await out.write(`/tmp/AD_g${g[0]}.png`);
 }
})();
