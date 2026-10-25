/* Key-free map tiles: worker-rendered, clipped to the viewport, cached by Leaflet. */
(() => {
  'use strict';
  const scriptURL = typeof document === 'undefined' ? null : document.currentScript.src;
  const attribution = 'Map data: <a href="https://data.gov.sg/datasets/d_29f066d67df3eae91df8a42f443863c8/view" target="_blank" rel="noopener">SLA</a> / <a href="https://datamall.lta.gov.sg/content/datamall/en/static-data.html" target="_blank" rel="noopener">LTA</a> · <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener">Singapore Open Data Licence</a> · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>';

  async function readData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Basemap HTTP ${response.status}`);
    return response.json();
  }

  function workerBackend(url) {
    return new Promise((resolve,reject)=>{
      const worker = new Worker(new URL('sg-basemap-worker.js',scriptURL));
      const pending = new Map();
      let initialized = false,id = 0,failure = null;
      const timeout = setTimeout(()=>fail(new Error('Map worker timed out')),15000);
      function fail(error) {
        failure = error;
        clearTimeout(timeout);worker.terminate();
        pending.forEach(job=>job.reject(error));pending.clear();
        if (!initialized) reject(error);
      }
      worker.onerror = ()=>fail(new Error('Map worker unavailable'));
      worker.onmessage = ({data})=>{
        if (data.type === 'ready') {
          initialized = true;clearTimeout(timeout);
          resolve({worker:true,metadata:data.metadata,destroy:()=>fail(new Error('Map closed')),draw(canvas,coords,options){
            if (failure) return Promise.reject(failure);
            return new Promise((resolveTile,rejectTile)=>{
              const key = ++id;
              pending.set(key,{resolve:resolveTile,reject:rejectTile});
              worker.postMessage({type:'tile',id:key,coords,options});
            }).then(bitmap=>{
              if (canvas._sgActive)canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0);
              bitmap.close();
            });
          }});
        } else if (data.type === 'tile') {
          const job = pending.get(data.id);pending.delete(data.id);
          if (job)job.resolve(data.bitmap);else data.bitmap.close();
        } else if (data.type === 'error') {
          const error = new Error(data.message),job = pending.get(data.id);
          if (job){pending.delete(data.id);job.reject(error);}else fail(error);
        }
      };
      worker.postMessage({type:'init',url});
    });
  }

  async function fallbackBackend(url) {
    const data = await readData(url);
    const index = SingaporeMapTiles.createIndex(data);
    return {worker:false,metadata:{bbox:data.bbox,features:data.features.length},destroy(){},draw(canvas,coords,options){
      return new Promise((resolve,reject)=>{
        const draw = ()=>{
          try {if(canvas._sgActive)SingaporeMapTiles.paint(canvas.getContext('2d',{alpha:false}),index,coords,options);resolve();}
          catch(error){reject(error);}
        };
        if ('requestIdleCallback' in window)requestIdleCallback(draw,{timeout:250});
        else requestAnimationFrame(draw);
      });
    }};
  }

  function create(map, url) {
    const pane = map.createPane('basemap');
    pane.style.zIndex = '200';pane.style.pointerEvents = 'none';
    const stats = {worker:false,details:true,tilesDrawn:0};
    let backend = null,ready = null;
    const TileLayer = L.GridLayer.extend({
      createTile(coords,done) {
        const tile = document.createElement('canvas');
        const size = this.getTileSize().x,ratio = Math.min(window.devicePixelRatio||1,2);
        tile.width = tile.height = size*ratio;tile._sgActive = true;
        // Opaque pixels avoid transparent flashes while the worker paints a new tile.
        const context = tile.getContext('2d',{alpha:false});
        context.fillStyle = '#dfe8eb';context.fillRect(0,0,tile.width,tile.height);
        backend.draw(tile,{x:coords.x,y:coords.y,z:coords.z},{size,ratio,details:stats.details}).then(()=>{
          if(tile._sgActive)stats.tilesDrawn++;
          done(null,tile);
        }).catch(error=>done(error,tile));
        return tile;
      }
    });
    const layer = new TileLayer({pane:'basemap',tileSize:256,minZoom:9,maxZoom:19,keepBuffer:2,updateWhenZooming:false,updateWhenIdle:false,updateInterval:150,noWrap:true,attribution});
    layer.on('tileunload',event=>{event.tile._sgActive = false;});
    map.setMinZoom(9);map.setMaxZoom(19);
    map.setMaxBounds(L.latLngBounds([[1.15,103.55],[1.55,104.18]]).pad(.5));
    map.options.maxBoundsViscosity = .8;
    map.on('unload',()=>backend?.destroy());

    function load() {
      if (ready) return ready;
      const dataURL = new URL(url,window.location.href).href;
      ready = (async()=>{
        if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
          try {backend = await workerBackend(dataURL);}catch {backend = await fallbackBackend(dataURL);}
        } else backend = await fallbackBackend(dataURL);
        stats.worker = backend.worker;
        layer.addTo(map);
        return backend.metadata;
      })().catch(error=>{ready=null;throw error;});
      return ready;
    }
    function setDetailsVisible(visible) {
      const next = Boolean(visible);
      if (next === stats.details) return;
      stats.details = next;
      if (map.hasLayer(layer))layer.redraw();
    }
    return Object.freeze({load,setDetailsVisible,layer,stats});
  }
  globalThis.SingaporeBasemap = Object.freeze({create,style:SingaporeMapTiles.style});
})();
