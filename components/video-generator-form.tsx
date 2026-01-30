"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoGeneratorFormProps {
  onGenerationStart: () => void;
  onGenerationComplete: (slug: string) => void;
  onProgress: (step: string, progress: number, detail?: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function VideoGeneratorForm({
  onGenerationStart,
  onGenerationComplete,
  onProgress,
  onError,
  disabled,
}: VideoGeneratorFormProps) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !topic.trim()) {
      onError("Por favor, preencha o titulo e o topico.");
      return;
    }

    setIsLoading(true);
    onGenerationStart();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar video");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Nao foi possivel iniciar o stream");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.done && data.slug) {
                onGenerationComplete(data.slug);
                setTitle("");
                setTopic("");
              } else if (data.step) {
                onProgress(data.step, data.progress, data.detail);
              }
            } catch {
              // Ignore JSON parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Titulo do Video
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: The History of Venus"
          disabled={isDisabled}
          className={cn(
            "w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="topic" className="text-sm font-medium text-foreground">
          Topico
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Interesting Facts, History, Science"
          disabled={isDisabled}
          className={cn(
            "w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled || !title.trim() || !topic.trim()}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          "transition-all duration-200"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Gerar Video
          </>
        )}
      </button>
    </form>
  );
}
