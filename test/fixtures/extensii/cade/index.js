// Extensie de probă: aruncă la fiecare pornire (ADR 0232 §A.1).
export function activeaza() {
  return {
    deschide() {
      throw new Error('pornirea cade anume');
    },
  };
}
