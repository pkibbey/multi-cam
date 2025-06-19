"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { useVideoChat, useWanIp, type VideoStats } from "@/lib/useVideoChat";

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
	stats?: VideoStats;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	const wanIp = useWanIp();
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
			{stats && (
				<div className="mt-1 text-xs text-blue-700 text-left w-full">
					{stats.width && stats.height && (
						<div>
							Resolution: {stats.width}x{stats.height}
						</div>
					)}
					{typeof stats.bitrate === "number" && (
						<div>Bitrate: {Math.round(stats.bitrate / 1000)} kbps</div>
					)}
					{stats.codec && <div>Codec: {stats.codec}</div>}
					{typeof stats.framesPerSecond === "number" && (
						<div>FPS: {stats.framesPerSecond}</div>
					)}
					{typeof stats.framesDecoded === "number" && (
						<div>Frames Decoded: {stats.framesDecoded}</div>
					)}
					{typeof stats.framesDropped === "number" && (
						<div>Frames Dropped: {stats.framesDropped}</div>
					)}
					{typeof stats.jitter === "number" && (
						<div>Jitter: {stats.jitter}</div>
					)}
					{typeof stats.packetsLost === "number" && (
						<div>Packets Lost: {stats.packetsLost}</div>
					)}
					{typeof stats.packetsReceived === "number" && (
						<div>Packets Received: {stats.packetsReceived}</div>
					)}
					{typeof stats.frameDelay === "number" && (
						<div>Frame Delay: {stats.frameDelay.toFixed(2)}s</div>
					)}
				</div>
			)}
			<div className="mt-1 text-xs text-green-700">
				WAN IP: {wanIp || "..."}
			</div>
		</div>
	);
}
