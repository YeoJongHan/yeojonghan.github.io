/* The large geometry and its tile index stay off the UI thread. */
'use strict';
importScripts('vendor/geojson-vt.js','sg-map-tiles.js');
let index;
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      if (typeof OffscreenCanvas === 'undefined' || !new OffscreenCanvas(1,1).getContext('2d')) throw new Error('Worker canvas unavailable');
      const response = await fetch(data.url);
      if (!response.ok) throw new Error(`Basemap HTTP ${response.status}`);
      const geojson = await response.json();
      index = SingaporeMapTiles.createIndex(geojson);
      self.postMessage({type:'ready',metadata:{bbox:geojson.bbox,features:geojson.features.length}});
    } else if (data.type === 'tile') {
      if (!index) throw new Error('Basemap not ready');
      const {size,ratio} = data.options;
      const canvas = new OffscreenCanvas(size*ratio,size*ratio);
      SingaporeMapTiles.paint(canvas.getContext('2d',{alpha:false}),index,data.coords,data.options);
      const bitmap = canvas.transferToImageBitmap();
      self.postMessage({type:'tile',id:data.id,bitmap},[bitmap]);
    }
  } catch (error) {
    self.postMessage({type:'error',id:data.id,message:error.message});
  }
};
