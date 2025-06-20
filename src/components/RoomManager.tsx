"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { log } from "@/lib/logger";

interface Room {
	name: string;
	sid: string;
	numParticipants: number;
	creationTime: number;
	emptyTimeout: number;
	maxParticipants: number;
}

interface RoomManagerProps {
	onRoomSelected: (roomName: string) => void;
	selectedRoom?: string;
}

export function RoomManager({
	onRoomSelected,
	selectedRoom,
}: RoomManagerProps) {
	const [rooms, setRooms] = useState<Room[]>([]);
	const [newRoomName, setNewRoomName] = useState("");
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [initializing, setInitializing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load rooms on component mount
	const loadRooms = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/room-management?action=list");
			if (!response.ok) {
				throw new Error(`Failed to load rooms: ${response.statusText}`);
			}

			const data = await response.json();
			setRooms(data.rooms || []);

			log.info("Loaded rooms", { count: data.rooms?.length || 0 });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to load rooms";
			setError(errorMessage);
			log.error("Failed to load rooms", { error: err });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRooms();
	}, [loadRooms]);

	const createRoom = async () => {
		if (!newRoomName.trim()) {
			setError("Room name is required");
			return;
		}

		try {
			setCreating(true);
			setError(null);

			log.info("Creating new room", { roomName: newRoomName });

			const response = await fetch("/api/room-management", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "create",
					roomName: newRoomName.trim(),
					options: {
						maxParticipants: 10, // Good for multicam setups
						emptyTimeout: 30 * 60, // 30 minutes
					},
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to create room: ${response.statusText}`);
			}

			const data = await response.json();
			log.success("Room created successfully", { room: data.room });

			// Refresh the room list
			await loadRooms();

			// Auto-select the newly created room
			onRoomSelected(newRoomName.trim());
			setNewRoomName("");
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to create room";
			setError(errorMessage);
			log.error("Failed to create room", { error: err });
		} finally {
			setCreating(false);
		}
	};

	const deleteRoom = async (roomName: string) => {
		if (
			!confirm(
				`Are you sure you want to delete room "${roomName}"? This will disconnect all participants.`,
			)
		) {
			return;
		}

		try {
			setError(null);

			log.info("Deleting room", { roomName });

			const response = await fetch("/api/room-management", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "delete",
					roomName,
				}),
			});

			if (!response.ok) {
				throw new Error(`Failed to delete room: ${response.statusText}`);
			}

			log.success("Room deleted successfully", { roomName });

			// Refresh the room list
			await loadRooms();

			// Clear selection if the deleted room was selected
			if (selectedRoom === roomName) {
				onRoomSelected("");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to delete room";
			setError(errorMessage);
			log.error("Failed to delete room", { error: err });
		}
	};

	const initializeDefaultRooms = async () => {
		try {
			setInitializing(true);
			setError(null);

			log.info("Initializing default rooms");

			const response = await fetch("/api/initialize-rooms");
			if (!response.ok) {
				throw new Error(`Failed to initialize rooms: ${response.statusText}`);
			}

			const data = await response.json();
			log.success("Default rooms initialized", {
				summary: data.summary,
			});

			// Refresh the room list
			await loadRooms();
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to initialize default rooms";
			setError(errorMessage);
			log.error("Failed to initialize default rooms", { error: err });
		} finally {
			setInitializing(false);
		}
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp * 1000).toLocaleString();
	};

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					Room Management
					<Button
						onClick={loadRooms}
						variant="outline"
						size="sm"
						disabled={loading}
					>
						{loading ? "Loading..." : "Refresh"}
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
						{error}
					</div>
				)}

				{/* Create New Room */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">Create New Room</h3>
						<Button
							onClick={initializeDefaultRooms}
							variant="outline"
							size="sm"
							disabled={initializing}
						>
							{initializing ? "Initializing..." : "Create Default Rooms"}
						</Button>
					</div>
					<div className="flex gap-2">
						<Input
							value={newRoomName}
							onChange={(e) => setNewRoomName(e.target.value)}
							placeholder="Enter room name"
							onKeyDown={(e) => {
								if (e.key === "Enter" && !creating) {
									createRoom();
								}
							}}
						/>
						<Button
							onClick={createRoom}
							disabled={!newRoomName.trim() || creating}
						>
							{creating ? "Creating..." : "Create"}
						</Button>
					</div>
				</div>

				{/* Existing Rooms */}
				<div className="space-y-2">
					<h3 className="text-sm font-medium">
						Existing Rooms ({rooms.length})
					</h3>

					{loading ? (
						<div className="text-center py-4 text-gray-500">
							Loading rooms...
						</div>
					) : rooms.length === 0 ? (
						<div className="text-center py-4 text-gray-500">
							No rooms available. Create one above.
						</div>
					) : (
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{rooms.map((room) => (
								<div
									key={room.sid}
									className="flex items-center justify-between"
								>
									<button
										key={room.sid}
										type="button"
										className={`w-full p-3 border rounded-lg cursor-pointer transition-colors text-left ${
											selectedRoom === room.name
												? "border-blue-500 bg-blue-50"
												: "border-gray-200 hover:border-gray-300"
										}`}
										onClick={() => onRoomSelected(room.name)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												onRoomSelected(room.name);
											}
										}}
									>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">{room.name}</span>
													{selectedRoom === room.name && (
														<Badge variant="default" className="text-xs">
															Selected
														</Badge>
													)}
												</div>
												<div className="text-xs text-gray-500 mt-1">
													Participants: {room.numParticipants} /{" "}
													{room.maxParticipants}
												</div>
												<div className="text-xs text-gray-500">
													Created: {formatDate(room.creationTime)}
												</div>
											</div>
										</div>
									</button>
									<div className="flex items-center gap-2">
										{room.numParticipants > 0 && (
											<Badge variant="secondary" className="text-xs">
												Active
											</Badge>
										)}
										<Button
											onClick={(e) => {
												e.stopPropagation();
												deleteRoom(room.name);
											}}
											variant="destructive"
											size="sm"
											className="text-xs"
										>
											Delete
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
