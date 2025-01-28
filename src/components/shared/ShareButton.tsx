"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ShareButtonProps {
  storyId: string;
  title: string;
  summary?: string;
  className?: string;
}

const ShareButton = ({ storyId, title, summary, className }: ShareButtonProps) => {
  const { toast } = useToast();
  
  const handleCopy = async () => {
    // Construct the URL for the story
    const storyUrl = `${window.location.origin}/story/${storyId}`;
    
    // Create a rich share message that includes the story details
    const shareMessage = [
      title,
      summary,
      '',  // Empty line for spacing
      `Read more: ${storyUrl}`
    ].filter(Boolean).join('\n');
    
    try {
      // Copy the enhanced message to clipboard
      await navigator.clipboard.writeText(shareMessage);
      toast({
        title: "Copied to clipboard",
        description: "Story details and link have been copied to your clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error copying link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      onClick={handleCopy}
      variant="ghost" 
      size="sm"
      className={className}
    >
      <Share className="h-4 w-4 mr-2" />
      Share
    </Button>
  );
};

export default ShareButton;