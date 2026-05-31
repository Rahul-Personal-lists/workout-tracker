import { LogoKettlePop } from "@/components/logo-kettle-pop";
import { BrandWordmark } from "@/components/brand-wordmark";

export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="animate-logo-enter">
        <LogoKettlePop size={64} />
      </div>
      <h1 className="text-xl font-semibold animate-title-enter">
        <BrandWordmark />
      </h1>
    </div>
  );
}
