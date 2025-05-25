// Gallery.tsx
import React, { useEffect, useState, useRef } from 'react';
import './Gallery.css';

type ImageMeta = {
  id: number;
  width: number;
  height: number;
  timestamp: string;
};

const API_BASE = 'http://localhost:8080/api/images';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function Gallery() {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [openedImageId, setOpenedImageId] = useState<number | null>(null);
  const [analysisImageId, setAnalysisImageId] = useState<number | null>(null);
  const [edgeDataUrl, setEdgeDataUrl] = useState<string>('');
  const [histogram, setHistogram] = useState<{ r: number[]; g: number[]; b: number[] }>({ r: [], g: [], b: [] });
  const [filters, setFilters] = useState({ contrast: 100, brightness: 100, grayscale: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}`)
      .then(res => res.json())
      .then(setImages)
      .catch(console.error);
  }, []);

  async function handleDownloadOriginal(id: number) {
    fetch(`${API_BASE}/${id}/data`)
      .then(res => res.blob())
      .then(blob => downloadBlob(blob, `image_${id}.jpg`))
      .catch(console.error);
  }

  async function handleDownloadFiltered() {
    if (openedImageId == null) return;
    try {
      const res = await fetch(`${API_BASE}/${openedImageId}/data`);
      const blob = await res.blob();
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.filter = `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%)`;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(filteredBlob => {
          if (filteredBlob) downloadBlob(filteredBlob, `image_${openedImageId}_filtered.jpg`);
          URL.revokeObjectURL(url);
        }, 'image/jpeg');
      };
    } catch (e) {
      console.error('Error downloading filtered image:', e);
    }
  }

  useEffect(() => {
    async function analyze() {
      if (analysisImageId == null) return;
      try {
        const res = await fetch(`${API_BASE}/${analysisImageId}/data`);
        const blob = await res.blob();
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise<void>(r => (img.onload = () => r()));

        const w = img.naturalWidth, h = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, w, h);

        const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const gyKernel = [1, 2, 1, 0, 0, 0, -1, -2, -1];
        const edgeData = ctx.createImageData(w, h);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const i = ((y + ky) * w + (x + kx)) * 4;
                const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                const kIdx = (ky + 1) * 3 + (kx + 1);
                gx += gray * gxKernel[kIdx];
                gy += gray * gyKernel[kIdx];
              }
            }
            const mag = Math.min(255, Math.hypot(gx, gy));
            const idx = (y * w + x) * 4;
            edgeData.data[idx] = edgeData.data[idx + 1] = edgeData.data[idx + 2] = mag;
            edgeData.data[idx + 3] = 255;
          }
        }
        ctx.putImageData(edgeData, 0, 0);
        setEdgeDataUrl(canvas.toDataURL('image/png'));

        const rHist = new Array(256).fill(0);
        const gHist = new Array(256).fill(0);
        const bHist = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          rHist[data[i]]++;
          gHist[data[i + 1]]++;
          bHist[data[i + 2]]++;
        }
        setHistogram({ r: rHist, g: gHist, b: bHist });
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Analysis error', e);
      }
    }
    analyze();
  }, [analysisImageId]);

  const rCanvas = useRef<HTMLCanvasElement>(null);
  const gCanvas = useRef<HTMLCanvasElement>(null);
  const bCanvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!histogram.r.length) return;
    const drawHist = (data: number[], canvas: HTMLCanvasElement | null, color: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const max = Math.max(...data);
      data.forEach((v, i) => {
        const h = (v / max) * H;
        ctx.fillStyle = color;
        ctx.fillRect((i / 256) * W, H - h, W / 256, h);
      });
    };
    drawHist(histogram.r, rCanvas.current, '#f00');
    drawHist(histogram.g, gCanvas.current, '#0f0');
    drawHist(histogram.b, bCanvas.current, '#00f');
  }, [histogram]);

  const image = openedImageId !== null ? images.find(img => img.id === openedImageId) : null;
  const filterStyle = {
    filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%)`
  };

  if (image) {
    return (
      <div className="fullscreen-view">
        <div className="fs-top-bar">
          <button className="back-button" onClick={() => setOpenedImageId(null)}>⬅ Back</button>
          <button className="download-filtered" onClick={handleDownloadFiltered}>⬇ Filtered</button>
        </div>
        <img
          ref={imgRef}
          crossOrigin="anonymous"
          src={`${API_BASE}/${image.id}/data`}
          alt={`Image ${image.id}`}
          className="fullscreen-image"
          style={filterStyle}
        />
        <p className="meta-full">
          ID: {image.id} — {new Date(image.timestamp).toLocaleString()}
        </p>
        <div className="filter-controls">
          <label>
            Contrast: {filters.contrast}%
            <input type="range" min="0" max="200" value={filters.contrast} onChange={e => setFilters({ ...filters, contrast: Number(e.target.value) })} />
          </label>
          <label>
            Brightness: {filters.brightness}%
            <input type="range" min="0" max="200" value={filters.brightness} onChange={e => setFilters({ ...filters, brightness: Number(e.target.value) })} />
          </label>
          <label>
            Grayscale: {filters.grayscale}%
            <input type="range" min="0" max="100" value={filters.grayscale} onChange={e => setFilters({ ...filters, grayscale: Number(e.target.value) })} />
          </label>
        </div>
      </div>
    );
  }

  if (analysisImageId !== null) {
    return (
      <div className="fullscreen-view">
        <div className="fs-top-bar">
          <button className="back-button" onClick={() => setAnalysisImageId(null)}>⬅ Back</button>
        </div>
        <h2>Edge Detection</h2>
        <img src={edgeDataUrl} className="analysis-canvas" alt="Edges" />
        <h2>Color Histograms</h2>
        <div className="histogram-row">
          <canvas ref={rCanvas} width={256} height={100} className="histogram-canvas" />
          <canvas ref={gCanvas} width={256} height={100} className="histogram-canvas" />
          <canvas ref={bCanvas} width={256} height={100} className="histogram-canvas" />
        </div>
      </div>
    );
  }

  return (
    <div className="gallery">
      <h1>📸 Photo Gallery</h1>
      <div className="gallery-grid">
        {images.map(img => (
          <div key={img.id} className="gallery-item">
            <img src={`${API_BASE}/${img.id}/data`} alt={`Image ${img.id}`} className="gallery-thumbnail" loading="lazy" />
            <p className="meta">{new Date(img.timestamp).toLocaleString()}</p>
            <div className="controls">
              <button onClick={() => handleDownloadOriginal(img.id)}>⬇ Original</button>
              <button onClick={() => setOpenedImageId(img.id)}>🎨 Filter / Open</button>
              <button onClick={() => setAnalysisImageId(img.id)}>🧪 Analyze</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
