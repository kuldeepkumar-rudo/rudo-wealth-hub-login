import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default install prompt
      e.preventDefault();
      
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Show our custom install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    // Show the native install prompt
    await installPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await installPrompt.userChoice;
    
    console.log(`[PWA] User ${outcome} the install prompt`);

    // Clear the saved prompt
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Install NRI Wealth App</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Install our app for quick access and offline support
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall} 
                  size="sm"
                  data-testid="button-install-pwa"
                >
                  Install
                </Button>
                <Button 
                  onClick={handleDismiss} 
                  variant="outline" 
                  size="sm"
                  data-testid="button-dismiss-pwa"
                >
                  Not Now
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={handleDismiss}
              data-testid="button-close-pwa"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
