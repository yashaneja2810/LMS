import React, { createContext, useContext, useState } from 'react';

export interface Subtopic {
  title: string;
  summary: string;
}

export interface SubtopicContent {
  documentation?: string;
  videos?: any[];
  websites?: string[];
}

interface StudyMaterialContextType {
  topic: string;
  subtopics: Subtopic[];
  subtopicContent: Record<string, SubtopicContent>;
  setTopic: (t: string) => void;
  setSubtopics: (s: Subtopic[]) => void;
  setSubtopicContent: (c: Record<string, SubtopicContent>) => void;
}

const StudyMaterialContext = createContext<StudyMaterialContextType | undefined>(undefined);

export function StudyMaterialProvider({ children }: { children: React.ReactNode }) {
  const [topic, setTopic] = useState('');
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subtopicContent, setSubtopicContent] = useState<Record<string, SubtopicContent>>({});

  return (
    <StudyMaterialContext.Provider value={{ topic, subtopics, subtopicContent, setTopic, setSubtopics, setSubtopicContent }}>
      {children}
    </StudyMaterialContext.Provider>
  );
}

export function useStudyMaterial() {
  const ctx = useContext(StudyMaterialContext);
  if (!ctx) throw new Error('useStudyMaterial must be used within StudyMaterialProvider');
  return ctx;
} 