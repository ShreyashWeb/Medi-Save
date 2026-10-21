import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Kendra {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  phone: string;
  timings: string;
}

let cachedKendras: Kendra[] | null = null;

function loadKendras(): Kendra[] {
  if (!cachedKendras) {
    try {
      const p = path.join(process.cwd(), 'data', 'kendras.json');
      const raw = fs.readFileSync(p, 'utf-8');
      cachedKendras = JSON.parse(raw) as Kendra[];
    } catch (e) {
      console.error('Error loading kendras.json:', e);
      cachedKendras = [];
    }
  }
  return cachedKendras;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

  const kendras = loadKendras();

  let results = kendras.map((k) => ({ ...k, distance_km: null as number | null }));

  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      results = results.map((k) => ({
        ...k,
        distance_km: haversineDistance(lat, lng, k.lat, k.lng),
      }));
      results.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    }
  } else if (q) {
    results = results.filter(
      (k) =>
        k.city.toLowerCase().includes(q) ||
        k.state.toLowerCase().includes(q) ||
        k.pincode.includes(q) ||
        k.address.toLowerCase().includes(q) ||
        k.name.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    total: results.length,
    results: results.slice(0, limit),
  });
}
