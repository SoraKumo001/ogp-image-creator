export const DEFAULT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap");

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      width: 1200px;
      height: 630px;
      font-family: "Inter", sans-serif;
      background:
        radial-gradient(1200px 600px at 100% -10%, rgba(124, 92, 255, 0.45), transparent 60%),
        radial-gradient(900px 500px at -10% 110%, rgba(45, 212, 191, 0.35), transparent 55%),
        linear-gradient(135deg, #0b1020 0%, #131a35 55%, #0d1530 100%);
      color: #f4f6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .frame {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 72px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: #7c5cff;
      text-transform: uppercase;
    }

    .kicker::before {
      content: "";
      width: 40px;
      height: 3px;
      border-radius: 2px;
      background: linear-gradient(90deg, #7c5cff, #2dd4bf);
    }

    h1 {
      font-size: 96px;
      line-height: 1.05;
      font-weight: 900;
      letter-spacing: -0.02em;
      max-width: 900px;
      background: linear-gradient(90deg, #ffffff, #c7d2fe);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .desc {
      font-size: 34px;
      line-height: 1.5;
      color: #9aa6d8;
      max-width: 780px;
      font-weight: 400;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    .brand span {
      color: #7c5cff;
    }

    .badge {
      font-size: 24px;
      font-weight: 700;
      color: #0b1020;
      background: linear-gradient(90deg, #2dd4bf, #7c5cff);
      padding: 12px 24px;
      border-radius: 999px;
      box-shadow: 0 8px 30px rgba(45, 212, 191, 0.35);
    }

    .deco {
      position: absolute;
      border-radius: 50%;
      filter: blur(2px);
      opacity: 0.5;
    }

    .deco.a {
      width: 220px;
      height: 220px;
      top: -60px;
      right: 180px;
      background: radial-gradient(circle, rgba(124, 92, 255, 0.6), transparent 70%);
    }

    .deco.b {
      width: 160px;
      height: 160px;
      bottom: -40px;
      left: 260px;
      background: radial-gradient(circle, rgba(45, 212, 191, 0.5), transparent 70%);
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="deco a"></div>
    <div class="deco b"></div>

    <div>
      <div class="kicker">{{category}}</div>
      <h1>{{title}}</h1>
    </div>

    <p class="desc">
      {{description}}
    </p>

    <div class="footer">
      <div class="brand">{{site}}<span> Image</span> Creator</div>
      <div class="badge">{{cta}}</div>
    </div>
  </div>
</body>
</html>
`;
