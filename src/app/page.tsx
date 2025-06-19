"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useVideoChat } from "@/lib/useVideoChat";

export default function Home() {
	const { allPeers, stats } = useVideoChat();

	return (
		<main className="min-h-screen bg-neutral-100 p-4">
			<h1 className="text-2xl font-bold mb-4">Video Chat Room</h1>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
				{Object.entries(allPeers).map(([id, stream]) =>
					stream ? (
						<Card key={id} className="flex flex-col items-center p-2">
							<VideoPlayer stream={stream} stats={stats[id]} />
							<span className="mt-2 text-xs text-neutral-500">{id}</span>
						</Card>
					) : null,
				)}
			</div>
		</main>
	);
}

function VideoPlayer({
	stream,
	stats,
}: {
	stream: MediaStream;
	stats?: { bitrate?: number; width?: number; height?: number };
}) {
	const ref = useRef<HTMLVideoElement>(null);
	useEffect(() => {
		if (ref.current) {
			ref.current.srcObject = stream;
		}
	}, [stream]);
	return (
		<div className="w-full flex flex-col items-center">
			<video
				ref={ref}
				autoPlay
				playsInline
				className="rounded w-full aspect-video bg-black"
				muted
			/>
		</div>
	);
}
