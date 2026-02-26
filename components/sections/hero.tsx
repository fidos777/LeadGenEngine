import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  description: string;
  primaryCta?: {
    label: string;
    href?: string;
  };
  secondaryCta?: {
    label: string;
    href?: string;
  };
}

export function Hero({ title, description, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="max-w-5xl mx-auto text-center mb-32">
      <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
        {title}
      </h1>
      <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
        {description}
      </p>
      {(primaryCta || secondaryCta) && (
        <div className="flex justify-center gap-6">
          {primaryCta && (
            <Button variant="primary">{primaryCta.label}</Button>
          )}
          {secondaryCta && (
            <Button variant="secondary">{secondaryCta.label}</Button>
          )}
        </div>
      )}
    </section>
  );
}
