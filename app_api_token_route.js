import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const roomID = searchParams.get('roomID') || 'kblc-daily-room';
  const userID = searchParams.get('userID') || `user_${Date.now()}`;
  const userName = searchParams.get('userName') || `Member_${userID.slice(-4)}`;

  const appID = parseInt(process.env.NEXT_PUBLIC_ZEGOCLOUD_APP_ID);
  const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;

  // Dynamic import to work on Vercel
  const { generateKitTokenForTest } = await import('@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js');
  const token = generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
  
  return NextResponse.json({ token });
}
