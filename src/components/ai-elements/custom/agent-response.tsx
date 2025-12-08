"use client";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  ShareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  SparklesIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";

export interface Source {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export type AgentResponseProps = ComponentProps<"div"> & {
  content: string;
  sources?: Source[];
  agentName?: string;
  agentIcon?: ReactNode;
  isStreaming?: boolean;
  showActions?: boolean;
  onCopy?: () => void;
  onShare?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (_positive: boolean) => void;
};

function TypingText({
  text,
  speed = 15,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayed.length < text.length) {
      const timer = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, speed);
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayed, text, speed, isComplete, onComplete]);

  useEffect(() => {
    setDisplayed("");
    setIsComplete(false);
  }, [text]);

  return (
    <span>
      {displayed}
      {!isComplete && (
        <span className="animate-pulse text-primary">▊</span>
      )}
    </span>
  );
}

function InlineSource({ source }: { source: Source }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
              "bg-primary/10 text-primary hover:bg-primary/20",
              "text-xs font-medium transition-colors"
            )}
          >
            {source.favicon !== undefined && source.favicon !== "" ? (
              <img
                src={source.favicon}
                alt=""
                className="size-3 rounded-sm"
              />
            ) : (
              <ExternalLinkIcon className="size-3" />
            )}
            <span className="max-w-[120px] truncate">{source.title}</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{source.title}</p>
          <p className="text-xs text-muted-foreground truncate">{source.url}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {return null;}

  return (
    <div className="mt-4 space-y-2">
      <h4 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ExternalLinkIcon className="size-3" />
        Sources ({sources.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <InlineSource key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}

export const AgentResponse = ({
  content,
  sources = [],
  agentName = "Assistant",
  agentIcon,
  isStreaming = false,
  showActions = true,
  onCopy,
  onShare,
  onRegenerate,
  onFeedback,
  className,
  ...props
}: AgentResponseProps) => {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [showFullContent, setShowFullContent] = useState(!isStreaming);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  }, [content, onCopy]);

  const handleFeedback = useCallback(
    (positive: boolean) => {
      setFeedbackGiven(positive);
      onFeedback?.(positive);
    },
    [onFeedback]
  );

  return (
    <div className={cn("group", className)} {...props}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative rounded-2xl border bg-card p-4 shadow-sm",
          "hover:shadow-md transition-shadow"
        )}
      >
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
          )}
        >
          {agentIcon ?? <BotIcon className="size-4" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{agentName}</span>
          {isStreaming && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <SparklesIcon className="size-3 animate-pulse" />
              Generating
            </Badge>
          )}
        </div>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        {isStreaming && !showFullContent ? (
          <TypingText
            text={content}
            speed={10}
            onComplete={() => setShowFullContent(true)}
          />
        ) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
      </div>

      {sources.length > 0 && <SourcesList sources={sources} />}

      {showActions && !isStreaming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "mt-4 flex items-center gap-1 border-t pt-3",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5 text-emerald-500" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy response</TooltipContent>
            </Tooltip>

            {onShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5"
                    onClick={onShare}
                  >
                    <ShareIcon className="size-3.5" />
                    <span className="text-xs">Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share response</TooltipContent>
              </Tooltip>
            )}

            {onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5"
                    onClick={onRegenerate}
                  >
                    <RefreshCwIcon className="size-3.5" />
                    <span className="text-xs">Regenerate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate response</TooltipContent>
              </Tooltip>
            )}

            <div className="flex-1" />

            {onFeedback && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={feedbackGiven === true ? "secondary" : "ghost"}
                      className="h-8 w-8 p-0"
                      onClick={() => handleFeedback(true)}
                    >
                      <ThumbsUpIcon
                        className={cn(
                          "size-3.5",
                          feedbackGiven === true && "text-emerald-500"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Good response</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={feedbackGiven === false ? "secondary" : "ghost"}
                      className="h-8 w-8 p-0"
                      onClick={() => handleFeedback(false)}
                    >
                      <ThumbsDownIcon
                        className={cn(
                          "size-3.5",
                          feedbackGiven === false && "text-red-500"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bad response</TooltipContent>
                </Tooltip>
              </div>
            )}
          </TooltipProvider>
        </motion.div>
      )}
      </motion.div>
    </div>
  );
};

export type AgentAvatarProps = ComponentProps<"div"> & {
  name?: string;
  icon?: ReactNode;
  gradient?: string;
};

export const AgentAvatar = ({
  name = "AI",
  icon,
  gradient = "from-violet-500 to-purple-600",
  className,
  ...props
}: AgentAvatarProps) => (
  <div
    className={cn(
      "flex size-10 items-center justify-center rounded-full",
      "bg-gradient-to-br text-white font-medium",
      gradient,
      className
    )}
    title={name}
    {...props}
  >
    {icon ?? name.charAt(0).toUpperCase()}
  </div>
);
