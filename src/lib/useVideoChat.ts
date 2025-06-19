import Peer from "peerjs";
import { publicIpv4 } from "public-ip";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { PEER_SERVER, SOCKET_SERVER } from "@/config/network";

// Type for video stats
export type VideoStats = {
	bitrate?: number;
	width?: number;
	height?: number;
	codec?: string;
	framesPerSecond?: number;
	framesDecoded?: number;
	framesDropped?: number;
	jitter?: number;
	packetsLost?: number;
	packetsReceived?: number;
	frameDelay?: number;
};

export function useVideoChat() {
	const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
	const [stats, setStats] = useState<{ [id: string]: VideoStats }>({});
	const localStream = useRef<MediaStream | null>(null);
	const peerInstance = useRef<Peer | null>(null);
	const socketRef = useRef<ReturnType<typeof io> | null>(null);
	const dataChannels = useRef<{ [id: string]: RTCDataChannel }>({});
	const peerConnections = useRef<{ [id: string]: RTCPeerConnection }>({});

	// Add local stream to peers for unified rendering
	const allPeers = { local: localStream.current, ...peers };

	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({ video: true, audio: true })
			.then(async (stream) => {
				localStream.current = stream;
				setPeers((prev) => ({ ...prev }));
				if (localStream.current) {
					// Set max video bitrate (e.g., 300 kbps)
					const videoTrack = stream.getVideoTracks()[0];
					if (videoTrack) {
						// @ts-ignore
						const sender = (window as any).RTCRtpSender?.getSenders
							? (window as any).RTCRtpSender.getSenders().find(
									(s: any) => s.track === videoTrack,
								)
							: null;
						if (sender?.setParameters) {
							const params = sender.getParameters();
							if (!params.encodings) params.encodings = [{}];
							params.encodings[0].maxBitrate = 300_000;
							await sender.setParameters(params);
						}
					}
					// Init PeerJS
					const peer = new Peer({
						host: PEER_SERVER.host,
						port: PEER_SERVER.port,
						path: PEER_SERVER.path,
						secure: PEER_SERVER.secure,
					});
					peerInstance.current = peer;
					peer.on("open", (id) => {
						const socket = io(SOCKET_SERVER, {
							transports: ["websocket"],
							secure: true,
						});
						socketRef.current = socket;
						socket.emit("join-room", id);
						socket.on("peer-list", (peerList: string[]) => {
							peerList
								.filter((pid) => pid !== id)
								.forEach((pid) => {
									const call = peer.call(pid, stream);
									if (call) {
										call.on("stream", (remoteStream) => {
											console.log(
												"[peer-list] Received remote stream from",
												pid,
												remoteStream,
											);
											setPeers((prev) => ({ ...prev, [pid]: remoteStream }));
											if (call.peerConnection) {
												peerConnections.current[pid] = call.peerConnection;
											}
										});
										call.on("close", () => {
											console.log("[peer-list] Call closed for", pid);
										});
										call.on("error", (err) => {
											console.error("[peer-list] Call error for", pid, err);
										});
									}
								});
						});
						socket.on("peer-joined", (pid: string) => {
							if (pid !== id) {
								const call = peer.call(pid, stream);
								if (call) {
									call.on("stream", (remoteStream) => {
										console.log(
											"[peer-joined] Received remote stream from",
											pid,
											remoteStream,
										);
										setPeers((prev) => ({ ...prev, [pid]: remoteStream }));
										if (call.peerConnection) {
											peerConnections.current[pid] = call.peerConnection;
										}
									});
									call.on("close", () => {
										console.log("[peer-joined] Call closed for", pid);
									});
									call.on("error", (err) => {
										console.error("[peer-joined] Call error for", pid, err);
									});
								}
							}
						});
						socket.on("peer-left", (pid: string) => {
							setPeers((prev) => {
								const copy = { ...prev };
								delete copy[pid];
								return copy;
							});
						});
					});
					peer.on("call", (call) => {
						call.answer(stream);
						call.on("stream", (remoteStream) => {
							console.log(
								"[incoming call] Received remote stream from",
								call.peer,
								remoteStream,
							);
							setPeers((prev) => ({ ...prev, [call.peer]: remoteStream }));
							if (call.peerConnection) {
								peerConnections.current[call.peer] = call.peerConnection;
							}
						});
						// Listen for keep-alive data channel on incoming calls
						if (call.peerConnection) {
							call.peerConnection.ondatachannel = (event) => {
								if (event.channel.label === "keepalive") {
									const dc = event.channel;
									dc.onopen = () => {
										console.log(
											"Keep-alive data channel open (incoming)",
											call.peer,
										);
									};
									dc.onclose = () => {
										console.log(
											"Keep-alive data channel closed (incoming)",
											call.peer,
										);
									};
									dataChannels.current[call.peer] = dc;
								}
							};
						}
						call.on("close", () => {
							console.log("[incoming call] Call closed for", call.peer);
						});
						call.on("error", (err) => {
							console.error("[incoming call] Call error for", call.peer, err);
						});
					});
					peerInstance.current.on("connection", (conn) => {
						conn.peerConnection.addEventListener(
							"iceconnectionstatechange",
							() => {
								console.log(
									"ICE state:",
									conn.peerConnection.iceConnectionState,
								);
							},
						);
						conn.peerConnection.addEventListener(
							"connectionstatechange",
							() => {
								console.log(
									"Peer connection state:",
									conn.peerConnection.connectionState,
								);
							},
						);
					});
					// Init
					localStream.current.getVideoTracks()[0].onended = () =>
						console.log("[local] Video track ended");
					localStream.current.getVideoTracks()[0].onmute = () =>
						console.log("[local] Video track muted");
					localStream.current.getVideoTracks()[0].onunmute = () =>
						console.log("[local] Video track unmuted");
				}
			});
		return () => {
			peerInstance.current?.destroy();
			localStream.current?.getTracks().forEach((track) => track.stop());
			socketRef.current?.disconnect();
		};
	}, []);

	// Periodically poll stats for each peer connection
	useEffect(() => {
		const interval = setInterval(() => {
			Object.entries(peerConnections.current).forEach(([id, pc]) => {
				pc.getStats(null).then((report) => {
					let bitrate: number | undefined;
					let width: number | undefined;
					let height: number | undefined;
					let codec: string | undefined;
					let framesPerSecond: number | undefined;
					let framesDecoded: number | undefined;
					let framesDropped: number | undefined;
					let jitter: number | undefined;
					let packetsLost: number | undefined;
					let packetsReceived: number | undefined;
					let frameDelay: number | undefined;
					let codecId: string | undefined;
					// Use generic Record<string, unknown> for statsMap and stat typing for compatibility
					const statsMap: Record<string, Record<string, unknown>> = {};
					report.forEach((stat) => {
						const s = stat as Record<string, unknown>;
						statsMap[s.id as string] = s;
						if (s.type === "inbound-rtp" && s.kind === "video") {
							if (typeof s.bytesReceived === "number") {
								bitrate = s.bytesReceived;
							}
							if (typeof s.codecId === "string") {
								codecId = s.codecId;
							}
							if (typeof s.jitter === "number") {
								jitter = s.jitter;
							}
							if (typeof s.packetsLost === "number") {
								packetsLost = s.packetsLost;
							}
							if (typeof s.packetsReceived === "number") {
								packetsReceived = s.packetsReceived;
							}
						}
						if (
							s.type === "track" &&
							typeof s.frameWidth === "number" &&
							typeof s.frameHeight === "number"
						) {
							width = s.frameWidth as number;
							height = s.frameHeight as number;
						}
						if (s.type === "track") {
							if (typeof s.framesPerSecond === "number") {
								framesPerSecond = s.framesPerSecond as number;
							}
							if (typeof s.framesDecoded === "number") {
								framesDecoded = s.framesDecoded as number;
							}
							if (typeof s.framesDropped === "number") {
								framesDropped = s.framesDropped as number;
							}
							if (
								typeof s.totalDecodeTime === "number" &&
								typeof s.framesDecoded === "number" &&
								(s.framesDecoded as number) > 0
							) {
								frameDelay =
									(s.totalDecodeTime as number) / (s.framesDecoded as number);
							}
						}
					});
					if (codecId && statsMap[codecId]) {
						const codecStat = statsMap[codecId];
						if (typeof codecStat.mimeType === "string") {
							codec = codecStat.mimeType;
						}
					}
					setStats((prev) => ({
						...prev,
						[id]: {
							bitrate,
							width,
							height,
							codec,
							framesPerSecond,
							framesDecoded,
							framesDropped,
							jitter,
							packetsLost,
							packetsReceived,
							frameDelay,
						},
					}));
				});
			});
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	// Periodically send keep-alive pings
	useEffect(() => {
		const interval = setInterval(() => {
			// Remove unused parameter warning for dataChannels
			Object.values(dataChannels.current).forEach((dc) => {
				if (dc.readyState === "open") {
					dc.send("ping");
				}
			});
		}, 5000);
		return () => clearInterval(interval);
	}, []);

	return {
		allPeers,
		stats,
	};
}

export function useWanIp() {
	const [wanIp, setWanIp] = useState<string | null>(null);
	useEffect(() => {
		publicIpv4()
			.then((ip: string) => setWanIp(ip))
			.catch(() => setWanIp("Unavailable"));
	}, []);
	return wanIp;
}
