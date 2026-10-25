/* Shared, clipped tile painting for the worker and older-browser fallback. */
(() => {
  'use strict';
  const EXTENT = 4096;
  function style(feature, zoom) {
    const {kind, class: category} = feature.properties || feature.tags;
    if (kind === 'land' || kind === 'context-land') return {color:'#ccd3cf',weight:1,fillColor:'#f3f3f0',fillOpacity:1};
    if (kind === 'park') return {stroke:false,fillColor:'#dee8dc',fillOpacity:1};
    if (kind === 'water') return {color:'#d5dfe0',weight:.6,fillColor:'#dfe8eb',fillOpacity:1};
    if (kind === 'runway') return {stroke:false,fillColor:'#e0e0db',fillOpacity:1};
    const major = ['CAT1','CAT2','CAT3'].includes(category);
    const visible = major || zoom >= 13;
    const width = category === 'CAT1' ? 2.2 : category === 'CAT2' ? 1.7 : category === 'CAT3' ? 1.2 : .7;
    return {color:category === 'CAT1' ? '#d1d3c9' : '#ffffff',weight:visible?width*Math.max(.7,Math.min(2.8,2**((zoom-12)/3))):0,opacity:visible?1:0};
  }

  function createIndex(data) {
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.some(feature=>feature.properties?.kind === 'land')) throw new Error('Invalid basemap data');
    return new GeoJSONVT(data,{extent:EXTENT,buffer:96,maxZoom:19,tolerance:4,indexMaxZoom:10,indexMaxPoints:30000});
  }

  function paint(context, index, coords, {size=256,ratio=1,details=true}={}) {
    const tile = index.getTile(coords.z,coords.x,coords.y);
    context.setTransform(ratio,0,0,ratio,0,0);
    context.fillStyle = '#dfe8eb';
    context.fillRect(0,0,size,size);
    context.lineCap = 'round';context.lineJoin = 'round';
    const scale = size / EXTENT;
    if (!tile) return;
    for (const feature of tile.features) {
      const kind = feature.tags.kind;
      if (!details && !['land','context-land'].includes(kind)) continue;
      const drawStyle = style(feature,coords.z);
      if (drawStyle.opacity === 0) continue;
      context.beginPath();
      for (const ring of feature.geometry) {
        if (!ring.length) continue;
        context.moveTo(ring[0][0]*scale,ring[0][1]*scale);
        for (let i=1;i<ring.length;i++)context.lineTo(ring[i][0]*scale,ring[i][1]*scale);
        if (feature.type === 3)context.closePath();
      }
      if (feature.type === 3) {
        context.fillStyle = drawStyle.fillColor;
        context.fill('evenodd');
      }
      if (drawStyle.stroke !== false && drawStyle.weight > 0) {
        context.strokeStyle = drawStyle.color;
        context.lineWidth = drawStyle.weight;
        context.stroke();
      }
    }
  }
  globalThis.SingaporeMapTiles = Object.freeze({createIndex,paint,style});
})();
