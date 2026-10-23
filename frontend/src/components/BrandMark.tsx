export default function BrandMark() {
  return (
    <span className="brand-lockup">
      <svg
        className="brand-logo"
        viewBox="0 0 56 56"
        role="img"
        aria-label="Kwetu rising home mark"
      >
        <rect x="2" y="2" width="52" height="52" rx="16" fill="#07523d" />
        <path
          d="M12 27 28 13l16 14"
          fill="none"
          stroke="#e9b957"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.5"
        />
        <circle cx="28" cy="36" r="10" fill="#e9b957" />
        <path
          d="M28 41V31m-4 4 4-4 4 4"
          fill="none"
          stroke="#07523d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="brand-word-stack">
        <span className="brand-wordmark">KWETU</span>
        <span className="brand-tagline">Money. Plans. Future.</span>
      </span>
    </span>
  );
}
