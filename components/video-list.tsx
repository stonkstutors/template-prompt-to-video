"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";
import { Video, Clock, Layers, ExternalLink, RefreshCw } from "lucide-react";

interface VideoItem {
  slug: string;
  title: string;
  createdAt: string;
  thumbnailUrl: string | null;
  segmentCount: number;
  textCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VideoListProps {
  onSelectVideo?: (slug: string) => void;
}

export function VideoList({ onSelectVideo }: VideoListProps) {
  const { data, error, isLoading, mutate } = useSWR<{ videos: VideoItem[] }>(
    "/api/videos",
    fetcher,
    { refreshInterval: 10000 }
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Videos Gerados</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Videos Gerados</h2>
        <p className="text-sm text-destructive">Erro ao carregar videos.</p>
      </div>
    );
  }

  const videos = data?.videos || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Videos Gerados</h2>
        <button
          onClick={() => mutate()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            "transition-all duration-200"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12">
          <Video className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum video gerado ainda.
          </p>
          <p className="text-xs text-muted-foreground">
            Use o formulario acima para criar seu primeiro video.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.slug}
              video={video}
              onClick={() => onSelectVideo?.(video.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({
  video,
  onClick,
}: {
  video: VideoItem;
  onClick?: () => void;
}) {
  const formattedDate = new Date(video.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "hover:border-primary/50 hover:bg-card/80",
        "transition-all duration-200 text-left"
      )}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-secondary">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">
            {video.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {video.segmentCount} cenas
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-3.5 w-3.5" />
          Ver detalhes
        </div>
      </div>
    </button>
  );
}
