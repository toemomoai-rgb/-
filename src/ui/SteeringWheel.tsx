export default function SteeringWheel({ angle }: { angle: number }) {
  return <svg className="steering-wheel" viewBox="0 0 240 240" role="img" aria-label={`方向盤角度 ${Math.round(angle)} 度`} style={{ transform: `rotate(${angle}deg)` }}>
    <defs>
      <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#49514f"/><stop offset=".48" stopColor="#272d2b"/><stop offset="1" stopColor="#141b19"/></linearGradient>
      <linearGradient id="wheel-center" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4c5552"/><stop offset="1" stopColor="#2e3633"/></linearGradient>
      <filter id="wheel-shadow"><feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".3"/></filter>
    </defs>
    <circle cx="120" cy="120" r="101" fill="none" stroke="#101815" strokeWidth="25" filter="url(#wheel-shadow)"/>
    <circle cx="120" cy="120" r="101" fill="none" stroke="url(#wheel-rim)" strokeWidth="20"/>
    <circle cx="120" cy="120" r="91" fill="none" stroke="#6b7470" strokeWidth="1" opacity=".5"/>
    <path d="M24 99L92 107L112 130L94 143L28 123Z M216 99L148 107L128 130L146 143L212 123Z M105 145L135 145L139 217L101 217Z" fill="#78827c" stroke="#212b25" strokeWidth="3"/>
    <path d="M27 104L91 113 M150 113L212 104 M112 166L109 205 M129 166L132 205" stroke="#b2b9b0" strokeWidth="2" opacity=".55"/>
    <path d="M77 102Q120 79 163 102L156 142Q120 169 84 142Z" fill="url(#wheel-center)" stroke="#242d28" strokeWidth="2"/>
    <path d="M110 117L120 108L130 117L120 126Z" fill="none" stroke="#bcc6be" strokeWidth="1.5"/>
    <text x="120" y="145" textAnchor="middle" fill="#89978d" fontSize="5" letterSpacing="2">YONGQING</text>
    <rect x="115" y="9" width="10" height="22" rx="3" fill="#dfbc71"/>
    <path d="M38 62L42 66 M30 78L35 81 M202 62L198 66 M210 78L205 81" stroke="#818b84" strokeWidth="1"/>
  </svg>;
}
