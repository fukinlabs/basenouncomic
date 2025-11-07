export const resourceEvolution = {
	rock: { next: 'copper', chance: 0.01 },
	copper: { next: 'iron', chance: 0.008 },
	iron: { next: 'gold', chance: 0.006 },
	gold: { next: 'diamond', chance: 0.004 },
	diamond: { next: 'emerald', chance: 0.003 },
	emerald: { next: 'ruby', chance: 0.002 },
	ruby: { next: 'mythril', chance: 0.001 }
};


