interface PositioningProps {
  headline: string;
  description: string;
}

export function Positioning({ headline, description }: PositioningProps) {
  return (
    <section className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl font-bold mb-6">{headline}</h2>
      <p className="text-gray-400 text-lg leading-relaxed">{description}</p>
    </section>
  );
}
