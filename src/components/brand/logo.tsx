import Image from "next/image";

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/logo-mark.png" alt="" width={size} height={size} priority />
      <span className="text-lg font-medium tracking-tight text-[var(--color-text-primary)]">
        Outrun
      </span>
    </span>
  );
}
