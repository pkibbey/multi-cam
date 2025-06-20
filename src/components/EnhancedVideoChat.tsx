"use client";

import {
	ControlBar,
	LiveKitRoom,
	ParticipantTile,
	RoomAudioRenderer,
	useParticipants,
	useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { liveKitConfig } from "@/config/livekit";
import { log } from "@/lib/logger";
import { ParticipantDebugger } from "./ParticipantDebugger";
import { SimpleVideoGrid } from "./SimpleVideoGrid";
import "@livekit/components-styles";

interface EnhancedVideoChatProps {
	roomName: string;
	deviceName: string;
	onLeave: () => void;
}

function VideoGrid() {
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false },
	);
	const participants = useParticipants();

	log.debug("VideoGrid render", {
		tracksCount: tracks.length,
		participantsCount: participants.length,
		tracks: tracks.map((t) => ({
			participant: t.participant.identity,
			source: t.source,
			publication: !!t.publication,
		})),
	});

	return (
		<SimpleVideoGrid tracks={tracks} style={{ height: "100%" }}>
			{/* ParticipantTile will automatically render the track */}
			<ParticipantTile />
		</SimpleVideoGrid>
	);
}

export function EnhancedVideoChat({
	roomName,
	deviceName,
	onLeave,
}: EnhancedVideoChatProps) {
	const [token, setToken] = useState<string>("");
	const [isConnecting, setIsConnecting] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const generateToken = useCallback(async () => {
		try {
			setIsConnecting(true);
			setError(null);

			log.info("Generating LiveKit token", { roomName, deviceName });

			// Fetch token from API endpoint
			const response = await fetch("/api/livekit-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					roomName,
					participantName: deviceName,
					participantIdentity: `user-${Date.now()}`,
					createRoom: true, // Request room creation with optimal settings
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to generate token: ${response.statusText}`);
			}

			const data = await response.json();
			setToken(data.token);
			setIsConnecting(false);

			log.success("LiveKit token generated successfully");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to generate token";
			log.error("Failed to generate LiveKit token", { error: err });
			setError(errorMessage);
			setIsConnecting(false);
		}
	}, [roomName, deviceName]);

	useEffect(() => {
		generateToken();
	}, [generateToken]);

	const handleDisconnected = useCallback(() => {
		log.info("Disconnected from LiveKit room");
		onLeave();
	}, [onLeave]);

	const handleError = useCallback((error: Error) => {
		log.error("LiveKit room error", { error });
		setError(error.message);
	}, []);

	// Loading state
	if (isConnecting) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Card className="w-96">
					<CardHeader>
						<CardTitle>Connecting to Video Chat</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center space-y-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
							<p className="text-sm text-gray-600">
								Setting up your video chat session...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Card className="w-96">
					<CardHeader>
						<CardTitle className="text-red-600">Connection Error</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<p className="text-sm text-gray-600">{error}</p>
							<div className="flex space-x-2">
								<Button onClick={generateToken} variant="outline">
									Retry
								</Button>
								<Button onClick={onLeave} variant="secondary">
									Back
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Main video chat interface
	return (
		<div className="h-screen flex flex-col">
			<LiveKitRoom
				video={true}
				audio={true}
				token={token}
				serverUrl={liveKitConfig.wsURL}
				onDisconnected={handleDisconnected}
				onError={handleError}
				onConnected={() => {
					log.info("Successfully connected to LiveKit room");
				}}
				connectOptions={{
					autoSubscribe: true,
				}}
				style={{ height: "100%" }}
				className="flex flex-col"
			>
				{/* Custom header */}
				<div className="bg-gray-900 text-white p-4 flex justify-between items-center">
					<div>
						<h1 className="text-lg font-semibold">Enhanced Video Chat</h1>
						<p className="text-sm text-gray-300">Room: {roomName}</p>
					</div>
					<Button onClick={onLeave} variant="destructive" size="sm">
						Leave Room
					</Button>
				</div>

				{/* Video conference area */}
				<div className="flex-1 relative bg-gray-100">
					<VideoGrid />
					<ParticipantDebugger />
				</div>

				{/* Control bar */}
				<div className="bg-gray-800 p-2">
					<ControlBar />
				</div>

				{/* Audio renderer for participants */}
				<RoomAudioRenderer />
			</LiveKitRoom>
		</div>
	);
}
