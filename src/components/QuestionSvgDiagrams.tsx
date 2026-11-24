import React from 'react';

interface Props {
  svgType: 'KOPERASI_LINE_CHART' | 'FLOWCHART_SYMBOLS';
}

export const QuestionSvgDiagrams: React.FC<Props> = ({ svgType }) => {
  if (svgType === 'KOPERASI_LINE_CHART') {
    // Question 4: Total Penjualan Bulanan Koperasi Sekolah (Jan - Jun)
    // Data points from PDF:
    // Jan: Rp2,1 jt | Feb: Rp2,4 jt | Mar: Rp2,0 jt | Apr: Rp2,8 jt | Mei: Rp3,2 jt | Jun: Rp3,5 jt
    // Y-axis: Rp0 (y=210), Rp1,0 jt (y=170), Rp2,0 jt (y=130), Rp3,0 jt (y=90), Rp4,0 jt (y=50)
    // Formula: y = 210 - (val * 40)
    // Jan (2.1) -> x=105, y=126
    // Feb (2.4) -> x=175, y=114
    // Mar (2.0) -> x=245, y=130
    // Apr (2.8) -> x=315, y=98
    // Mei (3.2) -> x=385, y=82
    // Jun (3.5) -> x=455, y=70
    const points = [
      { month: 'Jan', label: 'Rp2,1 jt', x: 105, y: 126 },
      { month: 'Feb', label: 'Rp2,4 jt', x: 175, y: 114 },
      { month: 'Mar', label: 'Rp2,0 jt', x: 245, y: 130 },
      { month: 'Apr', label: 'Rp2,8 jt', x: 315, y: 98 },
      { month: 'Mei', label: 'Rp3,2 jt', x: 385, y: 82 },
      { month: 'Jun', label: 'Rp3,5 jt', x: 455, y: 70 },
    ];

    return (
      <div className="my-4 p-4 bg-white border border-slate-200 rounded-xl">
        <svg
          viewBox="0 0 520 265"
          className="w-full max-w-xl mx-auto h-auto select-none"
          role="img"
          aria-label="Grafik Garis Total Penjualan Bulanan Koperasi Sekolah Januari hingga Juni"
        >
          {/* Title */}
          <text
            x="275"
            y="24"
            textAnchor="middle"
            className="fill-slate-900 font-bold"
            style={{ fontSize: '13.5px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Total Penjualan Bulanan Koperasi Sekolah
          </text>

          {/* Y-Axis Title */}
          <text
            x="18"
            y="130"
            textAnchor="middle"
            transform="rotate(-90, 18, 130)"
            className="fill-slate-700 font-semibold"
            style={{ fontSize: '10px', fontFamily: 'Public Sans, sans-serif' }}
          >
            Penjualan (Rupiah)
          </text>

          {/* Horizontal Grid Lines & Y-Labels */}
          {[
            { label: 'Rp4,0 jt', y: 50 },
            { label: 'Rp3,0 jt', y: 90 },
            { label: 'Rp2,0 jt', y: 130 },
            { label: 'Rp1,0 jt', y: 170 },
            { label: 'Rp0', y: 210 },
          ].map((row) => (
            <g key={row.label}>
              <line
                x1="75"
                y1={row.y}
                x2="480"
                y2={row.y}
                stroke={row.y === 210 ? '#334155' : '#E2E8F0'}
                strokeWidth={row.y === 210 ? '1.5' : '1'}
              />
              <text
                x="68"
                y={row.y + 4}
                textAnchor="end"
                className="fill-slate-600"
                style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {row.label}
              </text>
            </g>
          ))}

          {/* Y-Axis Vertical Line */}
          <line x1="75" y1="45" x2="75" y2="210" stroke="#334155" strokeWidth="1.5" />

          {/* Line Path */}
          <polyline
            fill="none"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          />

          {/* Data Points & Labels */}
          {points.map((p) => (
            <g key={p.month}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#FFFFFF"
                stroke="#1D4ED8"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="fill-slate-800 font-semibold"
                style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {p.label}
              </text>
              <text
                x={p.x}
                y="228"
                textAnchor="middle"
                className="fill-slate-700 font-medium"
                style={{ fontSize: '11px', fontFamily: 'Public Sans, sans-serif' }}
              >
                {p.month}
              </text>
            </g>
          ))}

          {/* X-Axis Title */}
          <text
            x="280"
            y="250"
            textAnchor="middle"
            className="fill-slate-800 font-semibold"
            style={{ fontSize: '11px', fontFamily: 'Public Sans, sans-serif' }}
          >
            Bulan
          </text>
        </svg>
      </div>
    );
  }

  // Question 16: 4 Flowchart Symbols from PDF:
  // (1) Oval (Terminator)
  // (2) Jajar Genjang (Input/Output)
  // (3) Persegi Panjang (Process)
  // (4) Belah Ketupat / Diamond (Decision)
  return (
    <div className="my-4 p-4 bg-white border border-slate-200 rounded-xl">
      <svg
        viewBox="0 0 460 220"
        className="w-full max-w-lg mx-auto h-auto select-none"
        role="img"
        aria-label="Empat Simbol Flowchart: (1) Oval, (2) Jajar Genjang, (3) Persegi Panjang, (4) Belah Ketupat"
      >
        {/* (1) Oval / Terminator */}
        <text
          x="125"
          y="24"
          textAnchor="middle"
          className="fill-slate-800 font-bold"
          style={{ fontSize: '14px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          (1)
        </text>
        <ellipse
          cx="125"
          cy="62"
          rx="62"
          ry="26"
          fill="#DBEAFE"
          stroke="#1E293B"
          strokeWidth="2"
        />

        {/* (2) Jajar Genjang / Parallelogram */}
        <text
          x="335"
          y="24"
          textAnchor="middle"
          className="fill-slate-800 font-bold"
          style={{ fontSize: '14px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          (2)
        </text>
        <polygon
          points="290,36 395,36 375,88 270,88"
          fill="#DCFCE7"
          stroke="#1E293B"
          strokeWidth="2"
        />

        {/* (3) Persegi Panjang / Rectangle */}
        <text
          x="125"
          y="126"
          textAnchor="middle"
          className="fill-slate-800 font-bold"
          style={{ fontSize: '14px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          (3)
        </text>
        <rect
          x="65"
          y="140"
          width="120"
          height="54"
          fill="#FEF3C7"
          stroke="#1E293B"
          strokeWidth="2"
        />

        {/* (4) Belah Ketupat / Diamond */}
        <text
          x="335"
          y="126"
          textAnchor="middle"
          className="fill-slate-800 font-bold"
          style={{ fontSize: '14px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          (4)
        </text>
        <polygon
          points="335,136 400,167 335,198 270,167"
          fill="#FCE7F3"
          stroke="#1E293B"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
