"use client";

import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { TrackLoop } from "@livekit/components-react";
import { cn } from "@/lib/utils";

interface SimpleVideoGridProps {
	tracks: TrackReferenceOrPlaceholder[];
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function SimpleVideoGrid({
	tracks,
	children,
	className,
	style,
	...props
}: SimpleVideoGridProps & React.HTMLAttributes<HTMLDivElement>) {
	// Calculate optimal grid columns based on number of tracks
	const getGridColumns = (count: number) => {
		if (count <= 1) return 1;
		if (count <= 4) return 2;
		if (count <= 9) return 3;
		if (count <= 16) return 4;
		return Math.ceil(Math.sqrt(count));
	};

	const gridColumns = getGridColumns(tracks.length);

	return (
		<div
			className={cn("simple-video-grid", className)}
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
				gap: "16px",
				padding: "16px",
				height: "100%",
				width: "100%",
				...style,
			}}
			{...props}
		>
			<TrackLoop tracks={tracks}>{children}</TrackLoop>
		</div>
	);
}
