// ─── GECE KAPAĞI ───────────────────────────────────────
// Kapak görseli henüz olmayan masallar için ay ve yıldızlı yer tutucu.
// `cut` hilali oyan dairenin rengidir; kapağın zemin rengiyle aynı olmalı.
export default function NightCover({ size = 120, cut = 'var(--bg-card-hover)' }: { size?: number; cut?: string }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 120 90" aria-hidden="true">
      <circle cx="60" cy="42" r="26" fill="#F2C14E" />
      <circle cx="72" cy="34" r="24" style={{ fill: cut }} />
      <circle cx="20" cy="20" r="2" style={{ fill: 'var(--star)' }} />
      <circle cx="100" cy="16" r="1.6" style={{ fill: 'var(--star)' }} />
      <circle cx="104" cy="66" r="2" fill="#F2C14E" />
      <circle cx="14" cy="70" r="1.6" style={{ fill: 'var(--star)' }} />
    </svg>
  )
}
