"use client";

import { useState, useCallback } from "react";
import { VideoGeneratorForm } from "@/components/video-generator-form";
import { ProgressTracker } from "@/components/progress-tracker";
import { VideoList } from "@/components/video-list";
import { useSWRConfig } from "swr";
import { Video, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressState {
  step: string;
  progress: number;
  detail?: string;
}

export default function Home() {
  const { mutate } = useSWRConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    step: "",
    progress: 0,
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const handleGenerationStart = useCallback(() => {
    setIsGenerating(true);
    setProgressState({ step: "story", progress: 0 });
    setNotification(null);
  }, []);

  const handleGenerationComplete = useCallback(
    (slug: string) => {
      setIsGenerating(false);
      setProgressState({ step: "", progress: 0 });
      setNotification({
        type: "success",
        message: `Video "${slug}" gerado com sucesso!`,
      });
      mutate("/api/videos");

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    },
    [mutate]
  );

  const handleProgress = useCallback(
    (step: string, progress: number, detail?: string) => {
      setProgressState({ step, progress, detail });
    },
    []
  );

  const handleError = useCallback((error: string) => {
    setIsGenerating(false);
    setProgressState({ step: "", progress: 0 });
    setNotification({
      type: "error",
      message: error,
    });
  }, []);

  const handleSelectVideo = useCallback((slug: string) => {
    setSelectedVideo(slug);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                AI Video Generator
              </h1>
              <p className="text-xs text-muted-foreground">
                Crie videos para TikTok e Instagram
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3",
              notification.type === "success" &&
                "bg-primary/10 text-primary border border-primary/20",
              notification.type === "error" &&
                "bg-destructive/10 text-destructive border border-destructive/20"
            )}
          >
            {notification.type === "success" ? (
              <Check className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span className="text-sm font-medium flex-1">
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-background/50 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Left Column - Form and Progress */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 text-lg font-semibold text-foreground">
                Novo Video
              </h2>
              <VideoGeneratorForm
                onGenerationStart={handleGenerationStart}
                onGenerationComplete={handleGenerationComplete}
                onProgress={handleProgress}
                onError={handleError}
                disabled={isGenerating}
              />
            </div>

            <ProgressTracker
              currentStep={progressState.step}
              progress={progressState.progress}
              detail={progressState.detail}
              isVisible={isGenerating}
            />
          </div>

          {/* Right Column - Video List */}
          <div>
            <VideoList onSelectVideo={handleSelectVideo} />
          </div>
        </div>
      </div>

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedVideo}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-lg p-2 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Para visualizar o video renderizado, execute o Remotion Studio:
                </p>
                <code className="rounded-lg bg-secondary px-4 py-3 font-mono text-sm text-foreground">
                  npm run dev:remotion
                </code>
                <p className="text-sm text-muted-foreground">
                  Ou renderize o video final:
                </p>
                <code className="rounded-lg bg-secondary px-4 py-3 font-mono text-sm text-foreground">
                  npx remotion render src/index.ts AIVideo out/{selectedVideo}.mp4
                </code>

                <div className="mt-4 rounded-lg border border-border p-4">
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Arquivos do Projeto
                  </h4>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <li>
                      <code className="text-primary">/public/content/{selectedVideo}/</code>
                    </li>
                    <li className="pl-4">- timeline.json</li>
                    <li className="pl-4">- descriptor.json</li>
                    <li className="pl-4">- images/</li>
                    <li className="pl-4">- audio/</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
