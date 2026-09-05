// ─── CUSTOM HOOK'LAR ──────────────────────────────────────────────────────────
// Hikaye oluşturma ve agent durum yönetimi için React hook'ları.

import { useState, useCallback, useRef, useEffect } from 'react';
import { storyApi, agentApi, Story, AgentType, JobStatus } from '../services/api';

export type AgentStatuses = Record<AgentType, JobStatus | null>;

// ─── useStoryGeneration ───────────────────────────────────────────────────────
// Hikaye oluşturma akışını yöneten ana hook.
// Akış: prompt → POST /generate → story state güncelle
export function useStoryGeneration() {
  const [story, setStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateStory = useCallback(async (prompt: string, language = 'tr') => {
    setIsGenerating(true);
    setError(null);
    setStory(null);

    try {
      const result = await storyApi.generate(prompt, language);
      setStory(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hikaye oluşturulamadı';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const loadStory = useCallback(async (id: string) => {
    try {
      const result = await storyApi.getById(id);
      setStory(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hikaye yüklenemedi';
      setError(message);
      throw err;
    }
  }, []);

  const clearStory = useCallback(() => {
    setStory(null);
    setError(null);
  }, []);

  return { story, setStory, isGenerating, error, generateStory, loadStory, clearStory };
}

// ─── useAgentStatus ───────────────────────────────────────────────────────────
// Her agent'ın durumunu yöneten hook.
// Agent tetikleme ve durum güncellemelerini koordine eder.
export function useAgentStatus(storyId: string | null) {
  const [statuses, setStatuses] = useState<AgentStatuses>({
    STORY: null,
    TTS: null,
    IMAGE: null,
    MUSIC: null,
    VIDEO: null,
    COLORING: null,
  });

  const [agentResults, setAgentResults] = useState<Partial<Record<AgentType, string>>>({});
  const activeAgents = useRef<Set<AgentType>>(new Set());

  // Agent durumunu güncelle
  const updateStatus = useCallback((agentType: AgentType, status: JobStatus) => {
    setStatuses(prev => ({ ...prev, [agentType]: status }));
  }, []);

  // Agent sonucunu kaydet (URL)
  const saveResult = useCallback((agentType: AgentType, url: string) => {
    setAgentResults(prev => ({ ...prev, [agentType]: url }));
  }, []);

  // Genel agent tetikleme fonksiyonu
  const triggerAgent = useCallback(async (
    agentType: AgentType,
    apiFn: () => Promise<{ url: string; agentType: string }>
  ) => {
    if (!storyId || activeAgents.current.has(agentType)) return;

    activeAgents.current.add(agentType);
    updateStatus(agentType, 'RUNNING');

    try {
      const result = await apiFn();
      updateStatus(agentType, 'COMPLETED');
      saveResult(agentType, result.url);
      return result.url;
    } catch (err) {
      updateStatus(agentType, 'FAILED');
      const message = err instanceof Error ? err.message : 'Agent hatası';
      throw new Error(message);
    } finally {
      activeAgents.current.delete(agentType);
    }
  }, [storyId, updateStatus, saveResult]);

  // Bireysel agent tetikleyicileri
  const triggerTTS = useCallback(() =>
    triggerAgent('TTS', () => agentApi.generateTTS(storyId!)),
    [storyId, triggerAgent]
  );

  const triggerImage = useCallback(() =>
    triggerAgent('IMAGE', () => agentApi.generateImage(storyId!)),
    [storyId, triggerAgent]
  );

  const triggerMusic = useCallback(() =>
    triggerAgent('MUSIC', () => agentApi.generateMusic(storyId!)),
    [storyId, triggerAgent]
  );

  const triggerVideo = useCallback(() =>
    triggerAgent('VIDEO', () => agentApi.generateVideo(storyId!)),
    [storyId, triggerAgent]
  );

  const triggerColoring = useCallback(() =>
    triggerAgent('COLORING', () => agentApi.generateColoring(storyId!)),
    [storyId, triggerAgent]
  );

  // storyId değişince durumları sıfırla
  useEffect(() => {
    if (storyId) {
      setStatuses({ STORY: 'COMPLETED', TTS: null, IMAGE: null, MUSIC: null, VIDEO: null, COLORING: null });
      setAgentResults({});
      activeAgents.current.clear();
    }
  }, [storyId]);

  return {
    statuses,
    agentResults,
    triggerTTS,
    triggerImage,
    triggerMusic,
    triggerVideo,
    triggerColoring,
  };
}
