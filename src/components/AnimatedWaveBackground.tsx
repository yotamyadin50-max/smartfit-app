export default function AnimatedWaveBackground() {
  return (
    <div className="smartfit-wave-bg" aria-hidden="true">
      <div className="smartfit-wave-vignette" />

      <svg
        className="smartfit-wave-svg smartfit-wave-svg-main"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          <linearGradient id="smartfitWaveGradientMain" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#00f5a0" stopOpacity="0" />
            <stop offset="0.2" stopColor="#00f5a0" stopOpacity="0.86" />
            <stop offset="0.48" stopColor="#f5ff3d" stopOpacity="0.9" />
            <stop offset="0.72" stopColor="#20f3ff" stopOpacity="0.62" />
            <stop offset="1" stopColor="#00f5a0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="smartfitWaveGradientSoft" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#fff45c" stopOpacity="0" />
            <stop offset="0.28" stopColor="#fff45c" stopOpacity="0.55" />
            <stop offset="0.58" stopColor="#00f5a0" stopOpacity="0.62" />
            <stop offset="0.86" stopColor="#18d9ff" stopOpacity="0.42" />
            <stop offset="1" stopColor="#18d9ff" stopOpacity="0" />
          </linearGradient>
          <filter id="smartfitWaveBlur" x="-12%" y="-60%" width="124%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="smartfitWaveGlow" x="-12%" y="-60%" width="124%" height="220%">
            <feGaussianBlur stdDeviation="22" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="smartfit-wave-band smartfit-wave-band-one" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            className="smartfit-wave-path smartfit-wave-path-glow"
            filter="url(#smartfitWaveGlow)"
            stroke="url(#smartfitWaveGradientMain)"
            strokeWidth="34"
            opacity="0.28"
            d="M-120 275 C145 180 335 372 535 290 C735 205 902 135 1130 220 C1338 298 1430 152 1730 215"
          />
          <path
            className="smartfit-wave-path smartfit-wave-path-core"
            stroke="url(#smartfitWaveGradientMain)"
            strokeWidth="8"
            opacity="0.78"
            d="M-120 278 C145 183 335 375 535 293 C735 208 902 138 1130 223 C1338 301 1430 155 1730 218"
          />
        </g>

        <g className="smartfit-wave-band smartfit-wave-band-two" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            filter="url(#smartfitWaveBlur)"
            stroke="url(#smartfitWaveGradientSoft)"
            strokeWidth="42"
            opacity="0.22"
            d="M-150 420 C80 350 246 505 440 444 C660 376 810 272 1035 386 C1248 494 1425 348 1730 426"
          />
          <path
            className="smartfit-wave-path smartfit-wave-path-core"
            stroke="url(#smartfitWaveGradientSoft)"
            strokeWidth="7"
            opacity="0.58"
            d="M-150 423 C80 353 246 508 440 447 C660 379 810 275 1035 389 C1248 497 1425 351 1730 429"
          />
        </g>

        <g className="smartfit-wave-band smartfit-wave-band-three" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            filter="url(#smartfitWaveGlow)"
            stroke="url(#smartfitWaveGradientMain)"
            strokeWidth="24"
            opacity="0.18"
            d="M-140 610 C86 512 280 650 480 586 C690 520 828 456 1048 548 C1286 646 1428 512 1720 578"
          />
          <path
            className="smartfit-wave-path smartfit-wave-path-core"
            stroke="url(#smartfitWaveGradientMain)"
            strokeWidth="5"
            opacity="0.42"
            d="M-140 612 C86 514 280 652 480 588 C690 522 828 458 1048 550 C1286 648 1428 514 1720 580"
          />
        </g>
      </svg>
    </div>
  )
}
