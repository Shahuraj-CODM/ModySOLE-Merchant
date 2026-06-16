export function middleware(request) {
  const url = new URL(request.url);

  // Bypass checks for assets or public files (like favicon, bundle files) to avoid breaking loads
  if (
    url.pathname.includes('/_expo/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/static/') ||
    url.pathname.includes('favicon')
  ) {
    return;
  }

  // Calculate current time in India Standard Time (IST)
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);

  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Operating Shifts (IST):
  // Morning: 08:00 AM - 12:00 PM (480 to 720 minutes)
  // Evening: 01:00 PM - 09:00 PM (780 to 1260 minutes)
  const isMorningShift = currentMinutes >= 480 && currentMinutes < 720;
  const isEveningShift = currentMinutes >= 780 && currentMinutes < 1260;
  const isOperational = isMorningShift || isEveningShift;

  if (!isOperational) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Merchant Portal Closed</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      color: #ffffff;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .closed-container {
      max-width: 450px;
      width: 100%;
      padding: 30px;
      box-sizing: border-box;
      text-align: center;
    }
    .closed-card {
      background-color: #111111;
      border: 1px solid rgba(255, 215, 0, 0.15);
      border-radius: 20px;
      padding: 40px 30px;
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.04);
    }
    .closed-emoji {
      font-size: 60px;
      margin-bottom: 20px;
      display: block;
    }
    .closed-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 15px 0;
      letter-spacing: 0.5px;
    }
    .closed-text {
      font-size: 14px;
      color: #a0a0a0;
      line-height: 22px;
      margin: 0 0 25px 0;
    }
    .time-block {
      background-color: #1c1c1c;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .time-text {
      font-size: 14px;
      font-weight: 600;
      color: #ffd700;
      margin: 0;
    }
    .closed-footer {
      font-size: 11px;
      color: #555555;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="closed-container">
    <div class="closed-card">
      <span class="closed-emoji">⏰</span>
      <h2 class="closed-title">Merchant Portal Closed</h2>
      <p class="closed-text">The Merchant Portal is only accessible during operating hours:</p>
      <div class="time-block">
        <p class="time-text">🌅 Morning: 08:00 AM - 12:00 PM IST</p>
        <p class="time-text">🌆 Evening: 01:00 PM - 09:00 PM IST</p>
      </div>
      <p class="closed-footer">Currently Outside Shift Hours</p>
    </div>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
