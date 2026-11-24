// Extensie de probă: aruncă la prima pornire și pornește de la a doua (ADR 0232 §A.1, „Încearcă din nou”).
export function activeaza(host) {
  return {
    async deschide(container) {
      const n = Number(await host.stocare.citeste('porniri')) || 0;
      await host.stocare.scrie('porniri', n + 1);
      if (n === 0) throw new Error('prima pornire cade');
      const p = document.createElement('p');
      p.setAttribute('data-sovaie', 'pornit');
      p.textContent = `Pornirea ${n + 1}`;
      container.append(p);
    },
  };
}
