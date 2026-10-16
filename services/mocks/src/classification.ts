import type {
  Classification,
  ClassificationSource,
} from "./types.js";

const rules: Array<{
  terms: string[];
  result: Omit<Classification, "source">;
}> = [
  {
    terms: ["banana", "fruta", "legume", "verdura", "hortifruti", "tomate"],
    result: {
      category: "produce",
      description: "Hortifruti fresco identificado — SIMULADO",
      confidence: 0.96,
      perishabilityMinutes: 180,
      simulated: true,
    },
  },
  {
    terms: ["pão", "pao", "pães", "paes", "bolo", "padaria", "salgado"],
    result: {
      category: "bakery",
      description: "Itens de padaria identificados — SIMULADO",
      confidence: 0.94,
      perishabilityMinutes: 240,
      simulated: true,
    },
  },
  {
    terms: ["leite", "queijo", "iogurte", "laticínio", "laticinio"],
    result: {
      category: "dairy",
      description: "Laticínios refrigerados identificados — SIMULADO",
      confidence: 0.95,
      perishabilityMinutes: 120,
      simulated: true,
    },
  },
  {
    terms: ["marmita", "refeição", "refeicao", "prato", "comida pronta"],
    result: {
      category: "prepared",
      description: "Refeição pronta identificada — SIMULADO",
      confidence: 0.93,
      perishabilityMinutes: 90,
      simulated: true,
    },
  },
  {
    terms: ["arroz", "feijão", "feijao", "massa", "enlatado", "despensa"],
    result: {
      category: "pantry",
      description: "Alimento de despensa identificado — SIMULADO",
      confidence: 0.91,
      perishabilityMinutes: 4320,
      simulated: true,
    },
  },
];

export function classify(
  input: unknown,
  source: ClassificationSource = "upload",
): Classification {
  const normalized = JSON.stringify(input).toLocaleLowerCase("pt-BR");
  const match = rules.find(({ terms }) =>
    terms.some((term) => normalized.includes(term)),
  );

  return {
    ...(match?.result ?? {
      category: "other",
      description: "Alimento não categorizado — SIMULADO",
      confidence: 0.72,
      perishabilityMinutes: 720,
      simulated: true as const,
    }),
    source,
  };
}

export function readSource(input: unknown): ClassificationSource {
  if (typeof input !== "object" || input === null) {
    return "upload";
  }

  const source = Reflect.get(input, "source");
  return source === "camera" || source === "manual" || source === "upload"
    ? source
    : "upload";
}
