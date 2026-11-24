// Extensie de probă: pornirea ei nu se mai termină (ADR 0232 §A.1, „Pornește greu…”).
export function activeaza() {
  return {
    deschide() {
      return new Promise(() => {});
    },
  };
}
