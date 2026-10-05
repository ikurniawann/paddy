const VALUES = [
  { icon: "/store/icons/value-prop-1.png", text: "Garansi kepuasan 100%" },
  { icon: "/store/icons/value-prop-2.png", text: "Bahan case dan tas menggunakan bahan terbaik" },
  { icon: "/store/icons/value-prop-3.png", text: "Pelayanan customer service terbaik" },
  { icon: "/store/icons/value-prop-4.png", text: "Proses cetak dengan Teknologi UV terkini dari Jepang" },
];

/** Strip pink 4 keunggulan, dipisah garis putih vertikal (seperti paddy.id). */
export function ValueStrip() {
  return (
    <section aria-label="Keunggulan Paddy" className="bg-[var(--store-pink)] text-white">
      <ul className="mx-auto grid max-w-[1440px] grid-cols-2 py-6 md:grid-cols-4 md:py-6">
        {VALUES.map((value, index) => (
          <li
            key={value.icon}
            className={`flex flex-col items-center justify-center px-4 py-3 text-center md:py-1 ${
              index % 2 === 1 ? "border-l border-white" : ""
            } ${index === 2 ? "md:border-l md:border-white" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.icon} alt="" width={56} height={56} loading="lazy" className="h-[46px] w-[46px] md:h-[52px] md:w-[52px]" />
            <p className="mt-3 max-w-[190px] text-[13px] leading-snug md:mt-4 md:text-[12px]">{value.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
