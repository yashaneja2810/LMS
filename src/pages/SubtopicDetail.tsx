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

// Helper function to safely get video thumbnail URL
function getVideoThumbnail(video: any): string {
  try {
    console.log('Video data structure:', video); // Debug log
    
    // Handle simplified structure (from StudyMaterial.tsx)
    if (video?.thumbnail) {
      return video.thumbnail;
    }
    
    // Handle original YouTube API structure
    if (video?.snippet?.thumbnails?.medium?.url) {
      return video.snippet.thumbnails.medium.url;
    }
    if (video?.snippet?.thumbnails?.default?.url) {
      return video.snippet.thumbnails.default.url;
    }
    if (video?.snippet?.thumbnails?.high?.url) {
      return video.snippet.thumbnails.high.url;
    }
    
    // Fallback to a simple SVG placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjc3NDhCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIFRodW1ibmFpbDwvdGV4dD4KPC9zdmc+';
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjc3NDhCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIFRodW1ibmFpbDwvdGV4dD4KPC9zdmc+';
  }
}

// Helper function to safely get video title
function getVideoTitle(video: any): string {
  try {
    // Handle simplified structure
    if (video?.title) {
      return video.title;
    }
    
    // Handle original YouTube API structure
    return video?.snippet?.title || 'Untitled Video';
  } catch (error) {
    return 'Untitled Video';
  }
}

// Helper function to safely get video channel title
function getVideoChannelTitle(video: any): string {
  try {
    // Handle simplified structure
    if (video?.channelTitle) {
      return video.channelTitle;
    }
    
    // Handle original YouTube API structure
    return video?.snippet?.channelTitle || 'Unknown Channel';
  } catch (error) {
    return 'Unknown Channel';
  }
}

// Helper function to safely get video ID
function getVideoId(video: any): string {
  try {
    // Handle simplified structure
    if (video?.id) {
      return video.id;
    }
    
    // Handle original YouTube API structure
    return video?.id?.videoId || video?.id || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

export function SubtopicDetail() {
  const { topic = '', subtopic = '' } = useParams();
  const { subtopicContent } = useStudyMaterial();
  const decodedSubtopic = decodeURIComponent(subtopic);
  const content = subtopicContent[decodedSubtopic];

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <Link to={`/study`} className="text-black hover:text-gray-600 underline mb-4 inline-block">&larr; Back to Study Material</Link>
      <h1 className="text-3xl font-extrabold text-black mb-6 text-center">{decodedSubtopic.replace(/%20/g, ' ')}</h1>
      {!content && (
        <div className="text-red-500 text-center font-semibold bg-red-50 border border-red-200 rounded-xl p-6 shadow">No data found for this subtopic. Please go back and generate the topic again.</div>
      )}
      {content && (
        <>
          {content.documentation && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">Documentation</h2>
              <div className="space-y-6">
                {parseGeminiContent(content.documentation).map((block, idx) =>
                  block.type === 'code' && block.content.trim() ? (
                    <div key={idx} className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <MonacoEditor
                        height="300px"
                        defaultLanguage={block.language}
                        value={block.content}
                        theme="vs-dark"
                        options={{ readOnly: true, fontSize: 15, minimap: { enabled: false } }}
                      />
                    </div>
                  ) : block.type === 'text' && block.content.trim() ? (
                    <ul key={idx} className="list-disc pl-6 space-y-2 text-gray-800 text-base leading-relaxed">
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
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">Related YouTube Videos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.videos.map((video: any, index: number) => {
                  const videoId = getVideoId(video);
                  const thumbnailUrl = getVideoThumbnail(video);
                  const title = getVideoTitle(video);
                  const channelTitle = getVideoChannelTitle(video);
                  
                  return (
                    <a
                      key={videoId || index}
                      href={`https://www.youtube.com/watch?v=${videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                    >
                      <img 
                        src={thumbnailUrl} 
                        alt={title} 
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBDMTYwIDkwIDE2MCA5MCAxNjAgOTBaIiBmaWxsPSIjOUI5QkEwIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjc3NDhCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIFRodW1ibmFpbDwvdGV4dD4KPC9zdmc+';
                        }}
                      />
                      <div className="p-3">
                        <div className="font-semibold text-black mb-1 line-clamp-2">{title}</div>
                        <div className="text-gray-500 text-sm">{channelTitle}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          {content.websites && content.websites.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">Recommended Websites</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                {content.websites.map((url, idx) => (
                  <li key={idx}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-600 underline break-all">{url}</a>
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