'use client';

import { useState } from 'react';

interface GameState {
	coins: number;
	resources: unknown[];
	totalClicks: number;
	autoProduction: number;
	miners: number;
	level: number;
	experience: number;
}

interface Challenge {
	id: number;
	description: string;
	target: number;
	progress: number;
	reward: number;
}

export function DailyChallenges({
	setGame,
}: {
	setGame: (updater: (prev: GameState) => GameState) => void;
}) {
	const [challenges, setChallenges] = useState<Challenge[]>([
		{ id: 1, description: 'Mine 1000 coins', target: 1000, progress: 0, reward: 500 },
		{ id: 2, description: 'Merge 10 resources', target: 10, progress: 0, reward: 300 },
		{ id: 3, description: 'Reach level 5', target: 5, progress: 1, reward: 200 },
	]);

	const claimReward = (challengeId: number) => {
		const challenge = challenges.find(c => c.id === challengeId);
		if (challenge && challenge.progress >= challenge.target) {
			setGame(prev => ({ ...prev, coins: prev.coins + challenge.reward }));
			setChallenges(prev => prev.filter(c => c.id !== challengeId));
		}
	};

	return (
		<div className="bg-blue-600/20 rounded-2xl p-4 border border-blue-500">
			<h4 className="text-lg font-bold mb-3">🎯 Daily Challenges</h4>
			<div className="space-y-2">
				{challenges.map(challenge => (
					<div key={challenge.id} className="text-sm">
						<div className="flex justify-between mb-1">
							<span>{challenge.description}</span>
							<span>{challenge.progress}/{challenge.target}</span>
						</div>
						<div className="w-full bg-gray-600 rounded-full h-2">
							<div 
								className="bg-blue-500 h-2 rounded-full transition-all"
								style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
							/>
						</div>
						<button
							onClick={() => claimReward(challenge.id)}
							disabled={challenge.progress < challenge.target}
							className="w-full mt-1 py-1 bg-green-600 hover:bg-green-700 rounded text-xs disabled:opacity-50"
						>
							Claim {challenge.reward} coins
						</button>
					</div>
				))}
			</div>
		</div>
	);
}

export default DailyChallenges;


