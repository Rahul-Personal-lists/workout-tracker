import Image from "next/image";

type LogoProps = { size?: number };

export function LogoKettlePop({ size = 96 }: LogoProps) {
  return (
    <Image
      src="/icon-512.png"
      alt="Workout Tracker logo"
      width={size}
      height={size}
      priority
      style={{ borderRadius: size * 0.225 }}
    />
  );
}
