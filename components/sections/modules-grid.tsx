export interface Module {
  title: string;
  description: string;
}

interface ModulesGridProps {
  modules: Module[];
}

export function ModulesGrid({ modules }: ModulesGridProps) {
  return (
    <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 mb-32">
      {modules.map((module, index) => (
        <div
          key={index}
          className="border border-gray-800 p-8 rounded-xl hover:border-gray-600 transition"
        >
          <h3 className="text-xl font-semibold mb-4">{module.title}</h3>
          <p className="text-gray-400">{module.description}</p>
        </div>
      ))}
    </section>
  );
}
