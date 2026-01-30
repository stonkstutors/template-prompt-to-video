"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2, FileText, Image, AudioLines, Layers, Sparkles } from "lucide-react";

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const STEPS: ProgressStep[] = [
  { id: "story", label: "Historia", icon: <FileText className="h-4 w-4" /> },
  { id: "descriptions", label: "Descricoes", icon: <FileText className="h-4 w-4" /> },
  { id: "images", label: "Imagens", icon: <Image className="h-4 w-4" /> },
  { id: "audio", label: "Audio", icon: <AudioLines className="h-4 w-4" /> },
  { id: "timeline", label: "Timeline", icon: <Layers className="h-4 w-4" /> },
  { id: "complete", label: "Concluido", icon: <Sparkles className="h-4 w-4" /> },
];

interface ProgressTrackerProps {
  currentStep: string;
  progress: number;
  detail?: string;
  isVisible: boolean;
}

export function ProgressTracker({
  currentStep,
  progress,
  detail,
  isVisible,
}: ProgressTrackerProps) {
  if (!isVisible) return null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progresso</span>
          <span className="text-sm text-muted-foreground">
            {currentStepIndex + 1} de {STEPS.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${((currentStepIndex + progress / 100) / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {detail && (
        <p className="text-sm text-muted-foreground animate-pulse">{detail}</p>
      )}

      <div className="flex flex-col gap-3">
        {STEPS.map((step, index) => {
          const isComplete = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 transition-all duration-300",
                isComplete && "bg-primary/10",
                isCurrent && "bg-secondary",
                isPending && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 text-primary",
                  isPending && "bg-secondary text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isComplete && "text-primary",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {progress}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
