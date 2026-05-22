import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VoiceInArticleProps {
  onGenerated: (article: { title: string; excerpt: string; body_html: string }) => void;
}

// Minimal types for the Web Speech API (not in lib.dom.d.ts on all platforms).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInArticle({ onGenerated }: VoiceInArticleProps) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [generating, setGenerating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTranscriptRef = useRef("");

  const speechSupported = !!getSpeechRecognitionCtor();

  // Stop recognition on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const startListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Spracherkennung wird in diesem Browser nicht unterstützt. Bitte Text eingeben.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;

    // Snapshot the existing transcript so new utterances append rather than replace
    baseTranscriptRef.current = transcript ? transcript.trim() + " " : "";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      setTranscript((baseTranscriptRef.current + finalText + interimText).trimStart());
    };

    recognition.onerror = (event) => {
      console.warn("[VoiceInArticle] recognition error", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error(`Spracherkennungsfehler: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (e) {
      console.error("[VoiceInArticle] start failed", e);
      toast.error("Mikrofon konnte nicht gestartet werden");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  const toggleMic = () => (listening ? stopListening() : startListening());

  const generate = async () => {
    const trimmed = transcript.trim();
    if (trimmed.length < 10) {
      toast.error("Bitte etwas mehr einsprechen oder eingeben (mind. 10 Zeichen).");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        title?: string;
        excerpt?: string;
        body_html?: string;
        error?: string;
      }>("generate-article", {
        body: { transcript: trimmed },
      });

      if (error) {
        // supabase-js wraps non-2xx as a generic FunctionsHttpError with message
        // "Edge Function returned a non-2xx status code". The real reason is in
        // the response body — try to read it.
        let real = error.message || "Edge-Function-Fehler";
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const text = await ctx.text();
            try {
              const parsed = JSON.parse(text);
              real = parsed?.error || text || real;
            } catch {
              real = text || real;
            }
          } catch {
            // keep `real` as-is
          }
        }
        throw new Error(real);
      }

      if (!data || data.error) throw new Error(data?.error || "Leere Antwort");
      if (!data.title || !data.body_html) throw new Error("Antwort unvollständig");

      onGenerated({
        title: data.title,
        excerpt: data.excerpt ?? "",
        body_html: data.body_html,
      });
      toast.success("Artikel-Entwurf erstellt — bitte prüfen und ggf. anpassen.");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error("KI-Generierung fehlgeschlagen", { description: message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Per Sprache diktieren (KI)
        </Label>
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          size="sm"
          onClick={toggleMic}
          disabled={!speechSupported || generating}
        >
          {listening ? (
            <>
              <MicOff className="h-4 w-4 mr-1.5" /> Stopp
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-1.5" /> Aufnahme starten
            </>
          )}
        </Button>
      </div>

      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={4}
        placeholder={
          speechSupported
            ? "Mikrofon-Aufnahme erscheint hier — du kannst den Text auch korrigieren oder direkt eingeben."
            : "Spracherkennung in diesem Browser nicht verfügbar — bitte den Text direkt eingeben."
        }
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {speechSupported
            ? "Sprache: Deutsch. Funktioniert am besten in Chrome/Edge."
            : "Tipp: Chrome oder Edge nutzen, um den Mikrofon-Modus zu aktivieren."}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={generating || transcript.trim().length < 10}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Erstelle Artikel…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" /> Artikel mit KI erstellen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
