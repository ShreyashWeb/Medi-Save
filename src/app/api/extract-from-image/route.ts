import { NextRequest } from 'next/server';
import { POST as ocrPOST, GET as ocrGET } from '../ocr/route';

export async function GET(req: NextRequest) {
  return ocrGET();
}

export async function POST(req: NextRequest) {
  return ocrPOST(req);
}
