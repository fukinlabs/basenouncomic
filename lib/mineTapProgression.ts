export const progressionSystem = {
	levels: [
		{ level: 1, expRequired: 100, unlock: 'Basic Mining' },
		{ level: 5, expRequired: 500, unlock: 'Copper Resources' },
		{ level: 10, expRequired: 1000, unlock: 'Iron Resources' },
		{ level: 15, expRequired: 2500, unlock: 'Gold Resources' },
		{ level: 20, expRequired: 5000, unlock: 'Diamond Resources' },
		{ level: 25, expRequired: 10000, unlock: 'Emerald Resources' },
		{ level: 30, expRequired: 25000, unlock: 'Ruby Resources' },
		{ level: 35, expRequired: 50000, unlock: 'Mythril Resources' }
	],
	
	achievements: [
		{ id: 'first_100_clicks', name: 'Apprentice Miner', target: 100, reward: '⛏️' },
		{ id: 'first_merge', name: 'Resource Combiner', target: 1, reward: '🔄' },
		{ id: 'auto_income', name: 'Automation Expert', target: 10, reward: '🤖' },
		{ id: 'diamond_miner', name: 'Diamond Hunter', target: 5, reward: '💎' }
	]
};


