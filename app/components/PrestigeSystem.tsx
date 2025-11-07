'use client';

import { useState } from 'react';

interface Resource {
	id: number;
	type: string;
	level: number;
	emoji: string;
	value: number;
	basePrice: number;
	production: number;
}

interface GameState {
	resources: Resource[];
	coins: number;
	totalClicks: number;
	autoProduction: number;
	miners: number;
	level: number;
	experience: number;
}

interface PrestigeState {
	currentPrestige: number;
	prestigeBonus: number;
	requiredCoins: number;
}

export function PrestigeSystem({
	game,
	setGame,
}: {
	game: Pick<GameState, 'coins'>;
	setGame: (next: GameState) => void;
}) {
	const [prestige, setPrestige] = useState<PrestigeState>({
		currentPrestige: 0,
		prestigeBonus: 1,
		requiredCoins: 100000,
	});

	const canPrestige = game.coins >= prestige.requiredCoins;

	const handlePrestige = () => {
		if (!canPrestige) return;

		const nextPrestige = {
			currentPrestige: prestige.currentPrestige + 1,
			prestigeBonus: prestige.prestigeBonus * 2,
			requiredCoins: prestige.requiredCoins * 5,
		};
		setPrestige(nextPrestige);

		// Reset game with bonus
		setGame({
			resources: [],
			coins: 100 * prestige.prestigeBonus,
			totalClicks: 0,
			autoProduction: 0,
			miners: 0,
			level: 1,
			experience: 0,
		});
	};

	return (
		<div className="bg-yellow-600/20 rounded-2xl p-4 border border-yellow-500">
			<h4 className="text-lg font-bold mb-2">🌟 Prestige</h4>
			<div className="text-sm mb-3">
				<div>Current: {prestige.currentPrestige}⭐</div>
				<div>Bonus: {prestige.prestigeBonus}x</div>
				<div>Required: {prestige.requiredCoins} coins</div>
			</div>
			<button
				onClick={handlePrestige}
				disabled={!canPrestige}
				className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50"
			>
				Prestige Reset
			</button>
		</div>
	);
}

export default PrestigeSystem;


