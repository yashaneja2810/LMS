import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStudyMaterial } from './StudyMaterialContext';
import MonacoEditor from '@monaco-editor/react';

// Improved code block detection: only treat as code if block contains typical code characters
function isLikelyCode(str: string): boolean {
  // Heuristic: contains at least one semicolon, curly brace, assignment, function, import, or similar
  return /[;{}=()<>]|function |def |class |#include|import |console\.|System\.|print\(|public |private |let |const |var /.test(str);
}

function parseGeminiContent(raw: string): Array<{ type: 'text' | 'code', content: string, language?: string }> {
  if (!raw) return [];
  let cleaned = raw
    .replace(/\*\*/g, '')
    .replace(/^#+\s?/gm, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const blocks: Array<{ type: 'text' | 'code', content: string, language?: string }> = [];
  const regex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: cleaned.slice(lastIndex, match.index).trim() });
    }
    const codeContent = match[2].trim();
    if (isLikelyCode(codeContent)) {
      blocks.push({ type: 'code', content: codeContent, language: match[1] || 'plaintext' });
    } else {
      blocks.push({ type: 'text', content: codeContent });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleaned.length) {
    blocks.push({ type: 'text', content: cleaned.slice(lastIndex).trim() });
  }
  return blocks.filter(b => b.content);
}

function proseToBullets(text: string): string[] {
  // Split by newlines or periods, filter out empty lines, trim
  return text
    .split(/\n|(?<=\.) /)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function SubtopicDetail() {
  const { topic = '', subtopic = '' } = useParams();
  const { subtopicContent } = useStudyMaterial();
  const decodedSubtopic = decodeURIComponent(subtopic);
  const content = subtopicContent[decodedSubtopic];

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <Link to={`/study`} className="text-blue-500 hover:text-blue-700 underline mb-4 inline-block">&larr; Back to Study Material</Link>
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6 text-center drop-shadow">{decodedSubtopic.replace(/%20/g, ' ')}</h1>
      {!content && (
        <div className="text-red-500 text-center font-semibold bg-red-50 border border-red-200 rounded-xl p-6 shadow">No data found for this subtopic. Please go back and generate the topic again.</div>
      )}
      {content && (
        <>
          {content.documentation && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100 mb-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-4">Documentation</h2>
              <div className="space-y-6">
                {parseGeminiContent(content.documentation).map((block, idx) =>
                  block.type === 'code' && block.content.trim() ? (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <MonacoEditor
                        height="300px"
                        defaultLanguage={block.language}
                        value={block.content}
                        theme="vs-dark"
                        options={{ readOnly: true, fontSize: 15, minimap: { enabled: false } }}
                      />
                    </div>
                  ) : block.type === 'text' && block.content.trim() ? (
                    <ul key={idx} className="list-disc pl-6 space-y-2 text-slate-800 text-base leading-relaxed">
                      {proseToBullets(block.content).map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  ) : null
                )}
              </div>
            </div>
          )}
          {content.videos && content.videos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100 mb-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-4">Related YouTube Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.videos.map((video: any) => (
                  <a
                    key={video.id.videoId}
                    href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-50 rounded-lg overflow-hidden border border-blue-100 hover:border-blue-400 transition-all shadow"
                  >
                    <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="w-full h-40 object-cover" />
                    <div className="p-3">
                      <div className="font-semibold text-blue-700 mb-1">{video.snippet.title}</div>
                      <div className="text-slate-500 text-sm">{video.snippet.channelTitle}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {content.websites && content.websites.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100 mb-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-4">Recommended Websites</h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                {content.websites.map((url, idx) => (
                  <li key={idx}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline break-all">{url}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SubtopicDetail; 